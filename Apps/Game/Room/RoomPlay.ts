import { definitionIn, type Catalog } from '../../../Shared/Simulation/Definitions/Catalog.ts'
import type { Spot } from '../../../Shared/Simulation/Definitions/RoomDefinition.ts'
import { isEmpty } from '../../../Shared/Simulation/Physics/Liquid.ts'
import type { Command } from '../../../Shared/Simulation/Ritual/Command.ts'
import { caddyItemId, clothItemId, itemLocationIn, spoonItemId } from '../../../Shared/Simulation/Ritual/Reach.ts'
import type { RitualEvent } from '../../../Shared/Simulation/Ritual/RitualEvent.ts'
import type { DeepReadonly } from '../../../Shared/Simulation/State/DeepReadonly.ts'
import type { HandIndex, ItemLocation, SessionState } from '../../../Shared/Simulation/State/SessionState.ts'
import { AimedPour, type AimedPourView } from './AimedPour.ts'
import { whyThereIsNoRoomFor } from './Placement.ts'
import { screenRightOnTheFloor } from './Camera/CameraPoses.ts'
import { puddleShareOf } from '../Table/TablePresenter.ts'
import { carriedShapeOf, furniture, furnitureWithId, openingRadiusMetres, puddleCentre, puddleRadiusMetres, type FloorPoint, type FurnitureId, type WorldPoint } from './RoomLayout.ts'
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
  | { readonly kind: 'faucet' }
  | { readonly kind: 'hand'; readonly handIndex: HandIndex }
  | { readonly kind: 'lid'; readonly itemId: string }
  | { readonly kind: 'figurine'; readonly figurineId: string }
  | { readonly kind: 'nothing' }

type WipeStroke = {
  lengthMetres: number
  unwipedMetres: number
  unwipedMetresOverThePuddle: number
  metresOverThePuddle: number
  lastPoint: WorldPoint
  heldSecondsAtLastWipe: number
}

type Press = {
  readonly target: RoomTapTarget
  heldSeconds: number
  hasMovedAway: boolean
  readonly stroke: WipeStroke | null
}

const fullSpoonDepth = 1
const clothWipingWidthMetres = 0.2
const wipeEveryMetres = 0.02
const clothHalfWidthMetres = 0.1
const shareOfThePuddleTheClothSoaks = 0.15

export class RoomPlay {
  private readonly ritual: RitualPort
  private readonly catalog: Catalog
  private readonly log: RoomLog
  private readonly navigator: RoomNavigator
  private choice: HandIndex | null = null
  private press: Press | null = null
  private aimedPour: AimedPour | null = null

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

  get chosenHandIndex(): HandIndex | null {
    return this.choice
  }

  get sippableCupId(): string | null {
    const itemId = this.chosenItemId()
    const vessel = itemId === null ? undefined : this.ritual.state.vessels[itemId]
    if (vessel === undefined || isEmpty(vessel.liquid)) return null
    return definitionIn(this.catalog, 'vessels', vessel.definitionId).isDrinkable ? vessel.id : null
  }

  get aimedPourView(): AimedPourView | null {
    return this.aimedPour?.view ?? null
  }

  get clothOnTheTableAt(): WorldPoint | null {
    const press = this.press
    return press !== null && press.hasMovedAway ? (press.stroke?.lastPoint ?? null) : null
  }

  pressStarted(target: RoomTapTarget): void {
    if (this.aimedPour !== null) return this.log(`press on ${describeTarget(target)} ignored while aiming a pour`)
    this.press = { target, heldSeconds: 0, hasMovedAway: false, stroke: this.wipeStrokeStartingAt(target) }
  }

  pressMovedOver(target: RoomTapTarget): void {
    const press = this.press
    const stroke = press?.stroke
    if (press === null || stroke === undefined || stroke === null || !this.isOnTheRitualSurface(target) || target.kind !== 'surface') return
    const segmentMetres = Math.hypot(target.point.x - stroke.lastPoint.x, target.point.z - stroke.lastPoint.z)
    const middle = { x: (target.point.x + stroke.lastPoint.x) / 2, z: (target.point.z + stroke.lastPoint.z) / 2 }
    stroke.lengthMetres += segmentMetres
    stroke.unwipedMetres += segmentMetres
    if (this.isTheClothOverThePuddleAt(middle)) {
      stroke.unwipedMetresOverThePuddle += segmentMetres
      stroke.metresOverThePuddle += segmentMetres
    }
    stroke.lastPoint = target.point
    if (stroke.unwipedMetres >= wipeEveryMetres) this.wipeWhatTheStrokeCovered(stroke, press.heldSeconds)
  }

