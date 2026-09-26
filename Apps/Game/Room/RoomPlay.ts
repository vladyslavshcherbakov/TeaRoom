import { definitionIn, type Catalog } from '../../../Shared/Simulation/Definitions/Catalog.ts'
import type { Spot } from '../../../Shared/Simulation/Definitions/RoomDefinition.ts'
import { isEmpty } from '../../../Shared/Simulation/Physics/Liquid.ts'
import { tiltWhereTheStreamSplashes } from '../../../Shared/Simulation/Physics/Pouring.ts'
import type { Command } from '../../../Shared/Simulation/Ritual/Command.ts'
import { caddyItemId, carriedItemIdsIn, isACloth, itemLocationIn, middleHandIndex, spoonItemId } from '../../../Shared/Simulation/Ritual/Reach.ts'
import type { RitualEvent } from '../../../Shared/Simulation/Ritual/RitualEvent.ts'
import type { DeepReadonly } from '../../../Shared/Simulation/State/DeepReadonly.ts'
import type { HandIndex, ItemLocation, SessionState, VesselState } from '../../../Shared/Simulation/State/SessionState.ts'
import { AimedPour, type AimedPourView, type PourTarget } from './AimedPour.ts'
import { ItemInspection, type ItemInspectionView } from './ItemInspection.ts'
import { whyThereIsNoRoomFor } from './Placement.ts'
import { screenRightOnTheFloor } from './Camera/CameraPoses.ts'
import { puddleShareOf } from '../Table/TablePresenter.ts'
import { RoomRemarks, type RoomRemark } from './RoomRemarks.ts'
import { TapsInARow } from './TapsInARow.ts'
import { WipeStroke } from './WipeStroke.ts'
import { carriedShapeOf, layoutOf } from './CarriedShapes.ts'
import { puddleCentreOn, puddleRadiusMetres, turnFacingTheCameraOf, type CloseUp, type FloorPoint, type FurnitureId, type RoomLayout, type WorldPoint } from './RoomLayout.ts'
import { RoomNavigator, roomEntrance, type RoomLog, type RoomPlace, type RoomView } from './RoomNavigator.ts'
import type { ScreenPoint } from './RoomGestures.ts'
import { degreesShownIn, targetOneDegreeAway, type TemperatureUnit } from './Temperatures.ts'
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
  | { readonly kind: 'heaterPanel' }
  | { readonly kind: 'thermostatArrow'; readonly step: 1 | -1 }
  | { readonly kind: 'thermostatButton' }
  | { readonly kind: 'faucet' }
  | { readonly kind: 'sink' }
  | { readonly kind: 'hand'; readonly handIndex: HandIndex }
  | { readonly kind: 'lid'; readonly itemId: string }
  | { readonly kind: 'figurine'; readonly figurineId: string }
  | { readonly kind: 'roseBush' }
  | { readonly kind: 'medal' }
  | { readonly kind: 'settingsGear' }
  | { readonly kind: 'nothing' }

export type ClothWiping = {
  readonly clothId: string
  readonly at: WorldPoint
}

type Press = {
  readonly target: RoomTapTarget
  heldSeconds: number
  hasMovedAway: boolean
  readonly stroke: WipeStroke | null
  repeatedSteps: number
}

type CloseUpAction = {
  readonly act: () => void
  readonly isDoneWithTheChosenItem: boolean
  readonly isAControl: boolean
}

const fullSpoonDepth = 1
const holdSecondsBeforeAnArrowRepeats = 0.5
const secondsBetweenRepeatedSteps = 0.1
const clothHalfWidthMetres = 0.1
const roseBushTapsThatOpenTheDebugMenu = 10
const tapsWithFullHandsThatGrowAMiddleHand = 10
const fullTurnDegrees = 360
const roseBushKey = 'roseBush'

export type RoomPlayListener = {
  readonly remarked: (remark: RoomRemark) => void
  readonly debugMenuAsked: () => void
  readonly achievementsAsked: () => void
  readonly settingsAsked: () => void
  readonly mayGrowAMiddleHand: () => boolean
  readonly temperatureUnit: () => TemperatureUnit
  readonly isNerdModeOn: () => boolean
  readonly keeperDied: () => void
}

