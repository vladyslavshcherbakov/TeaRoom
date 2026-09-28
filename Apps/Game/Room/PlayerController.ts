import { carriedItemIdsIn, definitionIn, isHeating, isTheHeaterInUse, isTheThermostatWorking, itemIdInHand, itemIdsInTheHands, itemLocationIn, middleHandIndex, spoonItemId, standingSpotOf, totalLeafGrams, type Catalog, type Command, type DeepReadonly, type HandIndex, type ItemLocation, type TeaEvent, type Spot } from '../../../Shared/GameLogic/GameLogic.ts'
import { stepsDueWhileAnArrowIsHeld } from '../../Engine/HeldArrow.ts'
import { aimAPour, canAimAPour, whyNoPourCanBeAimed, type AimedPour, type AimedPourView } from './AimedPour.ts'
import { ItemInspection, type ItemInspectionView } from './ItemInspection.ts'
import { whyThereIsNoRoomFor, type LyingLids } from './Placement.ts'
import { screenRightOnTheFloor } from './Camera/CameraPoses.ts'
import { PlayerBarks, type HeardFact, type PlayerBark } from './PlayerBarks.ts'
import { SipGesture, type SipGestureView } from './SipGesture.ts'
import { TapsInARow } from '../../Engine/TapsInARow.ts'
import { WipeStroke } from './WipeStroke.ts'
import { carriedShapeOf } from './CarriedShapes.ts'
import { turnFacingTheCameraOf, type CloseUp, type FurnitureId, type RoomLayout } from './RoomLayout.ts'
import type { FloorPoint, WorldPoint } from '../../Engine/Points.ts'
import { RoomNavigator, roomEntrance, type RoomPlace, type RoomView } from './RoomNavigator.ts'
import type { AppLog } from '../../Engine/AppLog.ts'
import type { RoomSettings } from './RoomSettings.ts'
import type { ScreenPoint } from '../../Engine/ScreenPoint.ts'
import { describeTarget, type TapTarget } from './TapTarget.ts'
import type { MomentaryRoomSound } from './RoomSounds.ts'
import type { AreaSetAside } from './TapTargetAmong.ts'
import { degreesShownIn, targetOneDegreeAway } from './Temperatures.ts'
import type { Walk } from '../../Engine/Walking/Walk.ts'
import type { SessionPort } from './SessionPort.ts'
import type { PlayerMode } from './PlayerMode.ts'
import type { ScreenButton } from './ScreenButton.ts'
import { ClothOnTheTable } from './ClothOnTheTable.ts'

export type ClothWiping = {
  readonly clothId: string
  readonly at: WorldPoint
  readonly flatShare: number
}

export type FrameSeconds = {
  readonly worldSeconds: number
  readonly realSeconds: number
}


type ModeState =
  | { readonly kind: 'free' }
  | { readonly kind: 'aiming'; readonly pour: AimedPour }
  | { readonly kind: 'lookingClosely'; readonly inspection: ItemInspection }
  | { readonly kind: 'sipping'; readonly gesture: SipGesture }
  | { readonly kind: 'ended' }

type Input = 'press' | 'handKey' | 'handHold' | 'sip' | 'tilt' | 'whyPouring' | 'pourFinger' | 'aimingTap' | 'inspection' | 'walk' | 'kettleFill' | 'leaveFirstPerson'

export type PressOnTheScreen = {
  readonly point: ScreenPoint
  readonly touched: TapTarget
  readonly areasHoldingTheFinger: readonly TapTarget[]
  readonly areasSetAside: readonly AreaSetAside[]
}

type Press = {
  readonly target: TapTarget
  readonly onTheScreen: PressOnTheScreen | null
  heldSeconds: number
  hasMovedAway: boolean
  readonly stroke: WipeStroke | null
  repeatedSteps: number
}

type TapAction = {
  readonly act: () => void
  readonly pressSound: MomentaryRoomSound | null
}

type CloseUpAction = TapAction & {
  readonly isDoneWithTheChosenItem: boolean
  readonly isAControl: boolean
}

const fullSpoonDepth = 1
const roseBushTapsThatOpenTheDebugMenu = 10
const tapsWithFullHandsThatGrowAMiddleHand = 10
const fullTurnDegrees = 360
const freeMode: ModeState = { kind: 'free' }

const inputsTakenByMode: Readonly<Record<PlayerMode, readonly Input[]>> = {
  free: ['press', 'handKey', 'handHold', 'sip', 'walk', 'kettleFill', 'leaveFirstPerson'],
  aiming: ['tilt', 'whyPouring', 'pourFinger', 'aimingTap', 'kettleFill', 'leaveFirstPerson'],
  lookingClosely: ['inspection', 'kettleFill', 'leaveFirstPerson'],
  sipping: ['walk', 'kettleFill', 'leaveFirstPerson'],
  ended: ['leaveFirstPerson'],
}

const whatIsGoingOnByMode: Readonly<Record<PlayerMode, string>> = {
  free: 'nothing is going on',
  aiming: 'a pour is being aimed',
  lookingClosely: 'a held item is looked at closely',
  sipping: 'a sip is being taken',
  ended: 'the player has died',
}

export type PlayerControllerListener = {
  readonly barked: (bark: PlayerBark) => void
  readonly debugMenuAsked: () => void
  readonly achievementsAsked: () => void
  readonly settingsAsked: () => void
  readonly guideAsked: () => void
  readonly playerDied: () => void
  readonly firstPersonLeaveAsked: () => void
  readonly soundStarted: (sound: MomentaryRoomSound) => void
}

export type PlayerControllerSettings = Pick<RoomSettings, 'temperatureUnit' | 'isNerdModeOn' | 'areAchievementsShown'>

