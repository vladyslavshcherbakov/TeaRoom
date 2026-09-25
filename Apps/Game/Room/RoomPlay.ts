import { definitionIn, type Catalog } from '../../../Shared/Simulation/Definitions/Catalog.ts'
import type { Spot } from '../../../Shared/Simulation/Definitions/RoomDefinition.ts'
import type { TasteVerdict } from '../../../Shared/Simulation/Judgement/TasteJudgement.ts'
import { isEmpty } from '../../../Shared/Simulation/Physics/Liquid.ts'
import type { Command } from '../../../Shared/Simulation/Ritual/Command.ts'
import { caddyItemId, clothItemId, itemLocationIn, spoonItemId } from '../../../Shared/Simulation/Ritual/Reach.ts'
import type { RitualEvent } from '../../../Shared/Simulation/Ritual/RitualEvent.ts'
import type { DeepReadonly } from '../../../Shared/Simulation/State/DeepReadonly.ts'
import type { HandIndex, ItemLocation, SessionState } from '../../../Shared/Simulation/State/SessionState.ts'
import { AimedPour, type AimedPourView, type PourTarget } from './AimedPour.ts'
import { whyThereIsNoRoomFor } from './Placement.ts'
import { screenRightOnTheFloor } from './Camera/CameraPoses.ts'
import { puddleShareOf } from '../Table/TablePresenter.ts'
import { carriedShapeOf, layoutOf, type CarriedShape } from './CarriedShapes.ts'
import { furniture, furnitureWithId, puddleCentreOn, puddleRadiusMetres, type FloorPoint, type FurnitureId, type WorldPoint } from './RoomLayout.ts'
import { RoomNavigator, type RoomLog, type RoomView } from './RoomNavigator.ts'
import type { Walk } from './Walking/Walk.ts'
import { wetMlAt } from '../../../Shared/Simulation/Ritual/Puddles.ts'

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
  | { readonly kind: 'roseBush' }
  | { readonly kind: 'nothing' }