export class RoomPlay {
  private readonly ritual: RitualPort
  private readonly catalog: Catalog
  private readonly layout: RoomLayout
  private readonly log: RoomLog
  private readonly listener: RoomPlayListener
  private readonly navigator: RoomNavigator
  private readonly remarks: RoomRemarks
  private readonly roseBushTaps = new TapsInARow()
  private readonly tapsWithFullHands = new TapsInARow()
  private choice: HandIndex | null = null
  private press: Press | null = null
  private aimedPour: AimedPour | null = null
  private inspection: ItemInspection | null = null

  constructor(ritual: RitualPort, catalog: Catalog, layout: RoomLayout, log: RoomLog, heaterItemsBeforeTheTesterJoke: number, listener: RoomPlayListener, startsAt: RoomPlace = roomEntrance) {
    this.ritual = ritual
    this.catalog = catalog
    this.layout = layout
    this.log = log
    this.listener = listener
    this.remarks = new RoomRemarks(heaterItemsBeforeTheTesterJoke, log, (remark) => listener.remarked(remark))
    this.navigator = new RoomNavigator(layout, log, (furnitureId) => this.keeperMovedTo(furnitureId), startsAt)
  }

  get walk(): Walk {
    return this.navigator.walk
  }

  get view(): RoomView {
    return this.navigator.view
  }

  get closeUpInView(): CloseUp | null {
    return this.navigator.closeUpInView
  }