export type PlayerControllerQuestions = {
  readonly settings: () => PlayerControllerSettings
  readonly mayGrowAMiddleHand: () => boolean
  readonly screenRightOnTheFloor: () => FloorPoint | null
}

export class PlayerController {
  private readonly session: SessionPort
  private readonly catalog: Catalog
  private readonly layout: RoomLayout
  private readonly lyingLids: LyingLids
  private readonly log: AppLog
  private readonly listener: PlayerControllerListener
  private readonly questions: PlayerControllerQuestions
  private readonly navigator: RoomNavigator
  private readonly barks: PlayerBarks
  private readonly clothOnTheTable: ClothOnTheTable
  private readonly roseBushTaps: TapsInARow
  private readonly tapsWithFullHands: TapsInARow
  private choice: HandIndex | null = null
  private press: Press | null = null
  private modeState: ModeState = freeMode
  private walkRefusedIn: PlayerMode | null = null
  private isSeated: boolean
  private furnitureShownCloseUp: FurnitureId | null = null

  constructor(session: SessionPort, catalog: Catalog, layout: RoomLayout, lyingLids: LyingLids, log: AppLog, heaterItemsBeforeTheTesterJoke: number, listener: PlayerControllerListener, questions: PlayerControllerQuestions, startsAt: RoomPlace = roomEntrance) {
    this.session = session
    this.catalog = catalog
    this.layout = layout
    this.lyingLids = lyingLids
    this.log = log
    this.listener = listener
    this.questions = questions
    this.barks = new PlayerBarks(heaterItemsBeforeTheTesterJoke, log)
    this.clothOnTheTable = new ClothOnTheTable(session, catalog, layout, lyingLids, log)
    this.roseBushTaps = new TapsInARow('on a rose bush', roseBushTapsThatOpenTheDebugMenu, log)
    this.tapsWithFullHands = new TapsInARow('with full hands', tapsWithFullHandsThatGrowAMiddleHand, log)
    this.navigator = new RoomNavigator(layout, log, (furnitureId, byWalkingFreely) => this.playerMovedTo(furnitureId, byWalkingFreely), startsAt)
    this.isSeated = startsAt.closeUpOf !== null && startsAt.closeUpOf === this.ritualFurnitureId()
    this.furnitureShownCloseUp = this.furnitureInTheCloseUp()
  }

  get walk(): Walk {
    return this.navigator.walk
  }

  get view(): RoomView {
    return this.navigator.view
  }