  pressMovedAway(): void {
    if (this.press === null || this.press.hasMovedAway) return
    this.press.hasMovedAway = true
    if (this.press.stroke === null) this.log(`press on ${describeTarget(this.press.target)} moved away, not a tap`)
  }

  pressEnded(): void {
    const press = this.press
    this.press = null
    if (press === null) return
    if (press.stroke !== null && press.hasMovedAway) return this.finishTheStroke(press.stroke, press.heldSeconds)
    if (!press.hasMovedAway) this.tapped(press.target)
  }

  pourFingerDown(point: FloorPoint): void {
    this.aimedPour?.fingerDown(point)
  }

  pourFingerMoved(point: FloorPoint): void {
    this.aimedPour?.fingerMoved(point)
  }

  pourFingerUp(): void {
    this.aimedPour?.fingerUp()
  }

  tiltPressed(): void {
    this.aimedPour?.tiltPressed()
  }

  tiltReleased(): void {
    this.aimedPour?.tiltReleased()
  }

  pourDone(): void {
    this.aimedPour?.finish()
    this.aimedPour = null
  }

  aimingTapped(target: RoomTapTarget): void {
    this.pourDone()
    if (target.kind !== 'surface') return this.log(`tap on ${describeTarget(target)} while aiming returns the vessel to its hand`)
    this.log(`tap on the ${target.furnitureId} while aiming puts the vessel down there`)
    this.putDownTheChosenItemAt(target.furnitureId, target.point)
  }

  sipTapped(): void {
    const cupId = this.sippableCupId
    if (cupId === null) return this.log('sip ignored: the chosen hand holds no tea bowl')
    this.ritual.dispatch({ type: 'tasteCup', cupId })
  }

  advance(seconds: number): void {
    this.navigator.advance(seconds)
    this.aimedPour?.advance(seconds)
    if (this.press !== null) this.press.heldSeconds += seconds
  }

  private tapped(target: RoomTapTarget): void {
    if (target.kind === 'hand') return this.toggleHand(target.handIndex)
    if (target.kind === 'lid' && itemLocationIn(this.ritual.state, target.itemId)?.kind === 'inHand') return this.toggleLidOf(target.itemId)
    const closeUpFurnitureId = this.view.kind === 'closeUp' ? this.view.furnitureId : null
    const targetFurnitureId = this.furnitureOf(target)
    if (closeUpFurnitureId === null || targetFurnitureId !== closeUpFurnitureId) return this.navigate(target, targetFurnitureId)
    this.actAtCloseUp(target)
  }

  private navigate(target: RoomTapTarget, targetFurnitureId: FurnitureId | null): void {
    if (targetFurnitureId !== null) this.navigator.tapped({ kind: 'furniture', furnitureId: targetFurnitureId })
    else if (target.kind === 'floor') this.navigator.tapped(target)
    else this.navigator.tapped({ kind: 'nothing' })
    this.letGoOfTheChoiceOutsideACloseUp()
  }

  private letGoOfTheChoiceOutsideACloseUp(): void {
    if (this.view.kind === 'closeUp' || this.choice === null) return
    this.log(`hand ${this.choice} let go of the choice: the keeper left the close-up`)
    this.choice = null
  }

  private actAtCloseUp(target: RoomTapTarget): void {
    switch (target.kind) {
      case 'item':
        return this.touchItem(target.itemId)
      case 'lid':
        return this.toggleLidOf(target.itemId)
      case 'figurine':
        return this.offerTheChosenCupTo(target.figurineId)
      case 'surface':
        return this.putDownTheChosenItemAt(target.furnitureId, target.point)
      case 'heater':
        return this.putTheChosenVesselOnTheHeater()
      case 'heaterSwitch':
        this.ritual.dispatch({ type: this.ritual.state.heater.isOn ? 'switchHeaterOff' : 'switchHeaterOn' })
        return
      case 'faucet':
        return this.turnTheTap()
      default:
        return this.log(`tap on ${describeTarget(target)} in the close-up does nothing`)
    }
  }

  private keeperMovedTo(furnitureId: FurnitureId | null): void {
    if (this.aimedPour !== null) this.pourDone()
    this.ritual.dispatch({ type: 'standAt', placeId: furnitureId })
  }