  get place(): RoomPlace {
    return this.navigator.place
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

  get inspectionView(): ItemInspectionView | null {
    return this.inspection?.view ?? null
  }

  get clothWiping(): ClothWiping | null {
    const stroke = this.press !== null && this.press.hasMovedAway ? this.press.stroke : null
    return stroke === null ? null : { clothId: stroke.clothId, at: stroke.lastPoint }
  }

  doesATapReachPastTheChosenHand(target: RoomTapTarget): boolean {
    if (this.chosenItemId() === null || this.view.kind !== 'closeUp') return false
    const action = this.closeUpActionOn(target)
    return action !== null && (action.isDoneWithTheChosenItem || action.isAControl)
  }

  pressStarted(target: RoomTapTarget): void {
    if (this.aimedPour !== null) return this.log(`press on ${describeTarget(target)} ignored while aiming a pour`)
    this.press = { target, heldSeconds: 0, hasMovedAway: false, stroke: this.wipeStrokeStartingAt(target), repeatedSteps: 0 }
  }

  pressMovedOver(target: RoomTapTarget): void {
    const press = this.press
    const stroke = press?.stroke
    if (press === null || stroke === undefined || stroke === null || target.kind !== 'surface' || target.furnitureId !== stroke.furnitureId) return
    const isTimeToWipe = stroke.movedTo(target.point, (middle) => this.isTheClothOverThePuddleAt(stroke.furnitureId, middle))
    if (isTimeToWipe) this.wipeWhatTheStrokeCovered(stroke, press.heldSeconds)
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
    if (press.repeatedSteps > 0) return this.log(`hold on ${describeTarget(press.target)} ended after ${press.repeatedSteps} steps of the thermostat`)
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

  handHoldingWhatIsPressed(target: RoomTapTarget): HandIndex | null {
    if (target.kind === 'hand') return target.handIndex
    if (target.kind !== 'lid') return null
    const location = this.locationOfItem(target.itemId)
    return location?.kind === 'inHand' ? location.handIndex : null
  }

  handPressHeld(handIndex: HandIndex, heldSeconds: number): void {
    this.press = null
    const itemId = this.ritual.state.keeper.hands[handIndex] ?? null
    if (itemId === null) return this.log(`hold on hand ${handIndex} inspects nothing: the hand is empty`)
    this.inspection = new ItemInspection(itemId, handIndex)
    this.log(`inspecting ${itemId} from hand ${handIndex} after a hold of ${heldSeconds.toFixed(1)} s, ${this.describeTheChoice()} and stays so`)
  }

  inspectionTurnedBy(fingerStep: ScreenPoint): void {
    this.inspection?.turnBy(fingerStep)
  }

  inspectionZoomedTo(magnification: number): void {
    this.inspection?.zoomTo(magnification)
  }

  inspectionPinchEnded(): void {
    const view = this.inspectionView
    if (view !== null) this.log(`pinched the inspected ${view.itemId} to ${view.magnification.toFixed(2)} times its size`)
  }

  inspectionTapped(target: RoomTapTarget): void {
    const view = this.inspectionView
    if (view === null) return this.log(`tap on ${describeTarget(target)} ignored: nothing is inspected`)
    const isOnTheItem = (target.kind === 'hand' && target.handIndex === view.handIndex) || (target.kind === 'lid' && target.itemId === view.itemId)
    if (isOnTheItem) return this.log(`tap on the inspected ${view.itemId} does nothing`)
    this.inspection = null
    this.log(`inspecting ${view.itemId} ended by a tap on ${describeTarget(target)}, turned ${turnDegreesOf(view.yawRadians)}° across and ${turnDegreesOf(view.pitchRadians)}° over at ${view.magnification.toFixed(2)} times its size, ${this.describeTheChoice()} as before`)
  }

  sipTapped(): void {
    const cupId = this.sippableCupId
    if (cupId === null) return this.log('sip ignored: the chosen hand holds no tea bowl')
    const events = this.ritual.dispatch({ type: 'tasteCup', cupId })
    if (!events.some((event) => event.type === 'keeperDied')) return
    this.log(`the sip from ${cupId} killed the keeper, so the room shows it`)
    this.listener.keeperDied()
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
    if (this.press === null) return
    this.press.heldSeconds += seconds
    this.repeatTheHeldArrow(this.press)
  }

  private tapped(target: RoomTapTarget): void {
    const chosenItemId = this.chosenItemId()
    this.log(`tap on ${describeTarget(target)}, ${chosenItemId === null ? 'no hand chosen' : `${chosenItemId} chosen in hand ${this.choice}`}`)
    if (target.kind === 'roseBush') return this.countTheRoseBushTap()
    this.forgetTheRoseBushTaps()
    if (target.kind !== 'item' || !this.tapsWithFullHands.isCounting(target.itemId)) this.forgetTheTapsWithFullHands()
    if (target.kind === 'medal') return this.showTheAchievements()
    if (target.kind === 'settingsGear') return this.showTheSettings()
    if (target.kind === 'hand') return this.toggleHand(target.handIndex)
    if (target.kind === 'lid') {
      const location = itemLocationIn(this.ritual.state, target.itemId)
      if (location?.kind === 'inHand') return this.tapTheLidOfAHeldItem(target.itemId, location.handIndex)
    }
    const closeUpFurnitureId = this.view.kind === 'closeUp' ? this.view.furnitureId : null
    if (target.kind === 'figurine' && closeUpFurnitureId !== this.ritualFurnitureId()) return this.keepTheSillForTheRoom(target.figurineId)
    const targetFurnitureId = this.furnitureOf(target)
    if (closeUpFurnitureId === null || targetFurnitureId !== closeUpFurnitureId) return this.navigate(target, targetFurnitureId)
    this.actAtCloseUp(target)
  }

  private tapTheLidOfAHeldItem(itemId: string, handIndex: HandIndex): void {
    if (this.choice === handIndex) return this.toggleLidOf(itemId)
    this.log(`tap on the lid of ${itemId} in the hand that is not chosen chooses hand ${handIndex}, as a tap on the item does`)
    this.toggleHand(handIndex)
  }

  private describeTheChoice(): string {
    return this.choice === null ? 'no hand is chosen' : `hand ${this.choice} is chosen`
  }

  private showTheSettings(): void {
    this.log('the gear on the wall shows the settings')
    this.listener.settingsAsked()
  }

  private showTheAchievements(): void {
    this.log('the medal on the wall shows the list of achievements')
    this.listener.achievementsAsked()
  }

  private countTheRoseBushTap(): void {
    const tapsInARow = this.roseBushTaps.countTapOn(roseBushKey)
    this.log(`rose bush tapped ${tapsInARow} times in a row`)
    if (tapsInARow < roseBushTapsThatOpenTheDebugMenu) return
    this.roseBushTaps.startAgain()
    this.log('the debug menu opens after ten taps in a row on a rose bush')
    this.listener.debugMenuAsked()
  }

  private forgetTheRoseBushTaps(): void {
    if (this.roseBushTaps.countSoFar === 0) return
    this.log(`another tap after ${this.roseBushTaps.countSoFar} taps on a rose bush starts the count again`)
    this.roseBushTaps.startAgain()
  }

  private keepTheSillForTheRoom(figurineId: string): void {
    this.log(`tap on ${figurineId} from afar leaves the keeper in place: it stands on the sill`)
    this.remarks.heard({ kind: 'figurineTappedFromAfar', figurineId })
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
    const action = this.closeUpActionOn(target)
    if (action === null) return this.log(`tap on ${describeTarget(target)} in the close-up does nothing`)
    action.act()
  }

  private closeUpActionOn(target: RoomTapTarget): CloseUpAction | null {
    switch (target.kind) {
      case 'item':
        return { act: () => this.touchItem(target.itemId), isDoneWithTheChosenItem: this.chosenItemId() === spoonItemId || this.canAimAPourAt(target.itemId), isAControl: false }
      case 'lid':
        if (this.canAimAPourAt(target.itemId)) return { act: () => this.startAimingAt(target.itemId), isDoneWithTheChosenItem: true, isAControl: false }
        return { act: () => this.toggleLidOf(target.itemId), isDoneWithTheChosenItem: false, isAControl: false }
      case 'figurine':
        return { act: () => this.offerTheChosenCupTo(target.figurineId), isDoneWithTheChosenItem: true, isAControl: false }
      case 'surface':
        return { act: () => this.putDownTheChosenItemAt(target.furnitureId, target.point), isDoneWithTheChosenItem: true, isAControl: false }
      case 'heater':
        return { act: () => this.putTheChosenItemOnTheHeater(), isDoneWithTheChosenItem: true, isAControl: false }
      case 'sink':
        return { act: () => this.putTheChosenItemInTheSink(), isDoneWithTheChosenItem: true, isAControl: false }
      case 'heaterSwitch':
        return { act: () => this.switchTheHeater(), isDoneWithTheChosenItem: false, isAControl: true }
      case 'heaterPanel':
        return { act: () => this.log('tap on the heater panel between its controls does nothing'), isDoneWithTheChosenItem: false, isAControl: true }
      case 'thermostatArrow':
        return { act: () => this.stepTheThermostat(target.step), isDoneWithTheChosenItem: false, isAControl: true }
      case 'thermostatButton':
        return { act: () => this.pressTheThermostatButton(), isDoneWithTheChosenItem: false, isAControl: true }
      case 'faucet':
        return { act: () => this.turnTheTap(), isDoneWithTheChosenItem: false, isAControl: true }
      default:
        return null
    }
  }

  private switchTheHeater(): void {
    const command: Command = this.ritual.state.heater.isOn ? { type: 'switchHeaterOff' } : { type: 'switchHeaterOn', holdsTheThermostatsTarget: this.listener.isNerdModeOn() }
    this.ritual.dispatch(command)
  }

  private stepTheThermostat(step: 1 | -1): void {
    const thermostat = this.ritual.state.heater.thermostat
    const unit = this.listener.temperatureUnit()
    const range = definitionIn(this.catalog, 'heaters', this.ritual.state.heater.definitionId).thermostat
    const targetC = targetOneDegreeAway(thermostat.targetC, step, unit, range)
    if (targetC === null) return this.log(`the thermostat stays at ${degreesShownIn(unit, thermostat.targetC)} degrees ${unit}, its ${step > 0 ? 'highest' : 'lowest'}`)
    this.ritual.dispatch({ type: 'setTheThermostat', targetC })
  }

  private pressTheThermostatButton(): void {
    this.ritual.dispatch({ type: this.ritual.state.heater.thermostat.isOn ? 'stopTheThermostat' : 'startTheThermostat' })
  }

  private repeatTheHeldArrow(press: Press): void {
    const target = press.target
    if (target.kind !== 'thermostatArrow' || press.hasMovedAway || this.view.kind !== 'closeUp') return
    if (press.heldSeconds < holdSecondsBeforeAnArrowRepeats) return
    const stepsDue = 1 + Math.floor((press.heldSeconds - holdSecondsBeforeAnArrowRepeats) / secondsBetweenRepeatedSteps)
    while (press.repeatedSteps < stepsDue) {
      press.repeatedSteps += 1
      this.stepTheThermostat(target.step)
    }
  }

  private keeperMovedTo(furnitureId: FurnitureId | null): void {
    if (this.aimedPour !== null) this.pourDone()
    this.ritual.dispatch({ type: 'standAt', placeId: furnitureId })
  }

  private touchItem(itemId: string): void {
    if (this.chosenItemId() === spoonItemId) return this.useTheSpoonOn(itemId)
    if (this.canAimAPourAt(itemId)) return this.startAimingAt(itemId)
    const chosenItemId = this.chosenItemId()
    if (chosenItemId !== null) this.log(`no pour aimed from ${chosenItemId} at ${itemId}: ${this.whyNoPourCanBeAimedAt(itemId)}, so ${itemId} is taken`)
    this.pickUpAndChoose(itemId)
  }

  private whyNoPourCanBeAimedAt(targetId: string): string {
    const sourceId = this.chosenItemId()
    const source = sourceId === null ? undefined : this.ritual.state.vessels[sourceId]
    if (source === undefined) return `${sourceId ?? 'nothing'} is not a vessel`
    if (source.id === targetId) return `${targetId} is the chosen vessel itself`
    return `${targetId} is not a vessel standing on a surface`
  }

  private pickUpAndChoose(itemId: string): void {
    const events = this.ritual.dispatch({ type: 'pickUp', itemId })
    if (events.some((event) => event.type === 'actionRefused' && event.reason === 'handsFull')) return this.tapWithFullHands(itemId)
    const pickedUp = events.find((event) => event.type === 'pickedUp')
    if (pickedUp === undefined) return
    this.choice = pickedUp.handIndex
    this.log(`chose ${itemId} in hand ${pickedUp.handIndex} as it was picked up`)
  }

  private canAimAPourAt(targetId: string): boolean {
    const sourceId = this.chosenItemId()
    const target = this.ritual.state.vessels[targetId]
    const source = sourceId === null ? undefined : this.ritual.state.vessels[sourceId]
    return source !== undefined && sourceId !== targetId && target?.location.kind === 'onSurface'
  }

  private startAimingAt(targetId: string): void {
    const sourceId = this.chosenItemId()
    const source = sourceId === null ? undefined : this.ritual.state.vessels[sourceId]
    const target = this.ritual.state.vessels[targetId]
    const targetLayout = layoutOf(this.ritual.state, targetId)
    const closeUp = this.closeUpInView
    if (source === undefined || target?.location.kind !== 'onSurface' || targetLayout === undefined || closeUp === null) return this.log(`no pour to aim at ${targetId}`)
    this.openTheLidsThePourNeeds(source, target)
    const spoutDirection = screenRightOnTheFloor(closeUp)
    const pourTarget = { id: targetId, spot: target.location.spot, openingRadiusMetres: targetLayout.openingRadiusMetres, tiltWhereTheStreamSplashesDegrees: this.tiltWhereTheStreamSplashes(source, target) }
    this.aimedPour = new AimedPour(this.ritual, this.log, source.id, pourTarget, this.pourTargetsBeside(source, target.location.spot.placeId), spoutDirection)
  }

  private openTheLidsThePourNeeds(source: DeepReadonly<VesselState>, target: DeepReadonly<VesselState>): void {
    const lidsToOpen = [
      { vessel: source, isNeeded: definitionIn(this.catalog, 'vessels', source.definitionId).lid?.mustBeOpenToPour === true },
      { vessel: target, isNeeded: definitionIn(this.catalog, 'vessels', target.definitionId).lid?.mustBeOpenToFill === true },
    ].filter(({ vessel, isNeeded }) => isNeeded && !vessel.isLidOpen)
    for (const { vessel } of lidsToOpen) {
      this.log(`opening the lid of ${vessel.id} for the pour from ${source.id} into ${target.id}`)
      this.ritual.dispatch({ type: 'openVesselLid', vesselId: vessel.id })
    }
  }

  private pourTargetsBeside(source: DeepReadonly<VesselState>, placeId: string): PourTarget[] {
    return Object.values(this.ritual.state.vessels).flatMap((vessel) => {
      const layout = layoutOf(this.ritual.state, vessel.id)
      const isStandingThere = vessel.location.kind === 'onSurface' && vessel.location.spot.placeId === placeId
      if (vessel.id === source.id || layout === undefined || !isStandingThere || vessel.location.kind !== 'onSurface') return []
      return [{ id: vessel.id, spot: vessel.location.spot, openingRadiusMetres: layout.openingRadiusMetres, tiltWhereTheStreamSplashesDegrees: this.tiltWhereTheStreamSplashes(source, vessel) }]
    })
  }

  private tiltWhereTheStreamSplashes(source: DeepReadonly<VesselState>, target: DeepReadonly<VesselState>): number {
    return tiltWhereTheStreamSplashes(definitionIn(this.catalog, 'vessels', source.definitionId), definitionIn(this.catalog, 'vessels', target.definitionId))
  }

  private putTheChosenItemInTheSink(): void {
    const itemId = this.chosenItemId()
    if (itemId === null) return this.log('tap on the sink ignored: no hand is chosen')
    this.letGoOfTheChoiceUnlessRefused(this.ritual.dispatch({ type: 'putInTheSink', itemId }))
  }

  private turnTheTap(): void {
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
    const puddleAreaSquareMetres = Math.PI * (this.puddleOn(stroke.furnitureId)?.radiusMetres ?? 0) ** 2
    const wipe = stroke.wipeWhatWasCovered(heldSeconds, puddleAreaSquareMetres)
    if (wipe === null) return
    this.ritual.dispatch({ type: 'wipeTable', clothId: stroke.clothId, ...wipe })
  }

  private isTheClothOverThePuddleAt(furnitureId: FurnitureId, point: FloorPoint): boolean {
    const puddle = this.puddleOn(furnitureId)
    return puddle !== null && Math.hypot(point.x - puddle.centre.x, point.z - puddle.centre.z) < puddle.radiusMetres + clothHalfWidthMetres
  }

  private puddleOn(furnitureId: FurnitureId): { centre: WorldPoint; radiusMetres: number } | null {
    const puddle = this.ritual.state.puddles[furnitureId]
    const centre = puddle === undefined ? null : puddleCentreOn(this.layout, furnitureId, puddle.spilledAround)
    if (puddle === undefined || centre === null) return null
    return { centre, radiusMetres: puddleRadiusMetres(puddleShareOf(puddle.wetMl)) }
  }

  private finishTheStroke(stroke: WipeStroke, heldSeconds: number): void {
    if (stroke.hasUnwipedLength) this.wipeWhatTheStrokeCovered(stroke, heldSeconds)
    this.log(`stroke with ${stroke.clothId} ended: ${stroke.describe(heldSeconds)}, the ${stroke.furnitureId} is ${wetMlAt(this.ritual.state, stroke.furnitureId).toFixed(1)} ml wet`)
  }

  private wipeStrokeStartingAt(target: RoomTapTarget): WipeStroke | null {
    const clothId = this.chosenItemId()
    if (clothId === null || !isACloth(this.ritual.state, clothId) || target.kind !== 'surface') return null
    return new WipeStroke(clothId, target.furnitureId, target.point)
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
    const closeUp = this.closeUpInView
    const spot: Spot = closeUp === null ? { placeId: furnitureId, x: point.x, y: point.y, z: point.z } : { placeId: furnitureId, x: point.x, y: point.y, z: point.z, turnRadians: turnFacingTheCameraOf(closeUp) }
    const refusal = whyThereIsNoRoomFor(itemId, spot, this.ritual.state, { layout: this.layout, heaterSpot: this.heaterSpot() })
    if (refusal !== null) return this.log(`no room for ${itemId} at (${point.x.toFixed(2)}, ${point.z.toFixed(2)}) on the ${furnitureId}: ${refusal}`)
    const events = this.ritual.dispatch({ type: 'putDown', itemId, spot })
    this.letGoOfTheChoiceUnlessRefused(events)
    if (this.ritual.state.cloths[itemId]?.location.kind === 'onSurface') this.soakUpThePuddleIfTheClothLandsInIt(itemId, furnitureId, point)
    if (furnitureId === 'shelf') this.remarks.heard({ kind: 'putOnTheShelf', itemId, isEverythingOnTheShelf: this.isEverythingOnTheShelf() })
  }

  private isEverythingOnTheShelf(): boolean {
    const state = this.ritual.state
    return carriedItemIdsIn(state).every((itemId) => {
      const location = itemLocationIn(state, itemId)
      return location === undefined || location.kind === 'gone' || (location.kind === 'onSurface' && location.spot.placeId === 'shelf')
    })
  }

  private soakUpThePuddleIfTheClothLandsInIt(clothId: string, furnitureId: FurnitureId, point: WorldPoint): void {
    const puddle = this.puddleOn(furnitureId)
    if (puddle === null) return this.log(`${clothId} goes down on the ${furnitureId}, where nothing is spilled`)
    const distanceToThePuddle = Math.hypot(point.x - puddle.centre.x, point.z - puddle.centre.z)
    const isInThePuddle = puddle.radiusMetres > 0 && distanceToThePuddle < puddle.radiusMetres + clothHalfWidthMetres
    if (!isInThePuddle) return this.log(`${clothId} goes down ${distanceToThePuddle.toFixed(2)} m from a puddle ${puddle.radiusMetres.toFixed(2)} m wide on the ${furnitureId}, nothing to soak up`)
    this.log(`${clothId} goes down in the puddle ${distanceToThePuddle.toFixed(2)} m from its centre`)
    this.ritual.dispatch({ type: 'soakUpThePuddle', clothId })
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
    const isKeptOff = events.some((event) => event.type === 'actionRefused' && event.reason === 'cannotSitOnHeater')
    this.remarks.heard({ kind: 'putOnTheHeater', itemId, shape: carriedShapeOf(this.ritual.state, itemId), isKeptOff, isTheHeaterOn: this.ritual.state.heater.isOn })
  }

  private tapWithFullHands(itemId: string): void {
    const count = this.tapsWithFullHands.countTapOn(itemId)
    if (count < tapsWithFullHandsThatGrowAMiddleHand) return this.remarkOnFullHands(itemId)
    this.tapsWithFullHands.startAgain()
    if (!this.listener.mayGrowAMiddleHand()) {
      this.log(`${itemId} tapped ${count} times in a row with full hands, but the middle hand has been grown before, so none grows`)
      return this.remarkOnFullHands(itemId)
    }
    const events = this.ritual.dispatch({ type: 'pickUpWithAMiddleHand', itemId })
    const pickedUp = events.find((event) => event.type === 'pickedUp')
    if (pickedUp === undefined) return this.log(`${itemId} tapped ${count} times in a row with full hands, but it could not be taken into a middle hand`)
    this.choice = pickedUp.handIndex
    this.log(`${itemId} tapped ${count} times in a row with full hands grows a middle hand, which takes it and is chosen`)
  }

  private forgetTheTapsWithFullHands(): void {
    if (this.tapsWithFullHands.countSoFar === 0) return
    this.log(`another tap after ${this.tapsWithFullHands.countSoFar} taps with full hands starts the count again`)
    this.tapsWithFullHands.startAgain()
  }

  private remarkOnFullHands(itemId: string): void {
    const state = this.ritual.state
    const holdsOnlyBowls = state.keeper.hands.slice(0, middleHandIndex).every((heldId) => heldId !== null && carriedShapeOf(state, heldId) === 'bowl')
    this.log(`${itemId} not taken: both hands are full${holdsOnlyBowls ? ' of bowls' : ''}`)
    this.remarks.heard({ kind: 'takenWithFullHands', itemId, holdsOnlyBowls })
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
      case 'heaterPanel':
      case 'thermostatArrow':
      case 'thermostatButton':
        return this.furnitureWithPlace(this.heaterSpot().placeId)
      case 'faucet':
      case 'sink':
        return this.furnitureWithPlace(definitionIn(this.catalog, 'rooms', this.ritual.state.roomId).tap?.sinkSpot.placeId ?? null)
      case 'item':
      case 'lid':
        return this.furnitureWithPlace(placeOf(this.locationOfItem(target.itemId)))
      case 'figurine':
        return this.ritualFurnitureId()
      default:
        return null
    }
  }

  private ritualFurnitureId(): FurnitureId | null {
    return this.furnitureWithPlace(definitionIn(this.catalog, 'rooms', this.ritual.state.roomId).ritualPlaceId)
  }

  private locationOfItem(itemId: string): DeepReadonly<ItemLocation> | undefined {
    return itemLocationIn(this.ritual.state, itemId)
  }

  private heaterSpot(): Spot {
    return definitionIn(this.catalog, 'rooms', this.ritual.state.roomId).heaterSpot
  }

  private furnitureWithPlace(placeId: string | null): FurnitureId | null {
    return this.layout.furniture.find((piece) => piece.id === placeId)?.id ?? null
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

function turnDegreesOf(radians: number): number {
  const degrees = Math.round((radians * 180) / Math.PI) % fullTurnDegrees
  return degrees < 0 ? degrees + fullTurnDegrees : degrees
}

function placeOf(location: DeepReadonly<ItemLocation> | undefined): string | null {
  return location?.kind === 'onSurface' ? location.spot.placeId : null
}