  get walksStarted(): number {
    return this.navigator.walksStarted
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

  get isSeatedAtTheRitualPlace(): boolean {
    return this.isSeated && this.isAtTheRitualPlace()
  }

  get mode(): PlayerMode {
    return this.modeState.kind
  }

  get sippableCupId(): string | null {
    const itemId = this.chosenItemId()
    if (itemId === null) return null
    return this.session.wouldRefuse([{ type: 'tasteCup', cupId: itemId }]) === null ? itemId : null
  }

  get aimedPourView(): AimedPourView | null {
    return this.modeState.kind === 'aiming' ? this.modeState.pour.view : null
  }

  get inspectionView(): ItemInspectionView | null {
    return this.modeState.kind === 'lookingClosely' ? this.modeState.inspection.view : null
  }

  get sipGestureView(): SipGestureView | null {
    return this.modeState.kind === 'sipping' ? this.modeState.gesture.view : null
  }

  get clothWiping(): ClothWiping | null {
    const stroke = this.press !== null && this.press.hasMovedAway ? this.press.stroke : null
    return stroke === null ? null : { clothId: stroke.clothId, at: stroke.lastPoint, flatShare: stroke.flatShare }
  }

  doesATapReachPastTheChosenHand(target: TapTarget): boolean {
    if (this.chosenItemId() === null || this.view.kind !== 'closeUp') return false
    const action = this.closeUpActionOn(target)
    return action !== null && (action.isDoneWithTheChosenItem || action.isAControl)
  }

  pressStarted(target: TapTarget, onTheScreen: PressOnTheScreen | null): void {
    if (this.isRefusedByTheMode('press', `press on ${describeTarget(target)}`)) return
    this.press = { target, onTheScreen, heldSeconds: 0, hasMovedAway: false, stroke: this.clothOnTheTable.strokeStartingAt(this.chosenItemId(), onTheScreen?.touched ?? target), repeatedSteps: 0 }
  }

  pressMovedOver(touched: TapTarget): void {
    const press = this.press
    const stroke = press?.stroke
    if (press === null || stroke === undefined || stroke === null || touched.kind !== 'surface' || touched.furnitureId !== stroke.furnitureId) return
    this.clothOnTheTable.strokeMovedTo(stroke, touched.point, press.heldSeconds)
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
    if (press.stroke !== null && press.hasMovedAway) return this.clothOnTheTable.strokeEnded(press.stroke, press.heldSeconds)
    if (press.repeatedSteps > 0) return this.log(`hold on ${describeTarget(press.target)} ended after ${press.repeatedSteps} steps of the thermostat`)
    if (press.hasMovedAway || this.isRefusedByTheMode('press', `tap on ${describeTarget(press.target)}`)) return
    this.tapped(press.target, press.onTheScreen)
  }

  pressCancelled(): void {
    const press = this.press
    this.press = null
    if (press === null) return
    this.log(`press on ${describeTarget(press.target)} was cancelled, so it is not a tap${press.stroke !== null && press.hasMovedAway ? ', and its stroke wipes no further' : ''}`)
  }

  pourFingerDown(point: FloorPoint | null): void {
    if (this.isRefusedByTheMode('pourFinger', 'a finger on the aimed pour') || this.modeState.kind !== 'aiming') return
    this.modeState.pour.fingerDown(point)
  }

  pourFingerMoved(point: FloorPoint | null): void {
    if (this.isRefusedByTheMode('pourFinger', 'a finger moving the aimed pour') || this.modeState.kind !== 'aiming') return
    this.modeState.pour.fingerMoved(point)
  }

  pourFingerUp(): void {
    if (this.isRefusedByTheMode('pourFinger', 'a finger lifted from the aimed pour') || this.modeState.kind !== 'aiming') return
    this.modeState.pour.fingerUp()
  }

  tiltPressed(): void {
    if (this.isRefusedByTheMode('tilt', 'the tilt') || this.modeState.kind !== 'aiming') return
    this.modeState.pour.tiltPressed()
  }

  tiltReleased(): void {
    if (this.modeState.kind !== 'aiming') return this.log(`the tilt is released while ${whatIsGoingOnByMode[this.mode]}, with no aim left to tip back`)
    this.modeState.pour.tiltReleased()
  }

  pourDone(): void {
    if (this.isRefusedByTheMode('aimingTap', 'the end of a pour') || this.modeState.kind !== 'aiming') return
    this.log(`the pour from ${this.modeState.pour.view.sourceId} is done, and its hand is no longer chosen`)
    this.endTheAim()
    this.choice = null
  }

  aimingTapped(target: TapTarget): void {
    if (this.isRefusedByTheMode('aimingTap', `tap on ${describeTarget(target)} to end a pour`) || this.modeState.kind !== 'aiming') return
    const sourceId = this.modeState.pour.view.sourceId
    switch (target.kind) {
      case 'lid':
        if (target.itemId !== sourceId) return this.returnTheAimedVesselToItsHand(target)
        this.log(`tap on the lid of ${sourceId} while aiming opens or closes it and keeps the aim`)
        return this.toggleLidOf(sourceId)
      case 'opening':
        if (target.itemId === sourceId || !this.session.isForDrinking(target.itemId)) return this.returnTheAimedVesselToItsHand(target)
        this.log(`tap on the opening of ${target.itemId} while aiming takes it to drink from, and ${sourceId} goes back to its hand`)
        this.pourDone()
        return this.pickUpAndChoose(target.itemId)
      case 'surface':
        this.log(`tap on the ${target.furnitureId} while aiming puts the vessel down there`)
        this.endTheAim()
        this.putDownTheChosenItemAt(target.furnitureId, target.point)
        return this.letGoOfTheChoiceAfterTheAim()
      case 'sink':
        this.log('tap on the sink while aiming puts the vessel in the sink')
        this.endTheAim()
        this.putTheChosenItemInTheSink()
        return this.letGoOfTheChoiceAfterTheAim()
      case 'floor':
      case 'furniture':
      case 'item':
      case 'heater':
      case 'heaterSwitch':
      case 'heaterPanel':
      case 'thermostatArrow':
      case 'thermostatButton':
      case 'faucet':
      case 'hand':
      case 'figurine':
      case 'roseBush':
      case 'medal':
      case 'settingsGear':
      case 'guideBook':
      case 'nothing':
        return this.returnTheAimedVesselToItsHand(target)
    }
  }

  handHoldingWhatIsPressed(target: TapTarget): HandIndex | null {
    if (target.kind === 'hand') return target.handIndex
    if (target.kind !== 'lid') return null
    const location = this.locationOfItem(target.itemId)
    return location?.kind === 'inHand' ? location.handIndex : null
  }

  barksOn(events: readonly TeaEvent[], elapsedSeconds: number): readonly PlayerBark[] {
    return this.barks.heard(events.map((event) => ({ kind: 'teaEvent', event, elapsedSeconds })))
  }

  handPressHeld(handIndex: HandIndex, heldSeconds: number): void {
    this.press = null
    if (this.isRefusedByTheMode('handHold', `hold on hand ${handIndex}`)) return
    const itemId = itemIdInHand(this.session.state, handIndex)
    if (itemId === null) return this.log(`hold on hand ${handIndex} inspects nothing: the hand is empty`)
    this.modeState = { kind: 'lookingClosely', inspection: new ItemInspection(itemId, handIndex) }
    this.log(`inspecting ${itemId} from hand ${handIndex} after a hold of ${heldSeconds.toFixed(1)} s, ${this.describeTheChoice()} and stays so`)
  }

  inspectionTurnedBy(fingerStep: ScreenPoint): void {
    if (this.isRefusedByTheMode('inspection', 'turning the item looked at closely') || this.modeState.kind !== 'lookingClosely') return
    this.modeState.inspection.turnBy(fingerStep)
  }

  inspectionZoomedTo(magnification: number): void {
    if (this.isRefusedByTheMode('inspection', 'zooming the item looked at closely') || this.modeState.kind !== 'lookingClosely') return
    this.modeState.inspection.zoomTo(magnification)
  }

  inspectionPinchEnded(): void {
    if (this.isRefusedByTheMode('inspection', 'a pinch of the item looked at closely') || this.modeState.kind !== 'lookingClosely') return
    const view = this.modeState.inspection.view
    this.log(`pinched the inspected ${view.itemId} to ${view.magnification.toFixed(2)} times its size`)
  }

  inspectionTapped(target: TapTarget): void {
    if (this.isRefusedByTheMode('inspection', `tap on ${describeTarget(target)} to end a close look`) || this.modeState.kind !== 'lookingClosely') return
    const view = this.modeState.inspection.view
    const isOnTheItem = (target.kind === 'hand' && target.handIndex === view.handIndex) || (target.kind === 'lid' && target.itemId === view.itemId)
    if (isOnTheItem) return this.log(`tap on the inspected ${view.itemId} does nothing`)
    this.modeState = freeMode
    this.log(`inspecting ${view.itemId} ended by a tap on ${describeTarget(target)}, turned ${turnDegreesOf(view.yawRadians)}° across and ${turnDegreesOf(view.pitchRadians)}° over at ${view.magnification.toFixed(2)} times its size, ${this.describeTheChoice()} as before`)
  }

  screenButtonPressed(button: ScreenButton): void {
    switch (button) {
      case 'sip':
        return this.sipTapped()
      case 'tilt':
        return this.tiltPressed()
      case 'whyPouring':
        return this.explainThePour()
      case 'leaveFirstPerson':
        return this.leaveFirstPerson()
    }
  }

  screenButtonReleased(button: ScreenButton): void {
    switch (button) {
      case 'tilt':
        return this.tiltReleased()
      case 'sip':
      case 'whyPouring':
      case 'leaveFirstPerson':
        return this.log(`the ${button} button is let go, which changes nothing`)
    }
  }

  sipTapped(): void {
    if (this.isRefusedByTheMode('sip', 'sip')) return
    const cupId = this.sippableCupId
    if (cupId === null) return this.log('sip ignored: the chosen hand holds no tea bowl')
    const volumeBeforeMl = this.session.state.vessels[cupId]?.liquid.volumeMl ?? 0
    const events = this.session.dispatch({ type: 'tasteCup', cupId })
    if (events.some((event) => event.type === 'teaTasted')) this.raiseToTheLips(cupId, volumeBeforeMl)
    if (!events.some((event) => event.type === 'playerDied')) return
    this.log(`the sip from ${cupId} killed the player, so the room shows it and takes no more input`)
    this.modeState = { kind: 'ended' }
    this.listener.playerDied()
  }

  fillTheKettleTapped(): void {
    if (this.isRefusedByTheMode('kettleFill', 'filling the kettle from the debug menu')) return
    const kettleId = Object.keys(this.session.state.vessels).find((vesselId) => carriedShapeOf(this.session.state, vesselId) === 'kettle')
    if (kettleId === undefined) return this.log('the kettle is not filled from the debug menu: this room has no kettle')
    this.log(`the debug menu asks to fill ${kettleId} with boiling water`)
    this.session.dispatch({ type: 'fillWithBoilingWater', vesselId: kettleId })
  }

  walkFreely(step: FloorPoint, headingRadians: number): void {
    if (this.isWalkingRefusedByTheMode()) return
    this.navigator.walkFreely(step, headingRadians)
  }

  handKeyTapped(handIndex: HandIndex): void {
    if (this.isRefusedByTheMode('handKey', `key tap on hand ${handIndex}`)) return
    this.tapped({ kind: 'hand', handIndex }, null)
  }

  standUpToWalk(): void {
    if (!this.isSeated || this.isWalkingRefusedByTheMode()) return
    this.isSeated = false
    this.log('the player stands up from the tea table to walk')
  }

  stopWalkingFreely(): void {
    this.navigator.stopWalkingFreely()
  }

  advance(frame: FrameSeconds): void {
    this.navigator.advance(frame.worldSeconds)
    this.whooshIfTheCloseUpChanged()
    if (this.modeState.kind === 'aiming') this.modeState.pour.advance(frame.worldSeconds)
    this.advanceTheSipGesture(frame.worldSeconds)
    this.clothOnTheTable.soakWherePuddlesReachLyingCloths()
    if (this.press === null) return
    this.press.heldSeconds += frame.realSeconds
    if (this.press.stroke !== null) this.clothOnTheTable.strokeAfterAFrame(this.press.stroke, frame.realSeconds)
    this.repeatTheHeldArrow(this.press)
  }

  private explainThePour(): void {
    if (this.isRefusedByTheMode('whyPouring', 'the question why a pour is aimed')) return
    this.heard({ kind: 'pourQuestioned' })
  }

  private leaveFirstPerson(): void {
    if (this.isRefusedByTheMode('leaveFirstPerson', 'leaving first person')) return
    this.log('the player asks to leave first person')
    this.listener.firstPersonLeaveAsked()
  }

  private raiseToTheLips(cupId: string, volumeBeforeMl: number): void {
    const cup = this.session.state.vessels[cupId]
    if (cup === undefined) return
    const sippedMl = volumeBeforeMl - cup.liquid.volumeMl
    const sippedFillShare = sippedMl / definitionIn(this.catalog, 'vessels', cup.definitionId).capacityMl
    this.modeState = { kind: 'sipping', gesture: new SipGesture(cupId, sippedFillShare) }
    this.log(`${cupId} is raised to the lips, and ${sippedMl.toFixed(1)} ml leave it in sight`)
  }

  private advanceTheSipGesture(seconds: number): void {
    if (this.modeState.kind !== 'sipping') return
    const gesture = this.modeState.gesture
    const wasTheSlurpHeard = gesture.isTheSlurpHeard
    gesture.advance(seconds)
    if (!wasTheSlurpHeard && gesture.isTheSlurpHeard) this.slurp(gesture.view.cupId)
    if (!gesture.isOver) return
    this.log(`${gesture.view.cupId} is lowered after the sip`)
    this.modeState = freeMode
  }

  private whooshIfTheCloseUpChanged(): void {
    const furnitureInTheCloseUp = this.furnitureInTheCloseUp()
    if (furnitureInTheCloseUp === this.furnitureShownCloseUp) return
    this.log(furnitureInTheCloseUp === null ? `the close-up of the ${this.furnitureShownCloseUp} is left` : `the ${furnitureInTheCloseUp} is shown close up`)
    this.furnitureShownCloseUp = furnitureInTheCloseUp
    this.listener.soundStarted('closeUpWhoosh')
  }

  private furnitureInTheCloseUp(): FurnitureId | null {
    return this.view.kind === 'closeUp' ? this.view.furnitureId : null
  }

  private slurp(cupId: string): void {
    this.log(`${cupId} is halfway to the lips, and the sip is heard`)
    this.listener.soundStarted('sip')
  }

  private endTheAim(): void {
    if (this.modeState.kind !== 'aiming') return
    this.modeState.pour.finish()
    this.modeState = freeMode
  }

  private isTakenByTheMode(input: Input): boolean {
    return inputsTakenByMode[this.mode].includes(input)
  }

  private isRefusedByTheMode(input: Input, what: string): boolean {
    if (this.isTakenByTheMode(input)) return false
    this.log(`${what} refused: ${whatIsGoingOnByMode[this.mode]}`)
    return true
  }

  private isWalkingRefusedByTheMode(): boolean {
    if (this.isTakenByTheMode('walk')) {
      this.walkRefusedIn = null
      return false
    }
    if (this.walkRefusedIn !== this.mode) this.log(`walking refused: ${whatIsGoingOnByMode[this.mode]}`)
    this.walkRefusedIn = this.mode
    return true
  }

  private tapped(target: TapTarget, onTheScreen: PressOnTheScreen | null): void {
    const chosenItemId = this.chosenItemId()
    this.log(`tap on ${describeTarget(target)}${describeThePress(onTheScreen)}, ${chosenItemId === null ? 'no hand chosen' : `${chosenItemId} chosen in hand ${this.choice}`}`)
    if (!this.roseBushTaps.isCounting(describeTarget(target))) this.roseBushTaps.startAgainAfterAnotherTap()
    if ((target.kind !== 'item' && target.kind !== 'opening') || !this.tapsWithFullHands.isCounting(target.itemId)) this.tapsWithFullHands.startAgainAfterAnotherTap()
    const action = this.tapActionOn(target)
    if (action.pressSound !== null) this.listener.soundStarted(action.pressSound)
    action.act()
  }

  private tapActionOn(target: TapTarget): TapAction {
    switch (target.kind) {
      case 'roseBush':
        return { act: () => this.countTheRoseBushTap(target), pressSound: null }
      case 'medal':
        return this.achievementsAction()
      case 'settingsGear':
        return { act: () => this.openTheSettings(), pressSound: 'buttonClick' }
      case 'guideBook':
        return { act: () => this.openTheGuide(), pressSound: 'buttonClick' }
      case 'hand':
        return this.handAction(target.handIndex)
      case 'lid':
        return this.lidAction(target)
      case 'figurine':
        return this.figurineAction(target)
      case 'floor':
      case 'furniture':
      case 'surface':
      case 'item':
      case 'opening':
      case 'heater':
      case 'heaterSwitch':
      case 'heaterPanel':
      case 'thermostatArrow':
      case 'thermostatButton':
      case 'faucet':
      case 'sink':
      case 'nothing':
        return this.actionWhereThePlayerStands(target)
    }
  }

  private achievementsAction(): TapAction {
    if (!this.questions.settings().areAchievementsShown) return { act: () => this.log('the tap on the medal does nothing, because achievements are hidden in the settings and the medal with them'), pressSound: null }
    return { act: () => this.openTheAchievements(), pressSound: 'buttonClick' }
  }

  private handAction(handIndex: HandIndex): TapAction {
    if (this.view.kind !== 'closeUp') return { act: () => this.log(`tap on hand ${handIndex} ignored: a hand is chosen only in a close-up`), pressSound: null }
    const choiceAfterTheTap = itemIdInHand(this.session.state, handIndex) === null || this.choice === handIndex ? null : handIndex
    return { act: () => this.chooseHand(choiceAfterTheTap, handIndex), pressSound: choiceAfterTheTap === this.choice ? null : 'buttonClick' }
  }

  private lidAction(target: Extract<TapTarget, { readonly kind: 'lid' }>): TapAction {
    const location = itemLocationIn(this.session.state, target.itemId)
    if (location?.kind !== 'inHand') return this.actionWhereThePlayerStands(target)
    if (this.choice === location.handIndex) return { act: () => this.toggleLidOf(target.itemId), pressSound: null }
    const handAction = this.handAction(location.handIndex)
    return {
      act: () => {
        this.log(`tap on the lid of ${target.itemId} in the hand that is not chosen chooses hand ${location.handIndex}, as a tap on the item does`)
        handAction.act()
      },
      pressSound: handAction.pressSound,
    }
  }

  private figurineAction(target: Extract<TapTarget, { readonly kind: 'figurine' }>): TapAction {
    if (this.furnitureInTheCloseUp() !== this.ritualFurnitureId()) return { act: () => this.keepTheSillForTheRoom(target.figurineId), pressSound: null }
    return this.actionWhereThePlayerStands(target)
  }

  private actionWhereThePlayerStands(target: TapTarget): TapAction {
    const closeUpFurnitureId = this.furnitureInTheCloseUp()
    const targetFurnitureId = this.furnitureOf(target)
    if (closeUpFurnitureId === null || targetFurnitureId !== closeUpFurnitureId) return { act: () => this.navigate(target, targetFurnitureId), pressSound: null }
    const action = this.closeUpActionOn(target)
    if (action === null) return { act: () => this.log(`tap on ${describeTarget(target)} in the close-up does nothing`), pressSound: null }
    return {
      act: () => {
        this.sitDownAtTheRitualPlace(`to act on ${describeTarget(target)}`)
        action.act()
      },
      pressSound: action.pressSound,
    }
  }

  private describeTheChoice(): string {
    return this.choice === null ? 'no hand is chosen' : `hand ${this.choice} is chosen`
  }

  private openTheSettings(): void {
    this.log('the gear on the wall shows the settings')
    this.listener.settingsAsked()
  }

  private openTheGuide(): void {
    this.log('the book on the wall opens on how the room works')
    this.listener.guideAsked()
  }

  private openTheAchievements(): void {
    this.log('the medal on the wall shows the list of achievements')
    this.listener.achievementsAsked()
  }

  private countTheRoseBushTap(target: TapTarget): void {
    const { count, isReached } = this.roseBushTaps.countTapOn(describeTarget(target))
    this.log(`rose bush tapped ${count} times in a row`)
    if (!isReached) return
    this.log('the debug menu opens after ten taps in a row on a rose bush')
    this.listener.debugMenuAsked()
  }

  private keepTheSillForTheRoom(figurineId: string): void {
    this.log(`tap on ${figurineId} from afar leaves the player in place: it stands on the sill`)
    this.heard({ kind: 'figurineTappedFromAfar', figurineId })
  }

  private navigate(target: TapTarget, targetFurnitureId: FurnitureId | null): void {
    if (targetFurnitureId !== null) this.navigator.tapped({ kind: 'furniture', furnitureId: targetFurnitureId })
    else if (target.kind === 'floor') this.navigator.tapped(target)
    else this.navigator.tapped({ kind: 'nothing' })
    if (this.choice !== null) this.log(`hand ${this.choice} stays chosen while the player leaves the close-up`)
  }

  private sitDownAtTheRitualPlace(reason: string): void {
    if (this.isSeated || !this.isAtTheRitualPlace()) return
    this.isSeated = true
    this.log(`the player sits down at the tea table ${reason}`)
  }

  private isAtTheRitualPlace(): boolean {
    const view = this.view
    return view.kind === 'closeUp' && view.furnitureId === this.ritualFurnitureId()
  }

  private closeUpActionOn(target: TapTarget): CloseUpAction | null {
    switch (target.kind) {
      case 'item':
        return { act: () => this.touchItem(target.itemId), isDoneWithTheChosenItem: this.chosenItemId() === spoonItemId, isAControl: false, pressSound: null }
      case 'opening':
        if (canAimAPour(this.session.state, this.chosenItemId(), target.itemId)) return { act: () => this.startAimingAt(target.itemId), isDoneWithTheChosenItem: true, isAControl: false, pressSound: null }
        return { act: () => this.touchTheOpeningOf(target.itemId), isDoneWithTheChosenItem: this.chosenItemId() === spoonItemId, isAControl: false, pressSound: null }
      case 'lid':
        if (canAimAPour(this.session.state, this.chosenItemId(), target.itemId)) return { act: () => this.startAimingAt(target.itemId), isDoneWithTheChosenItem: true, isAControl: false, pressSound: null }
        return { act: () => this.toggleLidOf(target.itemId), isDoneWithTheChosenItem: false, isAControl: false, pressSound: null }
      case 'figurine':
        return { act: () => this.offerTheChosenCupTo(target.figurineId), isDoneWithTheChosenItem: true, isAControl: false, pressSound: null }
      case 'surface':
        return { act: () => this.putDownTheChosenItemAt(target.furnitureId, target.point), isDoneWithTheChosenItem: true, isAControl: false, pressSound: null }
      case 'heater':
        return { act: () => this.putTheChosenItemOnTheHeater(), isDoneWithTheChosenItem: true, isAControl: false, pressSound: null }
      case 'sink':
        return { act: () => this.putTheChosenItemInTheSink(), isDoneWithTheChosenItem: true, isAControl: false, pressSound: null }
      case 'heaterSwitch':
        return { act: () => this.switchTheHeater(), isDoneWithTheChosenItem: false, isAControl: true, pressSound: 'buttonClick' }
      case 'heaterPanel':
        return { act: () => this.log('tap on the heater panel between its controls does nothing'), isDoneWithTheChosenItem: false, isAControl: true, pressSound: null }
      case 'thermostatArrow':
        return { act: () => this.stepTheThermostat(target.step), isDoneWithTheChosenItem: false, isAControl: true, pressSound: 'buttonClick' }
      case 'thermostatButton':
        return { act: () => this.pressTheThermostatButton(), isDoneWithTheChosenItem: false, isAControl: true, pressSound: 'buttonClick' }
      case 'faucet':
        return { act: () => this.turnTheTap(), isDoneWithTheChosenItem: false, isAControl: true, pressSound: null }
      case 'floor':
      case 'furniture':
      case 'hand':
      case 'roseBush':
      case 'medal':
      case 'settingsGear':
      case 'guideBook':
      case 'nothing':
        return null
    }
  }

  private heard(fact: HeardFact): void {
    for (const bark of this.barks.heard([fact])) this.listener.barked(bark)
  }

  private switchTheHeater(): void {
    const command: Command = isTheHeaterInUse(this.session.state.heater.mode) ? { type: 'switchHeaterOff' } : { type: 'switchHeaterOn', holdsTheThermostatsTarget: this.questions.settings().isNerdModeOn }
    this.session.dispatch(command)
  }

  private stepTheThermostat(step: 1 | -1): void {
    const thermostatTargetC = this.session.state.heater.thermostatTargetC
    const unit = this.questions.settings().temperatureUnit
    const range = definitionIn(this.catalog, 'heaters', this.session.state.heater.definitionId).thermostat
    const targetC = targetOneDegreeAway(thermostatTargetC, step, unit, range)
    if (targetC === null) return this.log(`the thermostat stays at ${degreesShownIn(unit, thermostatTargetC)} degrees ${unit}, its ${step > 0 ? 'highest' : 'lowest'}`)
    this.session.dispatch({ type: 'setTheThermostat', targetC })
  }

  private pressTheThermostatButton(): void {
    this.session.dispatch({ type: isTheThermostatWorking(this.session.state.heater.mode) ? 'stopTheThermostat' : 'startTheThermostat' })
  }

  private repeatTheHeldArrow(press: Press): void {
    const target = press.target
    if (target.kind !== 'thermostatArrow' || press.hasMovedAway || this.view.kind !== 'closeUp') return
    const stepsDue = stepsDueWhileAnArrowIsHeld(press.heldSeconds)
    while (press.repeatedSteps < stepsDue) {
      press.repeatedSteps += 1
      this.stepTheThermostat(target.step)
    }
  }

  private playerMovedTo(furnitureId: FurnitureId | null, byWalkingFreely: boolean): void {
    if (this.modeState.kind === 'aiming') this.pourDone()
    this.isSeated = false
    this.session.dispatch({ type: 'standAt', placeId: furnitureId })
    if (furnitureId !== null && !byWalkingFreely) this.sitDownAtTheRitualPlace('after walking to it')
  }

  private touchItem(itemId: string): void {
    if (this.chosenItemId() === spoonItemId) return this.useTheSpoonOn(itemId)
    const chosenItemId = this.chosenItemId()
    if (chosenItemId !== null) this.log(`tap on the body of ${itemId} with ${chosenItemId} chosen takes ${itemId}: a pour is aimed by a tap on its lid or its opening`)
    this.pickUpAndChoose(itemId)
  }

  private touchTheOpeningOf(itemId: string): void {
    const chosenItemId = this.chosenItemId()
    if (chosenItemId !== null && chosenItemId !== spoonItemId) this.log(`no pour aimed from ${chosenItemId} at ${itemId}: ${whyNoPourCanBeAimed(this.session.state, this.chosenItemId(), itemId)}`)
    this.touchItem(itemId)
  }

  private pickUpAndChoose(itemId: string): void {
    const events = this.session.dispatch({ type: 'pickUp', itemId })
    if (events.some((event) => event.type === 'actionRefused' && event.reason === 'handsFull')) return this.tapWithFullHands(itemId)
    const pickedUp = events.find((event) => event.type === 'pickedUp')
    if (pickedUp === undefined) return
    this.choice = pickedUp.handIndex
    this.log(`chose ${itemId} in hand ${pickedUp.handIndex} as it was picked up`)
  }

  private startAimingAt(targetId: string): void {
    const closeUp = this.closeUpInView
    if (closeUp === null) return this.log(`no pour to aim at ${targetId}: no close-up is in view`)
    const pour = aimAPour({ session: this.session, catalog: this.catalog, layout: this.layout, log: this.log, sourceId: this.chosenItemId(), targetId, spoutDirection: this.questions.screenRightOnTheFloor() ?? screenRightOnTheFloor(closeUp) })
    if (pour !== null) this.modeState = { kind: 'aiming', pour }
  }

  private returnTheAimedVesselToItsHand(target: TapTarget): void {
    this.log(`tap on ${describeTarget(target)} while aiming returns the vessel to its hand`)
    this.pourDone()
  }

  private letGoOfTheChoiceAfterTheAim(): void {
    if (this.choice === null) return
    this.log(`the vessel stays in hand ${this.choice}, which is no longer chosen, as after any end of an aim`)
    this.choice = null
  }

  private putTheChosenItemInTheSink(): void {
    const itemId = this.chosenItemId()
    if (itemId === null) return this.log('tap on the sink ignored: no hand is chosen')
    this.letGoOfTheChoiceUnlessRefused(this.session.dispatch({ type: 'putInTheSink', itemId }))
  }

  private turnTheTap(): void {
    this.session.dispatch({ type: this.session.state.sink.runningWater === null ? 'turnTheTapOn' : 'turnTheTapOff' })
  }

  private useTheSpoonOn(itemId: string): void {
    if (this.session.isACaddy(itemId)) {
      this.session.dispatch({ type: 'scoopTea', caddyId: itemId, depth: fullSpoonDepth })
      return
    }
    const isSomethingToTip = totalLeafGrams(this.session.state.spoon.gramsByTeaId) > 0 && this.session.state.vessels[itemId] !== undefined
    if (!isSomethingToTip) return this.pickUpAndChoose(itemId)
    this.session.dispatch({ type: 'tipSpoonInto', vesselId: itemId })
  }

  private toggleLidOf(itemId: string): void {
    const vesselId = itemId
    this.session.dispatch({ type: this.session.state.vessels[vesselId]?.isLidOpen === true ? 'closeVesselLid' : 'openVesselLid', vesselId })
  }

  private offerTheChosenCupTo(figurineId: string): void {
    const cupId = this.chosenItemId()
    if (cupId === null) return this.log(`tap on ${figurineId} ignored: no hand is chosen`)
    this.letGoOfTheChoiceUnlessRefused(this.session.dispatch({ type: 'offerCup', cupId, figurineId }))
  }

  private chooseHand(choice: HandIndex | null, tappedHandIndex: HandIndex): void {
    this.choice = choice
    this.log(choice === null ? `hand ${tappedHandIndex} let go of the choice` : `chose ${itemIdInHand(this.session.state, choice)} in hand ${choice}`)
  }

  private putDownTheChosenItemAt(furnitureId: FurnitureId, point: WorldPoint): void {
    const itemId = this.chosenItemId()
    if (itemId === null) return this.log(`tap on the ${furnitureId} ignored: no hand is chosen`)
    const closeUp = this.closeUpInView
    const spot: Spot = closeUp === null ? { placeId: furnitureId, x: point.x, y: point.y, z: point.z } : { placeId: furnitureId, x: point.x, y: point.y, z: point.z, turnRadians: turnFacingTheCameraOf(closeUp) }
    const refusal = whyThereIsNoRoomFor(itemId, spot, this.session.state, { layout: this.layout, heaterSpot: this.heaterSpot() }, this.lyingLids)
    if (refusal !== null) {
      this.log(`no room for ${itemId} at (${point.x.toFixed(2)}, ${point.z.toFixed(2)}) on the ${furnitureId}: ${refusal}`)
      return this.heard({ kind: 'noRoomToPutDown', itemId })
    }
    const events = this.session.dispatch({ type: 'putDown', itemId, spot })
    this.letGoOfTheChoiceUnlessRefused(events)
    if (this.session.state.cloths[itemId]?.location.kind === 'onSurface') this.clothOnTheTable.putDown(itemId, furnitureId, point)
    if (furnitureId === 'shelf') this.heard({ kind: 'putOnTheShelf', itemId, isEverythingOnTheShelf: this.isEverythingOnTheShelf() })
  }

  private isEverythingOnTheShelf(): boolean {
    const state = this.session.state
    return carriedItemIdsIn(state).every((itemId) => {
      const location = itemLocationIn(state, itemId)
      return location === undefined || location.kind === 'gone' || (location.kind === 'onSurface' && location.spot.placeId === 'shelf')
    })
  }

  private letGoOfTheChoiceUnlessRefused(events: readonly TeaEvent[]): void {
    if (events.some((event) => event.type === 'actionRefused')) return this.log(`hand ${this.chosenHandIndex} stays chosen after the refusal`)
    this.choice = null
  }

  private putTheChosenItemOnTheHeater(): void {
    const itemId = this.chosenItemId()
    if (itemId === null) return this.log('tap on the heater ignored: no hand is chosen')
    const events = this.session.dispatch({ type: 'placeOnHeater', itemId })
    this.letGoOfTheChoiceUnlessRefused(events)
    const isKeptOff = events.some((event) => event.type === 'actionRefused' && event.reason === 'cannotSitOnHeater')
    this.heard({ kind: 'putOnTheHeater', itemId, shape: carriedShapeOf(this.session.state, itemId), isKeptOff, isTheHeaterOn: isHeating(this.session.state.heater.mode) })
  }

  private tapWithFullHands(itemId: string): void {
    const { count, isReached } = this.tapsWithFullHands.countTapOn(itemId)
    if (!isReached) return this.barkOnFullHands(itemId)
    if (!this.questions.mayGrowAMiddleHand()) {
      this.log(`${itemId} tapped ${count} times in a row with full hands, but the middle hand has been grown before, so none grows`)
      return this.barkOnFullHands(itemId)
    }
    const events = this.session.dispatch({ type: 'pickUpWithAMiddleHand', itemId })
    const pickedUp = events.find((event) => event.type === 'pickedUp')
    if (pickedUp === undefined) return this.log(`${itemId} tapped ${count} times in a row with full hands, but it could not be taken into a middle hand`)
    this.choice = pickedUp.handIndex
    this.log(`${itemId} tapped ${count} times in a row with full hands grows a middle hand, which takes it and is chosen`)
  }

  private barkOnFullHands(itemId: string): void {
    const state = this.session.state
    const holdsOnlyBowls = itemIdsInTheHands(state).slice(0, middleHandIndex).every((heldId) => heldId !== null && carriedShapeOf(state, heldId) === 'bowl')
    this.log(`${itemId} not taken: both hands are full${holdsOnlyBowls ? ' of bowls' : ''}`)
    this.heard({ kind: 'takenWithFullHands', itemId, holdsOnlyBowls })
  }

  private chosenItemId(): string | null {
    const handIndex = this.chosenHandIndex
    return handIndex === null ? null : itemIdInHand(this.session.state, handIndex)
  }

  private furnitureOf(target: TapTarget): FurnitureId | null {
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
        return this.furnitureWithPlace(definitionIn(this.catalog, 'rooms', this.session.state.roomId).tap?.sinkSpot.placeId ?? null)
      case 'item':
      case 'lid':
      case 'opening':
        return this.furnitureWithPlace(placeOf(this.locationOfItem(target.itemId)))
      case 'figurine':
        return this.ritualFurnitureId()
      case 'floor':
      case 'hand':
      case 'roseBush':
      case 'medal':
      case 'settingsGear':
      case 'guideBook':
      case 'nothing':
        return null
    }
  }

