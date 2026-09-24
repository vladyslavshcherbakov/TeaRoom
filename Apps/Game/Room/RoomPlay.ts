import { definitionIn, type Catalog } from '../../../Shared/Simulation/Definitions/Catalog.ts'
import type { Spot } from '../../../Shared/Simulation/Definitions/RoomDefinition.ts'
import type { Command } from '../../../Shared/Simulation/Ritual/Command.ts'
import { caddyItemId } from '../../../Shared/Simulation/Ritual/Reach.ts'
import type { RitualEvent } from '../../../Shared/Simulation/Ritual/RitualEvent.ts'
import type { DeepReadonly } from '../../../Shared/Simulation/State/DeepReadonly.ts'
import type { HandIndex, ItemLocation, SessionState } from '../../../Shared/Simulation/State/SessionState.ts'
import { whyThereIsNoRoomFor } from './Placement.ts'
import { furniture, type FloorPoint, type FurnitureId, type WorldPoint } from './RoomLayout.ts'
import { RoomNavigator, type RoomLog, type RoomView } from './RoomNavigator.ts'
import type { Walk } from './Walking/Walk.ts'

export type RitualPort = {
  readonly state: DeepReadonly<SessionState>
  dispatch(command: Command): readonly RitualEvent[]
}

export type RoomTapTarget =
  | { readonly kind: 'floor'; readonly point: FloorPoint }
  | { readonly kind: 'furniture'; readonly furnitureId: FurnitureId }
  | { readonly kind: 'surface'; readonly furnitureId: FurnitureId; readonly point: WorldPoint }
  | { readonly kind: 'item'; readonly itemId: string }
  | { readonly kind: 'heater' }
  | { readonly kind: 'heaterSwitch' }
  | { readonly kind: 'hand'; readonly handIndex: HandIndex }
  | { readonly kind: 'lid'; readonly itemId: string }
  | { readonly kind: 'tool'; readonly tool: RitualTool }
  | { readonly kind: 'figurine'; readonly figurineId: string }
  | { readonly kind: 'nothing' }

export type RitualTool = 'spoon' | 'cloth'

type Choice = { readonly kind: 'hand'; readonly handIndex: HandIndex } | { readonly kind: 'tool'; readonly tool: RitualTool }

type WipeStroke = {
  lengthMetres: number
  lastPoint: WorldPoint
}

type Pour = {
  readonly sourceId: string
  readonly targetId: string
  readonly tiltDegrees: number
}

type Hold =
  | { readonly kind: 'notHeldYet' }
  | { readonly kind: 'nothingToPour' }
  | { readonly kind: 'pourRefused' }
  | { readonly kind: 'pouring'; readonly pour: Pour }
  | { readonly kind: 'pourEnded' }

type Press = {
  readonly target: RoomTapTarget
  heldSeconds: number
  hasMovedAway: boolean
  hold: Hold
  readonly stroke: WipeStroke | null
}

const holdBeforePouringSeconds = 0.3
const firstTiltDegrees = 14
const tiltGrowthDegreesPerSecond = 20
const steepestTiltDegrees = 36
const fullSpoonDepth = 1
const strokeCoveringTheWholeTableMetres = 1.5
const shortestWipeMetres = 0.05

export class RoomPlay {
  private readonly ritual: RitualPort
  private readonly catalog: Catalog
  private readonly log: RoomLog
  private readonly navigator: RoomNavigator
  private choice: Choice | null = null
  private press: Press | null = null

  constructor(ritual: RitualPort, catalog: Catalog, log: RoomLog) {
    this.ritual = ritual
    this.catalog = catalog
    this.log = log
    this.navigator = new RoomNavigator(log, (furnitureId) => this.keeperMovedTo(furnitureId))
  }

  get walk(): Walk {
    return this.navigator.walk
  }

  get view(): RoomView {
    return this.navigator.view
  }

  get selectedHandIndex(): HandIndex | null {
    return this.choice?.kind === 'hand' ? this.choice.handIndex : null
  }

  get chosenTool(): RitualTool | null {
    return this.choice?.kind === 'tool' ? this.choice.tool : null
  }

  get sippableCupId(): string | null {
    const itemId = this.selectedItemId()
    const vessel = itemId === null ? undefined : this.ritual.state.vessels[itemId]
    if (vessel === undefined || vessel.liquid.volumeMl <= 0) return null
    return definitionIn(this.catalog, 'vessels', vessel.definitionId).isDrinkable ? vessel.id : null
  }