  private touchItem(itemId: string): void {
    if (this.chosenItemId() === spoonItemId) return this.useTheSpoonOn(itemId)
    if (this.canAimAPourAt(itemId)) return this.startAimingAt(itemId)
    this.pickUpAndChoose(itemId)
  }

  private pickUpAndChoose(itemId: string): void {
    const events = this.ritual.dispatch({ type: 'pickUp', itemId })
    const pickedUp = events.find((event) => event.type === 'pickedUp')
    if (pickedUp === undefined) return
    this.choice = pickedUp.handIndex
    this.log(`chose ${itemId} in hand ${pickedUp.handIndex} as it was picked up`)
  }

  private canAimAPourAt(targetId: string): boolean {
    const sourceId = this.chosenItemId()
    const target = this.ritual.state.vessels[targetId]
    const source = sourceId === null ? undefined : this.ritual.state.vessels[sourceId]
    const hasSomethingToPour = source !== undefined && !isEmpty(source.liquid)
    return hasSomethingToPour && sourceId !== targetId && target?.location.kind === 'onSurface'
  }

  private startAimingAt(targetId: string): void {
    const sourceId = this.chosenItemId()
    const target = this.ritual.state.vessels[targetId]
    const targetShape = carriedShapeOf(this.ritual.state, targetId)
    const closeUpFurnitureId = this.view.kind === 'closeUp' ? this.view.furnitureId : null
    if (sourceId === null || target?.location.kind !== 'onSurface' || targetShape === undefined || closeUpFurnitureId === null) return this.log(`no pour to aim at ${targetId}`)
    const spoutDirection = screenRightOnTheFloor(furnitureWithId(closeUpFurnitureId).closeUp)
    this.aimedPour = new AimedPour(this.ritual, this.log, sourceId, targetId, target.location.spot, openingRadiusMetres[targetShape], spoutDirection)
  }

  private turnTheTap(): void {
    if (this.ritual.state.filling !== null) {
      this.ritual.dispatch({ type: 'stopFillingFromTap' })
      return
    }
    const vesselId = this.chosenItemId()
    const vessel = vesselId === null ? undefined : this.ritual.state.vessels[vesselId]
    if (vessel === undefined) return this.log('tap on the tap ignored: no hand with a vessel is chosen')
    this.ritual.dispatch({ type: 'startFillingFromTap', vesselId: vessel.id })
  }

  private useTheSpoonOn(itemId: string): void {
    if (itemId === caddyItemId) {
      this.ritual.dispatch({ type: 'scoopTea', depth: fullSpoonDepth })
      return
    }
    const isSomethingToTip = this.ritual.state.spoon.grams > 0 && this.ritual.state.vessels[itemId] !== undefined
    if (!isSomethingToTip) return this.pickUpAndChoose(itemId)
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
    const cupId = this.chosenItemId()
    if (cupId === null) return this.log(`tap on ${figurineId} ignored: no hand is chosen`)
    this.letGoOfTheChoiceUnlessRefused(this.ritual.dispatch({ type: 'offerCup', cupId, figurineId }))
  }

  private wipeWhatTheStrokeCovered(stroke: WipeStroke, heldSeconds: number): void {
    const seconds = Math.max(heldSeconds - stroke.heldSecondsAtLastWipe, Number.EPSILON)
    const strokeSpeedCmPerSecond = (stroke.unwipedMetres * 100) / seconds
    const puddleArea = Math.PI * this.puddleRadius() ** 2
    const overThePuddle = stroke.unwipedMetresOverThePuddle
    stroke.unwipedMetres = 0
    stroke.unwipedMetresOverThePuddle = 0
    stroke.heldSecondsAtLastWipe = heldSeconds
    if (overThePuddle === 0 || puddleArea === 0) return
    const coveredFraction = Math.min(1, (overThePuddle * clothWipingWidthMetres) / puddleArea)
    this.ritual.dispatch({ type: 'wipeTable', strokeSpeedCmPerSecond, coveredFraction })
  }

  private isTheClothOverThePuddleAt(point: FloorPoint): boolean {
    return Math.hypot(point.x - puddleCentre.x, point.z - puddleCentre.z) < this.puddleRadius() + clothHalfWidthMetres
  }

  private puddleRadius(): number {
    return puddleRadiusMetres(puddleShareOf(this.ritual.state.tableWetMl))
  }

