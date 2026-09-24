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
  | { readonly kind: 'nothing' }

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
}

const holdBeforePouringSeconds = 0.3
const firstTiltDegrees = 14
const tiltGrowthDegreesPerSecond = 20
const steepestTiltDegrees = 36

export class RoomPlay {
  private readonly ritual: RitualPort
  private readonly catalog: Catalog
  private readonly log: RoomLog
  private readonly navigator: RoomNavigator
  private selectedHand: HandIndex | null = null
  private press: Press | null = null

  constructor(ritual: RitualPort, catalog: Catalog, log: RoomLog) {
    this.ritual = ritual
    this.catalog = catalog
    this.log = log
    this.navigator = new RoomNavigator(log, (furnitureId) => this.ritual.dispatch({ type: 'standAt', placeId: furnitureId }))
  }

  get walk(): Walk {
    return this.navigator.walk
  }

  get view(): RoomView {
    return this.navigator.view
  }

  get selectedHandIndex(): HandIndex | null {
    return this.selectedHand
  }

  pressStarted(target: RoomTapTarget): void {
    this.press = { target, heldSeconds: 0, hasMovedAway: false, hold: { kind: 'notHeldYet' } }
  }

  pressMovedAway(): void {
    if (this.press === null || this.press.hasMovedAway) return
    this.press.hasMovedAway = true
    if (this.press.hold.kind !== 'pouring') this.log(`press on ${describeTarget(this.press.target)} moved away, not a tap`)
  }

  pressEnded(): void {
    const press = this.press
    this.press = null
    if (press === null) return
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

  advance(seconds: number): void {
    this.navigator.advance(seconds)
    const press = this.press
    if (press === null) return
    press.heldSeconds += seconds
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
        this.ritual.dispatch({ type: 'pickUp', itemId: target.itemId })
        return
      case 'surface':
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

  private toggleHand(handIndex: HandIndex): void {
    const itemId = this.ritual.state.keeper.hands[handIndex]
    this.selectedHand = itemId === null || this.selectedHand === handIndex ? null : handIndex
    this.log(this.selectedHand === null ? `hand ${handIndex} let go of the choice` : `chose ${itemId} in hand ${handIndex}`)
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
    if (events.some((event) => event.type === 'actionRefused')) return this.log(`hand ${this.selectedHand} stays chosen after the refusal`)
    this.selectedHand = null
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
    return this.selectedHand === null ? null : this.ritual.state.keeper.hands[this.selectedHand] ?? null
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
        return furnitureWithPlace(placeOf(this.locationOfItem(target.itemId)))
      default:
        return null
    }
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