type WipeStroke = {
  readonly furnitureId: FurnitureId
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
const roseBushTapsThatOpenTheDebugMenu = 10
const deadlyStrengthsFromTheCaddy: ReadonlySet<TasteVerdict['strength']> = new Set(['heavy', 'extreme'])
const remarkWhenKeptOffTheHeater: Partial<Record<CarriedShape, RoomRemarkKind>> = { bowl: 'bowlKeptOffTheHeater', caddy: 'caddyKeptOffTheHeater' }

export type RoomRemarkKind = 'sillIsTheRoomsOwn' | 'bowlKeptOffTheHeater' | 'caddyKeptOffTheHeater' | 'handsFull' | 'handsFullOfBowls' | 'heaterTester'

export type TeaTasted = Extract<RitualEvent, { readonly type: 'teaTasted' }>

export type RoomRemark = { readonly kind: RoomRemarkKind; readonly timesTapped: number }

export type RoomPlayListener = {
  readonly remarked: (remark: RoomRemark) => void
  readonly debugMenuAsked: () => void
  readonly keeperDied: (fatalSip: TeaTasted) => void
}

export class RoomPlay {
  private readonly ritual: RitualPort
  private readonly catalog: Catalog
  private readonly log: RoomLog
  private readonly listener: RoomPlayListener
  private readonly heaterItemsBeforeTheTesterJoke: number
  private readonly navigator: RoomNavigator
  private choice: HandIndex | null = null
  private press: Press | null = null
  private aimedPour: AimedPour | null = null
  private readonly timesRemarked = new Map<RoomRemarkKind, number>()
  private readonly itemsTriedOnTheHeater = new Set<string>()
  private roseBushTapsInARow = 0

  constructor(ritual: RitualPort, catalog: Catalog, log: RoomLog, heaterItemsBeforeTheTesterJoke: number, listener: RoomPlayListener) {
    this.ritual = ritual
    this.catalog = catalog
    this.log = log
    this.heaterItemsBeforeTheTesterJoke = heaterItemsBeforeTheTesterJoke
    this.listener = listener
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

  canTheChosenItemActOn(target: RoomTapTarget): boolean {
    const itemId = this.chosenItemId()
    if (itemId === null || this.view.kind !== 'closeUp') return false
    switch (target.kind) {
      case 'surface':
      case 'heater':
      case 'faucet':
      case 'figurine':
        return true
      case 'item':
        return itemId === spoonItemId || this.canAimAPourAt(target.itemId)
      default:
        return false
    }
  }

  pressStarted(target: RoomTapTarget): void {
    if (this.aimedPour !== null) return this.log(`press on ${describeTarget(target)} ignored while aiming a pour`)
    this.press = { target, heldSeconds: 0, hasMovedAway: false, stroke: this.wipeStrokeStartingAt(target) }
  }

  pressMovedOver(target: RoomTapTarget): void {
    const press = this.press
    const stroke = press?.stroke
    if (press === null || stroke === undefined || stroke === null || target.kind !== 'surface' || target.furnitureId !== stroke.furnitureId) return
    const segmentMetres = Math.hypot(target.point.x - stroke.lastPoint.x, target.point.z - stroke.lastPoint.z)
    const middle = { x: (target.point.x + stroke.lastPoint.x) / 2, z: (target.point.z + stroke.lastPoint.z) / 2 }
    stroke.lengthMetres += segmentMetres
    stroke.unwipedMetres += segmentMetres
    if (this.isTheClothOverThePuddleAt(stroke.furnitureId, middle)) {
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
    const sourceId = this.aimedPour?.view.sourceId
    if (target.kind === 'lid' && target.itemId === sourceId) {
      this.log(`tap on the lid of ${sourceId} while aiming opens or closes it and keeps the aim`)
      return this.toggleLidOf(sourceId)
    }
    this.pourDone()
    if (target.kind !== 'surface') return this.log(`tap on ${describeTarget(target)} while aiming returns the vessel to its hand`)
    this.log(`tap on the ${target.furnitureId} while aiming puts the vessel down there`)
    this.putDownTheChosenItemAt(target.furnitureId, target.point)
  }

  sipTapped(): void {
    const cupId = this.sippableCupId
    if (cupId === null) return this.log('sip ignored: the chosen hand holds no tea bowl')
    const events = this.ritual.dispatch({ type: 'tasteCup', cupId })
    const sip = events.find((event): event is TeaTasted => event.type === 'teaTasted')
    if (cupId !== caddyItemId || sip === undefined || !deadlyStrengthsFromTheCaddy.has(sip.verdict.strength)) return
    this.log(`the keeper sipped ${sip.verdict.strength} tea straight from the caddy, and it killed them`)
    this.listener.keeperDied(sip)
  }

  walkFreely(step: FloorPoint, headingRadians: number): void {
    if (this.aimedPour !== null) return
    this.navigator.walkFreely(step, headingRadians)
  }

  stopWalkingFreely(): void {
    this.navigator.stopWalkingFreely()
  }

  advance(seconds: number): void {
    this.navigator.advance(seconds)
    this.aimedPour?.advance(seconds)
    if (this.press !== null) this.press.heldSeconds += seconds
  }

  private tapped(target: RoomTapTarget): void {
    if (target.kind === 'roseBush') return this.countTheRoseBushTap()
    this.forgetTheRoseBushTaps()
    if (target.kind === 'hand') return this.toggleHand(target.handIndex)
    if (target.kind === 'lid' && itemLocationIn(this.ritual.state, target.itemId)?.kind === 'inHand') return this.toggleLidOf(target.itemId)
    const closeUpFurnitureId = this.view.kind === 'closeUp' ? this.view.furnitureId : null
    if (target.kind === 'figurine' && closeUpFurnitureId !== this.ritualFurnitureId()) return this.keepTheSillForTheRoom(target.figurineId)
    const targetFurnitureId = this.furnitureOf(target)
    if (closeUpFurnitureId === null || targetFurnitureId !== closeUpFurnitureId) return this.navigate(target, targetFurnitureId)
    this.actAtCloseUp(target)
  }

  private countTheRoseBushTap(): void {
    this.roseBushTapsInARow += 1
    this.log(`rose bush tapped ${this.roseBushTapsInARow} times in a row`)
    if (this.roseBushTapsInARow < roseBushTapsThatOpenTheDebugMenu) return
    this.roseBushTapsInARow = 0
    this.log('the debug menu opens after ten taps in a row on a rose bush')
    this.listener.debugMenuAsked()
  }

  private forgetTheRoseBushTaps(): void {
    if (this.roseBushTapsInARow === 0) return
    this.log(`another tap after ${this.roseBushTapsInARow} taps on a rose bush starts the count again`)
    this.roseBushTapsInARow = 0
  }

  private keepTheSillForTheRoom(figurineId: string): void {
    const timesTapped = this.remark('sillIsTheRoomsOwn')
    this.log(`tap on ${figurineId} from afar leaves the keeper in place: it stands on the sill, tapped from afar ${timesTapped} times`)
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
        return this.putTheChosenItemOnTheHeater()
      case 'heaterSwitch':
        this.ritual.dispatch({ type: this.ritual.state.heater.isOn ? 'switchHeaterOff' : 'switchHeaterOn' })
        return
      case 'faucet':
        return this.useTheSink()
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
    if (events.some((event) => event.type === 'actionRefused' && event.reason === 'handsFull')) return this.remarkOnFullHands(itemId)
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
    const targetLayout = layoutOf(this.ritual.state, targetId)
    const closeUpFurnitureId = this.view.kind === 'closeUp' ? this.view.furnitureId : null
    if (sourceId === null || target?.location.kind !== 'onSurface' || targetLayout === undefined || closeUpFurnitureId === null) return this.log(`no pour to aim at ${targetId}`)
    const spoutDirection = screenRightOnTheFloor(furnitureWithId(closeUpFurnitureId).closeUp)
    const pourTarget = { id: targetId, spot: target.location.spot, openingRadiusMetres: targetLayout.openingRadiusMetres }
    this.aimedPour = new AimedPour(this.ritual, this.log, sourceId, pourTarget, this.pourTargetsBeside(sourceId, target.location.spot.placeId), spoutDirection)
  }

  private pourTargetsBeside(sourceId: string, placeId: string): PourTarget[] {
    return Object.values(this.ritual.state.vessels).flatMap((vessel) => {
      const layout = layoutOf(this.ritual.state, vessel.id)
      const isStandingThere = vessel.location.kind === 'onSurface' && vessel.location.spot.placeId === placeId
      if (vessel.id === sourceId || layout === undefined || !isStandingThere || vessel.location.kind !== 'onSurface') return []
      return [{ id: vessel.id, spot: vessel.location.spot, openingRadiusMetres: layout.openingRadiusMetres }]
    })
  }

  private useTheSink(): void {
    const itemId = this.chosenItemId()
    const itemIdInTheSink = this.ritual.state.sink.itemIdInside
    if (itemId !== null && itemIdInTheSink === null) return this.letGoOfTheChoiceUnlessRefused(this.ritual.dispatch({ type: 'putInTheSink', itemId }))
    if (itemId !== null) this.log(`${itemId} stays in hand: ${itemIdInTheSink} is in the sink, so the tap is turned instead`)
    this.ritual.dispatch({ type: this.ritual.state.sink.runningWater === null ? 'turnTheTapOn' : 'turnTheTapOff' })
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
    const vesselId = itemId
    this.ritual.dispatch({ type: this.ritual.state.vessels[vesselId]?.isLidOpen === true ? 'closeVesselLid' : 'openVesselLid', vesselId })
  }

  private offerTheChosenCupTo(figurineId: string): void {
    const cupId = this.chosenItemId()
    if (cupId === null) return this.log(`tap on ${figurineId} ignored: no hand is chosen`)
    this.letGoOfTheChoiceUnlessRefused(this.ritual.dispatch({ type: 'offerCup', cupId, figurineId }))
  }

  private wipeWhatTheStrokeCovered(stroke: WipeStroke, heldSeconds: number): void {
    const seconds = Math.max(heldSeconds - stroke.heldSecondsAtLastWipe, Number.EPSILON)
    const strokeSpeedCmPerSecond = (stroke.unwipedMetres * 100) / seconds
    const puddleArea = Math.PI * (this.puddleOn(stroke.furnitureId)?.radiusMetres ?? 0) ** 2
    const overThePuddle = stroke.unwipedMetresOverThePuddle
    stroke.unwipedMetres = 0
    stroke.unwipedMetresOverThePuddle = 0
    stroke.heldSecondsAtLastWipe = heldSeconds
    if (overThePuddle === 0 || puddleArea === 0) return
    const coveredFraction = Math.min(1, (overThePuddle * clothWipingWidthMetres) / puddleArea)
    this.ritual.dispatch({ type: 'wipeTable', strokeSpeedCmPerSecond, coveredFraction })
  }

  private isTheClothOverThePuddleAt(furnitureId: FurnitureId, point: FloorPoint): boolean {
    const puddle = this.puddleOn(furnitureId)
    return puddle !== null && Math.hypot(point.x - puddle.centre.x, point.z - puddle.centre.z) < puddle.radiusMetres + clothHalfWidthMetres
  }

  private puddleOn(furnitureId: FurnitureId): { centre: WorldPoint; radiusMetres: number } | null {
    const puddle = this.ritual.state.puddles[furnitureId]
    const centre = puddle === undefined ? null : puddleCentreOn(furnitureId, puddle.spilledAround)
    if (puddle === undefined || centre === null) return null
    return { centre, radiusMetres: puddleRadiusMetres(puddleShareOf(puddle.wetMl)) }
  }

  private finishTheStroke(stroke: WipeStroke, heldSeconds: number): void {
    if (stroke.unwipedMetres > 0) this.wipeWhatTheStrokeCovered(stroke, heldSeconds)
    this.log(`stroke with the cloth ended: ${stroke.lengthMetres.toFixed(2)} m in ${heldSeconds.toFixed(1)} s, ${stroke.metresOverThePuddle.toFixed(2)} m of it over the puddle, the ${stroke.furnitureId} is ${wetMlAt(this.ritual.state, stroke.furnitureId).toFixed(1)} ml wet`)
  }

  private wipeStrokeStartingAt(target: RoomTapTarget): WipeStroke | null {
    if (this.chosenItemId() !== clothItemId || target.kind !== 'surface') return null
    return { furnitureId: target.furnitureId, lengthMetres: 0, unwipedMetres: 0, unwipedMetresOverThePuddle: 0, metresOverThePuddle: 0, lastPoint: target.point, heldSecondsAtLastWipe: 0 }
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
    const events = this.ritual.dispatch({ type: 'putDown', itemId, spot })
    this.letGoOfTheChoiceUnlessRefused(events)
    if (itemId === clothItemId && this.ritual.state.cloth.location.kind === 'onSurface') this.soakUpThePuddleIfTheClothLandsInIt(furnitureId, point)
  }

  private soakUpThePuddleIfTheClothLandsInIt(furnitureId: FurnitureId, point: WorldPoint): void {
    const puddle = this.puddleOn(furnitureId)
    if (puddle === null) return this.log(`the cloth goes down on the ${furnitureId}, where nothing is spilled`)
    const distanceToThePuddle = Math.hypot(point.x - puddle.centre.x, point.z - puddle.centre.z)
    const isInThePuddle = puddle.radiusMetres > 0 && distanceToThePuddle < puddle.radiusMetres + clothHalfWidthMetres
    if (!isInThePuddle) return this.log(`the cloth goes down ${distanceToThePuddle.toFixed(2)} m from a puddle ${puddle.radiusMetres.toFixed(2)} m wide on the ${furnitureId}, nothing to soak up`)
    this.log(`the cloth goes down in the puddle ${distanceToThePuddle.toFixed(2)} m from its centre`)
    this.ritual.dispatch({ type: 'soakUpThePuddle' })
  }

  private letGoOfTheChoiceUnlessRefused(events: readonly RitualEvent[]): void {
    if (events.some((event) => event.type === 'actionRefused')) return this.log(`hand ${this.chosenHandIndex} stays chosen after the refusal`)
    this.choice = null
  }

  private putTheChosenItemOnTheHeater(): void {
    const itemId = this.chosenItemId()
    if (itemId === null) return this.log('tap on the heater ignored: no hand is chosen')
    const events = this.ritual.dispatch({ type: 'placeOnHeater', itemId })
    this.letGoOfTheChoiceUnlessRefused(events)
    const isNewOnTheHeater = !this.itemsTriedOnTheHeater.has(itemId)
    this.itemsTriedOnTheHeater.add(itemId)
    if (isNewOnTheHeater && this.itemsTriedOnTheHeater.size === this.heaterItemsBeforeTheTesterJoke) return this.teaseTheHeaterTester(itemId)
    const isKeptOff = events.some((event) => event.type === 'actionRefused' && event.reason === 'cannotSitOnHeater')
    const shape = carriedShapeOf(this.ritual.state, itemId)
    const remarkKind = isKeptOff && shape !== undefined ? remarkWhenKeptOffTheHeater[shape] : undefined
    if (remarkKind === undefined) return
    const timesTapped = this.remark(remarkKind)
    this.log(`${itemId} is kept off the heater, remarked on ${timesTapped} times`)
  }

  private remarkOnFullHands(itemId: string): void {
    const state = this.ritual.state
    const holdsOnlyBowls = state.keeper.hands.every((heldId) => heldId !== null && carriedShapeOf(state, heldId) === 'bowl')
    const timesTapped = this.remark(holdsOnlyBowls ? 'handsFullOfBowls' : 'handsFull')
    this.log(`${itemId} not taken: both hands are full${holdsOnlyBowls ? ' of bowls' : ''}, remarked on ${timesTapped} times`)
  }

  private teaseTheHeaterTester(itemId: string): void {
    this.remark('heaterTester')
    this.log(`${itemId} is the ${this.itemsTriedOnTheHeater.size}th different item tried on the heater, the tester is teased, once for this visit`)
  }

  private remark(kind: RoomRemarkKind): number {
    const timesTapped = (this.timesRemarked.get(kind) ?? 0) + 1
    this.timesRemarked.set(kind, timesTapped)
    this.listener.remarked({ kind, timesTapped })
    return timesTapped
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
        return furnitureWithPlace(definitionIn(this.catalog, 'rooms', this.ritual.state.roomId).tap?.sinkSpot.placeId ?? null)
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