  pressStarted(target: RoomTapTarget): void {
    this.press = { target, heldSeconds: 0, hasMovedAway: false, hold: { kind: 'notHeldYet' }, stroke: this.wipeStrokeStartingAt(target) }
  }

  pressMovedOver(target: RoomTapTarget): void {
    const stroke = this.press?.stroke
    if (stroke === undefined || stroke === null || !this.isOnTheRitualSurface(target) || target.kind !== 'surface') return
    stroke.lengthMetres += Math.hypot(target.point.x - stroke.lastPoint.x, target.point.z - stroke.lastPoint.z)
    stroke.lastPoint = target.point
  }

  pressMovedAway(): void {
    if (this.press === null || this.press.hasMovedAway) return
    this.press.hasMovedAway = true
    if (this.press.hold.kind !== 'pouring' && this.press.stroke === null) this.log(`press on ${describeTarget(this.press.target)} moved away, not a tap`)
  }

  pressEnded(): void {
    const press = this.press
    this.press = null
    if (press === null) return
    if (press.stroke !== null && press.hasMovedAway) return this.wipeWith(press.stroke, press.heldSeconds)
    switch (press.hold.kind) {
      case 'pouring':
        this.ritual.dispatch({ type: 'stopPouring' })
        return
      case 'pourRefused':
      case 'pourEnded':
        return this.log(`press on ${describeTarget(press.target)} released after a pour attempt, not a tap`)
      case 'notHeldYet':
      case 'nothingToPour':
        if (!press.hasMovedAway) this.tapped(press.target)
    }
  }

  handTapped(handIndex: HandIndex): void {
    this.toggleHand(handIndex)
  }

  sipTapped(): void {
    const cupId = this.sippableCupId
    if (cupId === null) return this.log('sip ignored: the chosen hand holds no tea bowl')
    this.ritual.dispatch({ type: 'tasteCup', cupId })
  }

  advance(seconds: number): void {
    this.navigator.advance(seconds)
    const press = this.press
    if (press === null) return
    press.heldSeconds += seconds
    if (press.stroke !== null) return
    if (press.hold.kind === 'pouring') return this.keepPouring(press, press.hold.pour, seconds)
    if (press.hold.kind === 'notHeldYet' && !press.hasMovedAway && press.heldSeconds >= holdBeforePouringSeconds) press.hold = this.startPouringInto(press.target)
  }

  private tapped(target: RoomTapTarget): void {
    if (target.kind === 'hand') return this.handTapped(target.handIndex)
    const closeUpFurnitureId = this.view.kind === 'closeUp' ? this.view.furnitureId : null
    const targetFurnitureId = this.furnitureOf(target)
    if (closeUpFurnitureId === null || targetFurnitureId !== closeUpFurnitureId) return this.navigate(target, targetFurnitureId)
    this.actAtCloseUp(target)
  }

  private navigate(target: RoomTapTarget, targetFurnitureId: FurnitureId | null): void {
    if (targetFurnitureId !== null) return this.navigator.tapped({ kind: 'furniture', furnitureId: targetFurnitureId })
    if (target.kind === 'floor') return this.navigator.tapped(target)
    this.navigator.tapped({ kind: 'nothing' })
  }

  private actAtCloseUp(target: RoomTapTarget): void {
    switch (target.kind) {
      case 'item':
        return this.touchItem(target.itemId)
      case 'lid':
        return this.toggleLidOf(target.itemId)
      case 'tool':
        return this.toggleTool(target.tool)
      case 'figurine':
        return this.offerTheChosenCupTo(target.figurineId)
      case 'surface':
        if (this.chosenTool === 'cloth') return this.log(`tap on the ${target.furnitureId} with the cloth ignored: the cloth wipes with a stroke`)
        return this.putDownSelectedItemAt(target.furnitureId, target.point)
      case 'heater':
        return this.putSelectedVesselOnTheHeater()
      case 'heaterSwitch':
        this.ritual.dispatch({ type: this.ritual.state.heater.isOn ? 'switchHeaterOff' : 'switchHeaterOn' })
        return
      default:
        return this.log(`tap on ${describeTarget(target)} in the close-up does nothing`)
    }
  }

  private keeperMovedTo(furnitureId: FurnitureId | null): void {
    this.ritual.dispatch({ type: 'standAt', placeId: furnitureId })
    const tool = this.chosenTool
    if (tool === null || furnitureId === this.ritualFurnitureId()) return
    this.choice = null
    this.log(`left the ${tool} at the ${this.ritualFurnitureId()}`)
  }

