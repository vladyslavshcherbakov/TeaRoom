import { carriedItemIdsIn, definitionIn, isACloth, isHeating, isTheHeaterInUse, isTheThermostatWorking, itemIdInHand, itemIdInTheInventory, itemIdInTheSink, itemIdsInTheHands, itemLocationIn, spoonItemId, standingSpotOf, type Catalog, type Command, type DeepReadonly, type HandIndex, type InventorySlot, type ItemLocation, type TapUse, type TeaEvent, type Spot } from '../../../Shared/GameLogic/GameLogic.ts'
import { stepsDueWhileAnArrowIsHeld } from '../../Engine/HeldArrow.ts'
import { aimAPour, canAimAPour, type AimedPour, type AimedPourView } from './AimedPour.ts'
import { ItemInspection, type ItemInspectionView } from './ItemInspection.ts'
import { nearestSpotWithRoomFor, whyThereIsNoRoomFor, type LyingLids } from './Placement.ts'
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
import type { ActionKind, ActionMenuView, MenuAction } from './ActionMenu.ts'

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
  | { readonly kind: 'choosing'; readonly menu: ActionMenu }
  | { readonly kind: 'ended' }

type ActionMenu = {
  readonly at: ScreenPoint | null
  readonly actions: readonly MenuAction[]
  readonly view: ActionMenuView
}

type Input = 'press' | 'handKey' | 'handHold' | 'sip' | 'tilt' | 'whyPouring' | 'pourFinger' | 'aimingTap' | 'inspection' | 'walk' | 'kettleFill' | 'leaveFirstPerson' | 'menuAction'

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


const fullSpoonDepth = 1
const isHeardWhenPutDownOn: Readonly<Record<FurnitureId, boolean>> = { counter: false, shelf: true, teaTable: false }
const roseBushTapsThatOpenTheDebugMenu = 10
const fullTurnDegrees = 360
const freeMode: ModeState = { kind: 'free' }

const inputsTakenByMode: Readonly<Record<PlayerMode, readonly Input[]>> = {
  free: ['press', 'handKey', 'handHold', 'sip', 'walk', 'kettleFill', 'leaveFirstPerson'],
  aiming: ['tilt', 'whyPouring', 'pourFinger', 'aimingTap', 'kettleFill', 'leaveFirstPerson'],
  lookingClosely: ['inspection', 'kettleFill', 'leaveFirstPerson'],
  sipping: ['walk', 'kettleFill', 'leaveFirstPerson'],
  choosing: ['press', 'menuAction', 'kettleFill', 'leaveFirstPerson'],
  ended: ['leaveFirstPerson'],
}