  private ritualFurnitureId(): FurnitureId | null {
    return this.furnitureWithPlace(definitionIn(this.catalog, 'rooms', this.session.state.roomId).ritualPlaceId)
  }

  private locationOfItem(itemId: string): DeepReadonly<ItemLocation> | undefined {
    return itemLocationIn(this.session.state, itemId)
  }

  private heaterSpot(): Spot {
    return definitionIn(this.catalog, 'rooms', this.session.state.roomId).heaterSpot
  }

  private furnitureWithPlace(placeId: string | null): FurnitureId | null {
    return this.layout.furniture.find((piece) => piece.id === placeId)?.id ?? null
  }
}

function describeThePress(onTheScreen: PressOnTheScreen | null): string {
  if (onTheScreen === null) return ''
  const { point, touched, areasHoldingTheFinger, areasSetAside } = onTheScreen
  const areas = areasHoldingTheFinger.length === 0 ? '' : `, in the areas of ${areasHoldingTheFinger.map(describeTarget).join(', ')}`
  const setAside = areasSetAside.map((area) => `, not in the area of ${describeTarget(area.target)}: ${whyTheAreaIsSetAside(area)}`).join('')
  return ` at (${Math.round(point.x)}, ${Math.round(point.y)}) px, touching ${describeTarget(touched)}${areas}${setAside}`
}

function whyTheAreaIsSetAside(area: AreaSetAside): string {
  switch (area.reason) {
    case 'drawnFartherThanAFingertip':
      return 'it is drawn farther than a fingertip away'
    case 'behindWhatTheFingerTouched':
      return 'it stands well behind what the finger touched'
  }
}

function turnDegreesOf(radians: number): number {
  const degrees = Math.round((radians * 180) / Math.PI) % fullTurnDegrees
  return degrees < 0 ? degrees + fullTurnDegrees : degrees
}

function placeOf(location: DeepReadonly<ItemLocation> | undefined): string | null {
  return standingSpotOf(location)?.placeId ?? null
}