  private finishTheStroke(stroke: WipeStroke, heldSeconds: number): void {
    if (stroke.unwipedMetres > 0) this.wipeWhatTheStrokeCovered(stroke, heldSeconds)
    this.log(`stroke with the cloth ended: ${stroke.lengthMetres.toFixed(2)} m in ${heldSeconds.toFixed(1)} s, ${stroke.metresOverThePuddle.toFixed(2)} m of it over the puddle, the table is ${this.ritual.state.tableWetMl.toFixed(1)} ml wet`)
  }

  private wipeStrokeStartingAt(target: RoomTapTarget): WipeStroke | null {
    if (this.chosenItemId() !== clothItemId || target.kind !== 'surface' || !this.isOnTheRitualSurface(target)) return null
    return { lengthMetres: 0, unwipedMetres: 0, unwipedMetresOverThePuddle: 0, metresOverThePuddle: 0, lastPoint: target.point, heldSecondsAtLastWipe: 0 }
  }

  private isOnTheRitualSurface(target: RoomTapTarget): boolean {
    return target.kind === 'surface' && target.furnitureId === this.ritualFurnitureId()
  }

  private toggleHand(handIndex: HandIndex): void {
    if (this.view.kind !== 'closeUp') return this.log(`tap on hand ${handIndex} ignored: a hand is chosen only in a close-up`)
    const itemId = this.ritual.state.keeper.hands[handIndex]
    const isAlreadyChosen = this.chosenHandIndex === handIndex
    this.choice = itemId === null || isAlreadyChosen ? null : handIndex
    this.log(this.choice === null ? `hand ${handIndex} let go of the choice` : `chose ${itemId} in hand ${handIndex}`)
  }

  private putDownTheChosenItemAt(furnitureId: FurnitureId, point: WorldPoint): void {
    const itemId = this.chosenItemId()
    if (itemId === null) return this.log(`tap on the ${furnitureId} ignored: no hand is chosen`)
    const spot: Spot = { placeId: furnitureId, x: point.x, y: point.y, z: point.z }
    const refusal = whyThereIsNoRoomFor(itemId, spot, this.ritual.state, this.heaterSpot())
    if (refusal !== null) return this.log(`no room for ${itemId} at (${point.x.toFixed(2)}, ${point.z.toFixed(2)}) on the ${furnitureId}: ${refusal}`)
    if (itemId === clothItemId) this.soakUpThePuddleIfTheClothLandsInIt(furnitureId, point)
    this.letGoOfTheChoiceUnlessRefused(this.ritual.dispatch({ type: 'putDown', itemId, spot }))
  }

  private soakUpThePuddleIfTheClothLandsInIt(furnitureId: FurnitureId, point: WorldPoint): void {
    const puddleRadius = this.puddleRadius()
    const distanceToThePuddle = Math.hypot(point.x - puddleCentre.x, point.z - puddleCentre.z)
    const isInThePuddle = furnitureId === this.ritualFurnitureId() && puddleRadius > 0 && distanceToThePuddle < puddleRadius + clothHalfWidthMetres
    if (!isInThePuddle) return this.log(`the cloth goes down ${distanceToThePuddle.toFixed(2)} m from a puddle ${puddleRadius.toFixed(2)} m wide on the ${furnitureId}, nothing to soak up`)
    this.log(`the cloth goes down in the puddle and soaks some of it up`)
    this.ritual.dispatch({ type: 'wipeTable', strokeSpeedCmPerSecond: 0, coveredFraction: shareOfThePuddleTheClothSoaks })
  }

  private letGoOfTheChoiceUnlessRefused(events: readonly RitualEvent[]): void {
    if (events.some((event) => event.type === 'actionRefused')) return this.log(`hand ${this.chosenHandIndex} stays chosen after the refusal`)
    this.choice = null
  }

  private putTheChosenVesselOnTheHeater(): void {
    const itemId = this.chosenItemId()
    if (itemId === null) return this.log('tap on the heater ignored: no hand is chosen')
    this.letGoOfTheChoiceUnlessRefused(this.ritual.dispatch({ type: 'placeOnHeater', vesselId: itemId }))
  }

  private chosenItemId(): string | null {
    const handIndex = this.chosenHandIndex
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
      case 'faucet':
        return furnitureWithPlace(definitionIn(this.catalog, 'rooms', this.ritual.state.roomId).tap?.placeId ?? null)
      case 'item':
      case 'lid':
        return furnitureWithPlace(placeOf(this.locationOfItem(target.itemId)))
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
    return itemLocationIn(this.ritual.state, itemId)
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