const whatIsGoingOnByMode: Readonly<Record<PlayerMode, string>> = {
  free: 'nothing is going on',
  aiming: 'a pour is being aimed',
  lookingClosely: 'a held item is looked at closely',
  sipping: 'a sip is being taken',
  choosing: 'a menu of actions is open',
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

  get isSeatedAtTheRitualPlace(): boolean {
    return this.isSeated && this.isAtTheRitualPlace()
  }

  get mode(): PlayerMode {
    return this.modeState.kind
  }

  get sippableCupId(): string | null {
    return itemIdsInTheHands(this.session.state).find((itemId) => itemId !== null && this.canSipFrom(itemId)) ?? null
  }

  get actionMenuView(): ActionMenuView | null {
    return this.modeState.kind === 'choosing' ? this.modeState.menu.view : null
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

  doesATapReachPastTheHands(target: TapTarget): boolean {
    return this.view.kind === 'closeUp' && this.closeUpActionOn(target, null) !== null
  }

  pressStarted(target: TapTarget, onTheScreen: PressOnTheScreen | null): void {
    if (this.isRefusedByTheMode('press', `press on ${describeTarget(target)}`)) return
    const stroke = this.modeState.kind === 'choosing' ? null : this.clothOnTheTable.strokeStartingAt(this.heldClothId(), onTheScreen?.touched ?? target)
    this.press = { target, onTheScreen, heldSeconds: 0, hasMovedAway: false, stroke, repeatedSteps: 0 }
  }

  actionChosen(index: number): void {
    if (this.isRefusedByTheMode('menuAction', `action ${index} of the menu`) || this.modeState.kind !== 'choosing') return
    const action = this.modeState.menu.actions[index]
    this.modeState = freeMode
    if (action === undefined) return this.log(`action ${index} of the menu does nothing: the menu has no such action`)
    this.log(`the menu's action ${action.label.kind} with ${action.label.item}${action.label.target === null ? '' : ` on ${action.label.target}`} is chosen`)
    action.act()
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
    this.log(`the pour from ${this.modeState.pour.view.sourceId} is done, and the vessel goes back to its hand`)
    this.endTheAim()
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
        return this.take(target.itemId)
      case 'surface':
        this.log(`tap on the ${target.furnitureId} while aiming puts the vessel down there`)
        this.endTheAim()
        return this.putDownAt(sourceId, target.furnitureId, target.point)
      case 'sink':
        this.log('tap on the sink while aiming puts the vessel in the sink')
        this.endTheAim()
        if (this.session.state.sink.runningWater === null) return this.putInTheSink(sourceId, null)
        return this.openTheMenu(this.tapUseActions(sourceId, (use) => this.putInTheSink(sourceId, use)), null, 'the sink')
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
      case 'inventorySlot':
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
    this.log(`inspecting ${itemId} from hand ${handIndex} after a hold of ${heldSeconds.toFixed(1)} s`)
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
    this.log(`inspecting ${view.itemId} ended by a tap on ${describeTarget(target)}, turned ${turnDegreesOf(view.yawRadians)}° across and ${turnDegreesOf(view.pitchRadians)}° over at ${view.magnification.toFixed(2)} times its size`)
  }

  screenButtonPressed(button: ScreenButton): void {
    switch (button) {
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
      case 'whyPouring':
      case 'leaveFirstPerson':
        return this.log(`the ${button} button is let go, which changes nothing`)
    }
  }

  sipTapped(): void {
    if (this.isRefusedByTheMode('sip', 'sip')) return
    const cupId = this.sippableCupId
    if (cupId === null) return this.log('sip ignored: no hand holds something to sip from')
    this.sipFrom(cupId)
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

  firstPersonLookTurned(headingRadians: number): void {
    this.navigator.faceTheLook(headingRadians)
  }

  mouseMovedOverTheFloor(point: FloorPoint): void {
    this.navigator.turnTowards(point)
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

  private sipFrom(cupId: string): void {
    const volumeBeforeMl = this.session.state.vessels[cupId]?.liquid.volumeMl ?? 0
    const events = this.session.dispatch({ type: 'tasteCup', cupId })
    if (events.some((event) => event.type === 'teaTasted')) this.raiseToTheLips(cupId, volumeBeforeMl)
    if (!events.some((event) => event.type === 'playerDied')) return
    this.log(`the sip from ${cupId} killed the player, so the room shows it and takes no more input`)
    this.modeState = { kind: 'ended' }
    this.listener.playerDied()
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
    this.log(`tap on ${describeTarget(target)}${describeThePress(onTheScreen)}, holding ${describeTheItems(itemIdsInTheHands(this.session.state))}`)
    if (this.modeState.kind === 'choosing') return this.closeTheMenu(`the tap on ${describeTarget(target)} falls outside it`)
    if (!this.roseBushTaps.isCounting(describeTarget(target))) this.roseBushTaps.startAgainAfterAnotherTap()
    const action = this.tapActionOn(target, onTheScreen?.point ?? null)
    if (action.pressSound !== null) this.listener.soundStarted(action.pressSound)
    action.act()
  }

  private tapActionOn(target: TapTarget, at: ScreenPoint | null): TapAction {
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
        return { act: () => this.openTheMenu(this.handActions(target.handIndex), at, `hand ${target.handIndex}`), pressSound: null }
      case 'inventorySlot':
        return { act: () => this.openTheMenu(this.inventoryActions(target.slotIndex), at, `place ${target.slotIndex} of the inventory`), pressSound: null }
      case 'lid':
        return this.lidAction(target, at)
      case 'figurine':
        return { act: () => this.keepTheSillForTheRoom(target.figurineId), pressSound: null }
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
        return this.actionWhereThePlayerStands(target, at)
    }
  }

  private achievementsAction(): TapAction {
    if (!this.questions.settings().areAchievementsShown) return { act: () => this.log('the tap on the medal does nothing, because achievements are hidden in the settings and the medal with them'), pressSound: null }
    return { act: () => this.openTheAchievements(), pressSound: 'buttonClick' }
  }

  private lidAction(target: Extract<TapTarget, { readonly kind: 'lid' }>, at: ScreenPoint | null): TapAction {
    const location = itemLocationIn(this.session.state, target.itemId)
    if (location?.kind !== 'inHand') return this.actionWhereThePlayerStands(target, at)
    if (this.session.state.vessels[target.itemId]?.isLidOpen === true) return { act: () => this.closeTheLidOf(target.itemId), pressSound: null }
    return { act: () => this.openTheMenu(this.handActions(location.handIndex), at, `hand ${location.handIndex}`), pressSound: null }
  }

  private actionWhereThePlayerStands(target: TapTarget, at: ScreenPoint | null): TapAction {
    const closeUpFurnitureId = this.furnitureInTheCloseUp()
    const targetFurnitureId = this.furnitureOf(target)
    if (closeUpFurnitureId === null || targetFurnitureId !== closeUpFurnitureId) return { act: () => this.navigate(target, targetFurnitureId), pressSound: null }
    const action = this.closeUpActionOn(target, at)
    if (action === null) return { act: () => this.log(`tap on ${describeTarget(target)} in the close-up does nothing`), pressSound: null }
    return {
      act: () => {
        this.sitDownAtTheRitualPlace(`to act on ${describeTarget(target)}`)
        action.act()
      },
      pressSound: action.pressSound,
    }
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
    this.log(`tap on ${figurineId} leaves the player in place: it stands on the sill and takes no tea`)
    this.heard({ kind: 'figurineTapped', figurineId })
  }

  private navigate(target: TapTarget, targetFurnitureId: FurnitureId | null): void {
    if (targetFurnitureId !== null) this.navigator.tapped({ kind: 'furniture', furnitureId: targetFurnitureId })
    else if (target.kind === 'floor') this.navigator.tapped(target)
    else this.navigator.tapped({ kind: 'nothing' })
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

  private closeUpActionOn(target: TapTarget, at: ScreenPoint | null): TapAction | null {
    switch (target.kind) {
      case 'item':
      case 'opening':
        return { act: () => this.openTheMenu(this.itemActions(target.itemId), at, target.itemId), pressSound: null }
      case 'lid':
        if (this.session.state.vessels[target.itemId]?.isLidOpen === true) return { act: () => this.closeTheLidOf(target.itemId), pressSound: null }
        return { act: () => this.openTheMenu(this.itemActions(target.itemId), at, target.itemId), pressSound: null }
      case 'surface':
        return this.menuActionOf(this.surfaceActions(target.furnitureId, target.point), at, `the ${target.furnitureId}`)
      case 'heater':
        return this.menuActionOf(this.heaterActions(), at, 'the heater')
      case 'sink':
        return this.menuActionOf(this.sinkActions(), at, 'the sink')
      case 'faucet':
        return this.faucetAction(at)
      case 'heaterSwitch':
        return { act: () => this.switchTheHeater(), pressSound: 'buttonClick' }
      case 'heaterPanel':
        return { act: () => this.log('tap on the heater panel between its controls does nothing'), pressSound: null }
      case 'thermostatArrow':
        return { act: () => this.stepTheThermostat(target.step), pressSound: 'buttonClick' }
      case 'thermostatButton':
        return { act: () => this.pressTheThermostatButton(), pressSound: 'buttonClick' }
      case 'floor':
      case 'furniture':
      case 'hand':
      case 'inventorySlot':
      case 'figurine':
      case 'roseBush':
      case 'medal':
      case 'settingsGear':
      case 'guideBook':
      case 'nothing':
        return null
    }
  }

  private menuActionOf(actions: readonly MenuAction[], at: ScreenPoint | null, about: string): TapAction | null {
    return actions.length === 0 ? null : { act: () => this.openTheMenu(actions, at, about), pressSound: null }
  }

  private faucetAction(at: ScreenPoint | null): TapAction {
    const sink = this.session.state.sink
    const itemIdUnderTheTap = itemIdInTheSink(this.session.state)
    if (sink.runningWater !== null) return { act: () => this.session.dispatch({ type: 'turnTheTapOff' }), pressSound: null }
    if (itemIdUnderTheTap === null) return { act: () => this.session.dispatch({ type: 'turnTheTapOn' }), pressSound: null }
    return { act: () => this.openTheMenu(this.tapUseActions(itemIdUnderTheTap, (use) => this.turnTheTapOnOver(itemIdUnderTheTap, use)), at, 'the tap'), pressSound: null }
  }

  private openTheMenu(actions: readonly MenuAction[], at: ScreenPoint | null, about: string): void {
    if (actions.length === 0) return this.log(`no menu opens on ${about}: nothing can be done with it now`)
    this.modeState = { kind: 'choosing', menu: { at, actions, view: { at, labels: actions.map((action) => action.label) } } }
    this.log(`a menu opens on ${about} with ${actions.map((action) => action.label.kind).join(', ')}`)
  }

  private closeTheMenu(reason: string): void {
    this.modeState = freeMode
    this.log(`the menu closes with nothing chosen: ${reason}`)
  }

  private handActions(handIndex: HandIndex): readonly MenuAction[] {
    const itemId = itemIdInHand(this.session.state, handIndex)
    if (itemId === null) return []
    return [
      ...this.actionIf(this.canPutAway(itemId), 'putAway', itemId, null, () => this.putAway(itemId)),
      ...this.openTheLidActionOn(itemId),
      ...this.actionIf(this.canSipFrom(itemId), 'sip', itemId, null, () => this.sipFrom(itemId)),
    ]
  }

  private inventoryActions(slotIndex: InventorySlot): readonly MenuAction[] {
    const itemId = itemIdInTheInventory(this.session.state, slotIndex)
    return itemId === null ? [] : this.actionIf(true, 'take', itemId, null, () => this.take(itemId))
  }

  private itemActions(itemId: string): readonly MenuAction[] {
    const isInAHand = itemLocationIn(this.session.state, itemId)?.kind === 'inHand'
    return [
      ...this.actionIf(!isInAHand, 'take', itemId, null, () => this.take(itemId)),
      ...this.actionIf(this.canPutAway(itemId), 'putAway', itemId, null, () => this.putAway(itemId)),
      ...this.openTheLidActionOn(itemId),
      ...this.heldItemIds().filter((heldId) => heldId !== itemId).flatMap((heldId) => this.actionsOfAHeldItemOn(heldId, itemId)),
    ]
  }

  private openTheLidActionOn(itemId: string): readonly MenuAction[] {
    if (this.session.state.vessels[itemId] === undefined) return []
    const refusal = this.session.wouldRefuse([{ type: 'openVesselLid', vesselId: itemId }])
    return this.actionIf(refusal === null || refusal.reason === 'tooHotToHold', 'openTheLid', itemId, null, () => this.session.dispatch({ type: 'openVesselLid', vesselId: itemId }))
  }

  private actionsOfAHeldItemOn(heldId: string, itemId: string): readonly MenuAction[] {
    if (heldId === spoonItemId) return this.spoonActionsOn(itemId)
    return this.actionIf(canAimAPour(this.session.state, heldId, itemId), 'pourInto', heldId, itemId, () => this.startAimingAt(heldId, itemId))
  }

  private spoonActionsOn(itemId: string): readonly MenuAction[] {
    if (this.session.isACaddy(itemId)) {
      const scoop: Command = { type: 'scoopTea', caddyId: itemId, depth: fullSpoonDepth }
      return this.actionIf(this.session.wouldRefuse([scoop]) === null, 'scoopFrom', spoonItemId, itemId, () => this.session.dispatch(scoop))
    }
    const tip: Command = { type: 'tipSpoonInto', vesselId: itemId }
    return this.actionIf(this.session.wouldRefuse([tip]) === null, 'tipLeavesInto', spoonItemId, itemId, () => this.session.dispatch(tip))
  }

  private surfaceActions(furnitureId: FurnitureId, point: WorldPoint): readonly MenuAction[] {
    return this.heldItemIds().flatMap((heldId) => this.actionIf(true, 'putDownHere', heldId, null, () => this.putDownAt(heldId, furnitureId, point)))
  }

  private heaterActions(): readonly MenuAction[] {
    return this.heldItemIds().flatMap((heldId) => {
      const refusal = this.session.wouldRefuse([{ type: 'placeOnHeater', itemId: heldId }])
      return this.actionIf(refusal === null || refusal.reason === 'cannotSitOnHeater', 'putOnTheHeater', heldId, null, () => this.putOnTheHeater(heldId))
    })
  }

  private sinkActions(): readonly MenuAction[] {
    const state = this.session.state
    const itemIdUnderTheTap = itemIdInTheSink(state)
    if (itemIdUnderTheTap !== null) return state.sink.runningWater === null ? this.tapUseActions(itemIdUnderTheTap, (use) => this.turnTheTapOnOver(itemIdUnderTheTap, use)) : []
    return this.heldItemIds()
      .filter((heldId) => this.session.wouldRefuse([{ type: 'putInTheSink', itemId: heldId }]) === null)
      .flatMap((heldId) => (state.sink.runningWater === null ? this.actionIf(true, 'putInTheSink', heldId, null, () => this.putInTheSink(heldId, null)) : this.tapUseActions(heldId, (use) => this.putInTheSink(heldId, use))))
  }

  private tapUseActions(itemId: string, runTheTap: (use: TapUse) => void): readonly MenuAction[] {
    return [...this.actionIf(this.session.state.vessels[itemId] !== undefined, 'fillWithWater', itemId, null, () => runTheTap('fill')), ...this.actionIf(true, 'wash', itemId, null, () => runTheTap('wash'))]
  }

  private actionIf(isOffered: boolean, kind: ActionKind, itemId: string, targetId: string | null, act: () => void): readonly MenuAction[] {
    if (!isOffered) return []
    const item = carriedShapeOf(this.session.state, itemId)
    const target = targetId === null ? null : carriedShapeOf(this.session.state, targetId)
    if (item === undefined || target === undefined) {
      this.log(`the action ${kind} with ${itemId}${targetId === null ? '' : ` on ${targetId}`} is not offered: the room knows no shape for it`, 'error')
      return []
    }
    return [{ label: { kind, item, target }, act }]
  }

  private heldItemIds(): readonly string[] {
    return itemIdsInTheHands(this.session.state).filter((itemId) => itemId !== null)
  }

  private heldClothId(): string | null {
    return this.heldItemIds().find((itemId) => isACloth(this.session.state, itemId)) ?? null
  }

  private canPutAway(itemId: string): boolean {
    return this.session.wouldRefuse([{ type: 'putAway', itemId }]) === null
  }

  private canSipFrom(itemId: string): boolean {
    return this.session.wouldRefuse([{ type: 'tasteCup', cupId: itemId }]) === null
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
    if (this.modeState.kind === 'choosing') this.closeTheMenu('the player moved')
    this.isSeated = false
    this.session.dispatch({ type: 'standAt', placeId: furnitureId })
    if (furnitureId !== null && !byWalkingFreely) this.sitDownAtTheRitualPlace('after walking to it')
  }

  private take(itemId: string): void {
    const events = this.session.dispatch({ type: 'pickUp', itemId })
    if (events.some((event) => event.type === 'actionRefused' && event.reason === 'handsFull')) this.barkOnFullHands(itemId)
  }

  private putAway(itemId: string): void {
    this.session.dispatch({ type: 'putAway', itemId })
  }

  private startAimingAt(sourceId: string, targetId: string): void {
    const closeUp = this.closeUpInView
    if (closeUp === null) return this.log(`no pour to aim at ${targetId}: no close-up is in view`)
    const pour = aimAPour({ session: this.session, catalog: this.catalog, layout: this.layout, log: this.log, sourceId, targetId, spoutDirection: this.questions.screenRightOnTheFloor() ?? screenRightOnTheFloor(closeUp) })
    if (pour !== null) this.modeState = { kind: 'aiming', pour }
  }

  private returnTheAimedVesselToItsHand(target: TapTarget): void {
    this.log(`tap on ${describeTarget(target)} while aiming returns the vessel to its hand`)
    this.pourDone()
  }

  private putInTheSink(itemId: string, use: TapUse | null): void {
    const events = this.session.dispatch(use === null ? { type: 'putInTheSink', itemId } : { type: 'putInTheSink', itemId, use })
    if (use !== null && !events.some((event) => event.type === 'actionRefused')) this.openTheLidForTheTap(itemId)
  }

  private turnTheTapOnOver(itemId: string, use: TapUse): void {
    this.openTheLidForTheTap(itemId)
    this.session.dispatch({ type: 'turnTheTapOn', use })
  }

  private openTheLidForTheTap(itemId: string): void {
    const vessel = this.session.state.vessels[itemId]
    if (vessel === undefined || vessel.isLidOpen || definitionIn(this.catalog, 'vessels', vessel.definitionId).lid === null) return
    this.log(`the lid of ${itemId} is opened for the tap's water`)
    this.session.dispatch({ type: 'openVesselLid', vesselId: itemId })
  }

  private toggleLidOf(itemId: string): void {
    const vesselId = itemId
    this.session.dispatch({ type: this.session.state.vessels[vesselId]?.isLidOpen === true ? 'closeVesselLid' : 'openVesselLid', vesselId })
  }

  private closeTheLidOf(itemId: string): void {
    this.log(`tap on the open lid of ${itemId} closes it, with no menu`)
    this.session.dispatch({ type: 'closeVesselLid', vesselId: itemId })
  }

  private putDownAt(itemId: string, furnitureId: FurnitureId, point: WorldPoint): void {
    const closeUp = this.closeUpInView
    const tappedSpot: Spot = closeUp === null ? { placeId: furnitureId, x: point.x, y: point.y, z: point.z } : { placeId: furnitureId, x: point.x, y: point.y, z: point.z, turnRadians: turnFacingTheCameraOf(closeUp) }
    const surroundings = { layout: this.layout, heaterSpot: this.heaterSpot() }
    const spot = nearestSpotWithRoomFor(itemId, tappedSpot, this.session.state, surroundings, this.lyingLids)
    if (spot === null) {
      this.log(`no room for ${itemId} at (${point.x.toFixed(2)}, ${point.z.toFixed(2)}) on the ${furnitureId} or near it: ${whyThereIsNoRoomFor(itemId, tappedSpot, this.session.state, surroundings, this.lyingLids)}`)
      return this.heard({ kind: 'noRoomToPutDown', itemId })
    }
    if (spot !== tappedSpot) this.log(`no room for ${itemId} at (${point.x.toFixed(2)}, ${point.z.toFixed(2)}) on the ${furnitureId}, so it goes to the snuggest free spot nearby, (${spot.x.toFixed(2)}, ${spot.z.toFixed(2)})`)
    this.session.dispatch({ type: 'putDown', itemId, spot })
    if (this.session.state.cloths[itemId]?.location.kind === 'onSurface') this.clothOnTheTable.putDown(itemId, furnitureId, { x: spot.x, y: spot.y, z: spot.z })
    if (isHeardWhenPutDownOn[furnitureId]) this.heard({ kind: 'putOnTheShelf', itemId, isEverythingOnTheShelf: this.isEverythingOnTheShelf() })
  }

  private isEverythingOnTheShelf(): boolean {
    const state = this.session.state
    return carriedItemIdsIn(state).every((itemId) => {
      const location = itemLocationIn(state, itemId)
      return location === undefined || location.kind === 'gone' || (location.kind === 'onSurface' && location.spot.placeId === 'shelf')
    })
  }

  private putOnTheHeater(itemId: string): void {
    const events = this.session.dispatch({ type: 'placeOnHeater', itemId })
    const isKeptOff = events.some((event) => event.type === 'actionRefused' && event.reason === 'cannotSitOnHeater')
    this.heard({ kind: 'putOnTheHeater', itemId, shape: carriedShapeOf(this.session.state, itemId), isKeptOff, isTheHeaterOn: isHeating(this.session.state.heater.mode) })
  }

  private barkOnFullHands(itemId: string): void {
    const state = this.session.state
    const holdsOnlyBowls = itemIdsInTheHands(state).every((heldId) => heldId !== null && carriedShapeOf(state, heldId) === 'bowl')
    this.log(`${itemId} not taken: both hands are full${holdsOnlyBowls ? ' of bowls' : ''}`)
    this.heard({ kind: 'takenWithFullHands', itemId, holdsOnlyBowls })
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
      case 'inventorySlot':
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

function describeTheItems(itemIds: readonly (string | null)[]): string {
  return itemIds.filter((itemId) => itemId !== null).join(' and ') || 'nothing'
}

function placeOf(location: DeepReadonly<ItemLocation> | undefined): string | null {
  return standingSpotOf(location)?.placeId ?? null
}