  private touchItem(itemId: string): void {
    switch (this.chosenTool) {
      case 'spoon':
        return this.useTheSpoonOn(itemId)
      case 'cloth':
        return this.log(`tap on ${itemId} with the cloth ignored: the cloth wipes the table`)
      case null:
        this.ritual.dispatch({ type: 'pickUp', itemId })
    }
  }

  private useTheSpoonOn(itemId: string): void {
    if (itemId === caddyItemId) {
      this.ritual.dispatch({ type: 'scoopTea', depth: fullSpoonDepth })
      return
    }
    this.ritual.dispatch({ type: 'tipSpoonInto', vesselId: itemId })
  }

  private toggleLidOf(itemId: string): void {
    const { caddy, vessels } = this.ritual.state
    if (itemId === caddyItemId) {
      this.ritual.dispatch({ type: caddy.isOpen ? 'closeCaddy' : 'openCaddy' })
      return
    }
    const vesselId = itemId
    this.ritual.dispatch({ type: vessels[vesselId]?.isLidOpen === true ? 'closeVesselLid' : 'openVesselLid', vesselId })
  }

  private offerTheChosenCupTo(figurineId: string): void {
    const cupId = this.selectedItemId()
    if (cupId === null) return this.log(`tap on ${figurineId} ignored: no hand is chosen`)
    this.letGoOfTheChoiceUnlessRefused(this.ritual.dispatch({ type: 'offerCup', cupId, figurineId }))
  }

  private wipeWith(stroke: WipeStroke, seconds: number): void {
    if (stroke.lengthMetres < shortestWipeMetres) return this.log(`wipe ignored: the stroke was only ${stroke.lengthMetres.toFixed(2)} m`)
    const strokeSpeedCmPerSecond = (stroke.lengthMetres * 100) / Math.max(seconds, Number.EPSILON)
    const coveredFraction = Math.min(1, stroke.lengthMetres / strokeCoveringTheWholeTableMetres)
    this.ritual.dispatch({ type: 'wipeTable', strokeSpeedCmPerSecond, coveredFraction })
  }

  private wipeStrokeStartingAt(target: RoomTapTarget): WipeStroke | null {
    if (this.chosenTool !== 'cloth' || target.kind !== 'surface' || !this.isOnTheRitualSurface(target)) return null
    return { lengthMetres: 0, lastPoint: target.point }
  }

  private isOnTheRitualSurface(target: RoomTapTarget): boolean {
    return target.kind === 'surface' && target.furnitureId === this.ritualFurnitureId()
  }

  private toggleHand(handIndex: HandIndex): void {
    const itemId = this.ritual.state.keeper.hands[handIndex]
    const isAlreadyChosen = this.selectedHandIndex === handIndex
    this.choice = itemId === null || isAlreadyChosen ? null : { kind: 'hand', handIndex }
    this.log(this.choice === null ? `hand ${handIndex} let go of the choice` : `chose ${itemId} in hand ${handIndex}`)
  }

  private toggleTool(tool: RitualTool): void {
    this.choice = this.chosenTool === tool ? null : { kind: 'tool', tool }
    this.log(this.choice === null ? `put the ${tool} back` : `took the ${tool}`)
  }

  private putDownSelectedItemAt(furnitureId: FurnitureId, point: WorldPoint): void {
    const itemId = this.selectedItemId()
    if (itemId === null) return this.log(`tap on the ${furnitureId} ignored: no hand is chosen`)
    const spot: Spot = { placeId: furnitureId, x: point.x, y: point.y, z: point.z }
    const refusal = whyThereIsNoRoomFor(itemId, spot, this.ritual.state, this.heaterSpot())
    if (refusal !== null) return this.log(`no room for ${itemId} at (${point.x.toFixed(2)}, ${point.z.toFixed(2)}) on the ${furnitureId}: ${refusal}`)
    this.letGoOfTheChoiceUnlessRefused(this.ritual.dispatch({ type: 'putDown', itemId, spot }))
  }

  private letGoOfTheChoiceUnlessRefused(events: readonly RitualEvent[]): void {
    if (events.some((event) => event.type === 'actionRefused')) return this.log(`hand ${this.selectedHandIndex} stays chosen after the refusal`)
    this.choice = null
  }

  private putSelectedVesselOnTheHeater(): void {
    const itemId = this.selectedItemId()
    if (itemId === null) return this.log('tap on the heater ignored: no hand is chosen')
    this.letGoOfTheChoiceUnlessRefused(this.ritual.dispatch({ type: 'placeOnHeater', vesselId: itemId }))
  }

  private startPouringInto(target: RoomTapTarget): Hold {
    if (target.kind !== 'item' || this.view.kind !== 'closeUp') {
      this.log(`held on ${describeTarget(target)} with nothing to pour into here, it counts as a tap`)
      return { kind: 'nothingToPour' }
    }
    const sourceId = this.pouringVesselId(target.itemId)
    if (sourceId === null) {
      this.log(`held on ${target.itemId} with no vessel chosen to pour from, it counts as a tap`)
      return { kind: 'nothingToPour' }
    }
    const events = this.ritual.dispatch({ type: 'startPouring', sourceId, targetId: target.itemId })
    if (events.some((event) => event.type === 'actionRefused')) return { kind: 'pourRefused' }
    const pour = { sourceId, targetId: target.itemId, tiltDegrees: firstTiltDegrees }
    this.ritual.dispatch({ type: 'adjustPour', tiltDegrees: pour.tiltDegrees, streamOnTargetFraction: 1 })
    return { kind: 'pouring', pour }
  }

  private keepPouring(press: Press, pour: Pour, seconds: number): void {
    if (this.ritual.state.pour === null) {
      this.log(`the pour from ${pour.sourceId} into ${pour.targetId} ended while the finger was still down`)
      press.hold = { kind: 'pourEnded' }
      return
    }
    const tiltDegrees = Math.min(steepestTiltDegrees, pour.tiltDegrees + tiltGrowthDegreesPerSecond * seconds)
    if (tiltDegrees === pour.tiltDegrees) return
    this.ritual.dispatch({ type: 'adjustPour', tiltDegrees, streamOnTargetFraction: 1 })
    press.hold = { kind: 'pouring', pour: { ...pour, tiltDegrees } }
  }

  private pouringVesselId(targetId: string): string | null {
    const chosenItemId = this.selectedItemId()
    if (chosenItemId !== null && chosenItemId !== targetId && this.ritual.state.vessels[chosenItemId] !== undefined) return chosenItemId
    const vesselsInHand = this.ritual.state.keeper.hands.filter(
      (itemId): itemId is string => itemId !== null && itemId !== targetId && this.ritual.state.vessels[itemId] !== undefined,
    )
    return vesselsInHand.length === 1 ? (vesselsInHand[0] ?? null) : null
  }

  private selectedItemId(): string | null {
    const handIndex = this.selectedHandIndex
    return handIndex === null ? null : this.ritual.state.keeper.hands[handIndex] ?? null
  }

  private furnitureOf(target: RoomTapTarget): FurnitureId | null {
    switch (target.kind) {
      case 'furniture':
      case 'surface':
        return target.furnitureId
      case 'heater':
      case 'heaterSwitch':
        return furnitureWithPlace(this.heaterSpot().placeId)
      case 'item':
      case 'lid':
        return furnitureWithPlace(placeOf(this.locationOfItem(target.itemId)))
      case 'tool':
      case 'figurine':
        return this.ritualFurnitureId()
      default:
        return null
    }
  }

  private ritualFurnitureId(): FurnitureId | null {
    return furnitureWithPlace(definitionIn(this.catalog, 'rooms', this.ritual.state.roomId).ritualPlaceId)
  }

  private locationOfItem(itemId: string): DeepReadonly<ItemLocation> | undefined {
    return itemId === caddyItemId ? this.ritual.state.caddy.location : this.ritual.state.vessels[itemId]?.location
  }

  private heaterSpot(): Spot {
    return definitionIn(this.catalog, 'rooms', this.ritual.state.roomId).heaterSpot
  }
}

function describeTarget(target: RoomTapTarget): string {
  switch (target.kind) {
    case 'item':
      return target.itemId
    case 'lid':
      return `the lid of ${target.itemId}`
    case 'tool':
      return `the ${target.tool}`
    case 'figurine':
      return target.figurineId
    case 'hand':
      return `hand ${target.handIndex}`
    case 'furniture':
    case 'surface':
      return `the ${target.furnitureId}`
    default:
      return `the ${target.kind}`
  }
}

function placeOf(location: DeepReadonly<ItemLocation> | undefined): string | null {
  return location?.kind === 'onSurface' ? location.spot.placeId : null
}

function furnitureWithPlace(placeId: string | null): FurnitureId | null {
  return furniture.find((piece) => piece.id === placeId)?.id ?? null
}
