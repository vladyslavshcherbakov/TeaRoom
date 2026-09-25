import assert from 'node:assert/strict'
import test from 'node:test'
import { CameraZoom } from '../../../Apps/Game/Room/Camera/CameraZoom.ts'
import { RoomGestures, type ScreenPoint } from '../../../Apps/Game/Room/RoomGestures.ts'
import { RoomPlay, type RoomTapTarget } from '../../../Apps/Game/Room/RoomPlay.ts'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import type { HandIndex } from '../../../Shared/Simulation/State/SessionState.ts'
import { assertNear } from '../../Support/Assertions.ts'
import { TestRitual } from '../../Support/TestRitual.ts'
import { quietRoomLayout, type FurnitureId } from '../../../Apps/Game/Room/RoomLayout.ts'

const frameSeconds = 1 / 8
const longestWalkSeconds = 30
const onTheFirstHand: ScreenPoint = { x: 60, y: 780 }
const onTheSecondHand: ScreenPoint = { x: 330, y: 780 }
const onTheFirstHandsLid: ScreenPoint = { x: 60, y: 700 }
const inTheMiddle: ScreenPoint = { x: 195, y: 420 }
const nearTheTop: ScreenPoint = { x: 195, y: 100 }
const startingPitchRadians = 0.55

test('heldItem_whenPressedStillForOneSecond_isInspected', () => {
  const room = new InspectingRoom()
  room.gestures.fingerDown(1, onTheFirstHand)

  room.holdFor(1)

  assert.equal(room.play.inspectionView?.itemId, 'bowl1')
})

test('heldKettle_whenItsLidIsPressedStillForOneSecond_isInspected', () => {
  const room = new InspectingRoom('counter', ['kettle'])
  room.gestures.fingerDown(1, onTheFirstHandsLid)

  room.holdFor(1)

  assert.equal(room.play.inspectionView?.itemId, 'kettle')
})

test('heldItem_whenReleasedBeforeOneSecond_isNotInspectedAndItsHandIsChosenAsByATap', () => {
  const room = new InspectingRoom()
  room.gestures.fingerDown(1, onTheFirstHand)
  room.holdFor(0.875)

  room.gestures.fingerUp(1)

  assert.equal(room.play.inspectionView, null)
  assert.equal(room.play.chosenHandIndex, 0)
})

test('heldItem_whenTheFingerDriftsTwelvePixelsWhileHeld_isInspected', () => {
  const room = new InspectingRoom()
  room.gestures.fingerDown(1, onTheFirstHand)
  room.gestures.fingerMoved(1, { x: onTheFirstHand.x + 12, y: onTheFirstHand.y })

  room.holdFor(1)

  assert.equal(room.play.inspectionView?.itemId, 'bowl1')
})

test('heldItem_whenTheFingerMovesThirteenPixelsWhileHeld_isNotInspected', () => {
  const room = new InspectingRoom()
  room.gestures.fingerDown(1, onTheFirstHand)
  room.gestures.fingerMoved(1, { x: onTheFirstHand.x + 13, y: onTheFirstHand.y })

  room.holdFor(1)

  assert.equal(room.play.inspectionView, null)
})

test('heldItem_whenASecondFingerTouchesWhileHeld_isNotInspected', () => {
  const room = new InspectingRoom()
  room.gestures.fingerDown(1, onTheFirstHand)
  room.gestures.fingerDown(2, nearTheTop)

  room.holdFor(1)

  assert.equal(room.play.inspectionView, null)
})

test('pressThatInspects_whenTheFingerLifts_isNotATapAndChoosesNoHand', () => {
  const room = new InspectingRoom()
  room.gestures.fingerDown(1, onTheSecondHand)
  room.holdFor(1)

  room.gestures.fingerUp(1)

  assert.equal(room.play.inspectionView?.itemId, 'bowl2')
  assert.equal(room.play.chosenHandIndex, null)
})

test('inspection_ofTheChosenHand_whenLeft_leavesThatHandChosen', () => {
  const room = new InspectingRoom()
  room.tapOn(onTheFirstHand)
  room.inspect(onTheFirstHand)

  room.tapOn(nearTheTop)

  assert.equal(room.play.inspectionView, null)
  assert.equal(room.play.chosenHandIndex, 0)
})

test('inspection_ofAnUnchosenHand_whenLeft_leavesTheOtherHandChosen', () => {
  const room = new InspectingRoom()
  room.tapOn(onTheSecondHand)
  room.inspect(onTheFirstHand)

  room.tapOn(nearTheTop)

  assert.equal(room.play.inspectionView, null)
  assert.equal(room.play.chosenHandIndex, 1)
})

test('inspection_whenTappedOutsideTheItem_endsWithoutTheTapReachingTheRoom', () => {
  const room = new InspectingRoom()
  room.inspect(onTheFirstHand)

  room.tapOn(nearTheTop)

  assert.equal(room.play.inspectionView, null)
  assert.deepEqual(room.play.view, { kind: 'closeUp', furnitureId: 'shelf' })
  assert.deepEqual(room.ritual.state.keeper.hands, ['bowl1', 'bowl2', null])
})

test('inspection_whenTheOtherHeldItemIsTapped_endsWithoutChoosingItsHand', () => {
  const room = new InspectingRoom()
  room.inspect(onTheFirstHand)

  room.tapOn(onTheSecondHand)

  assert.equal(room.play.inspectionView, null)
  assert.equal(room.play.chosenHandIndex, null)
})

test('inspection_whenTheInspectedItemIsTapped_goesOn', () => {
  const room = new InspectingRoom()
  room.inspect(onTheFirstHand)

  room.tapOn(inTheMiddle)

  assert.equal(room.play.inspectionView?.itemId, 'bowl1')
})

test('inspectedItem_whenDraggedAHundredPixelsAcross_turnsOneRadianAroundItself', () => {
  const room = new InspectingRoom()
  room.inspect(onTheFirstHand)

  room.drag(inTheMiddle, { x: inTheMiddle.x + 100, y: inTheMiddle.y })

  assertNear(room.play.inspectionView?.yawRadians ?? Number.NaN, 1)
  assertNear(room.play.inspectionView?.pitchRadians ?? Number.NaN, startingPitchRadians)
})

test('inspectedItem_whenTheHoldingFingerDragsFiftyPixelsDown_tipsHalfARadianTowardsTheViewer', () => {
  const room = new InspectingRoom()
  room.gestures.fingerDown(1, onTheFirstHand)
  room.holdFor(1)

  room.gestures.fingerMoved(1, { x: onTheFirstHand.x, y: onTheFirstHand.y + 50 })

  assertNear(room.play.inspectionView?.pitchRadians ?? Number.NaN, startingPitchRadians + 0.5)
})

test('inspectedItem_whenPinchedToTwiceTheFingerGap_isShownTwiceAsLargeAndTheCameraStays', () => {
  const room = new InspectingRoom()
  room.inspect(onTheFirstHand)

  room.pinch(100, 200)

  assertNear(room.play.inspectionView?.magnification ?? Number.NaN, 2)
  assert.equal(room.zoom.distanceShare, 1)
  assert.equal(room.play.inspectionView?.itemId, 'bowl1')
})

test('inspectedItem_whenPinchedToTenTimesTheFingerGap_growsToThreeTimesItsSize', () => {
  const room = new InspectingRoom()
  room.inspect(onTheFirstHand)

  room.pinch(30, 300)

  assertNear(room.play.inspectionView?.magnification ?? Number.NaN, 3)
})

test('inspectedItem_whenPinchedToATenthOfTheFingerGap_shrinksToSixTenthsOfItsSize', () => {
  const room = new InspectingRoom()
  room.inspect(onTheFirstHand)

  room.pinch(300, 30)

  assertNear(room.play.inspectionView?.magnification ?? Number.NaN, 0.6)
})

test('inspectedItem_whenTheWheelTurnsFarUp_growsToThreeTimesItsSizeAndTheCameraStays', () => {
  const room = new InspectingRoom()
  room.inspect(onTheFirstHand)

  room.gestures.wheelTurned(-2000)

  assertNear(room.play.inspectionView?.magnification ?? Number.NaN, 3)
  assert.equal(room.zoom.distanceShare, 1)
})

class InspectingRoom {
  readonly logLines: string[] = []
  readonly ritual = TestRitual.begun(defaultCatalog, 'sencha', 'quietRoom')
  readonly play = new RoomPlay(this.ritual.session, defaultCatalog, quietRoomLayout, (line) => this.logLines.push(line), 4, { remarked: () => {}, debugMenuAsked: () => {}, achievementsAsked: () => {}, settingsAsked: () => {}, mayGrowAMiddleHand: () => true, keeperDied: () => {} })
  readonly zoom = new CameraZoom()
  readonly gestures = new RoomGestures(this.play, this.zoom, { tapTargetAt: (point) => this.tapTargetAt(point), aimPointAt: () => ({ x: 0, z: 0 }) }, (line) => this.logLines.push(line))

  constructor(furnitureId: FurnitureId = 'shelf', itemIdsToHold: readonly string[] = ['bowl1', 'bowl2']) {
    this.walkTo(furnitureId)
    for (const itemId of itemIdsToHold) this.ritual.session.dispatch({ type: 'pickUp', itemId })
  }

  holdFor(seconds: number): void {
    for (let heldSeconds = 0; heldSeconds < seconds; heldSeconds += frameSeconds) this.gestures.advance(frameSeconds)
  }

  inspect(point: ScreenPoint): void {
    this.gestures.fingerDown(1, point)
    this.holdFor(1)
    this.gestures.fingerUp(1)
    if (this.play.inspectionView === null) throw new Error(`nothing is inspected after a hold at (${point.x}, ${point.y}):\n${this.logLines.join('\n')}`)
  }

  tapOn(point: ScreenPoint): void {
    this.gestures.fingerDown(1, point)
    this.gestures.fingerUp(1)
  }

  drag(from: ScreenPoint, to: ScreenPoint): void {
    this.gestures.fingerDown(1, from)
    this.gestures.fingerMoved(1, to)
    this.gestures.fingerUp(1)
  }

  pinch(fingerGapAtStart: number, fingerGapAtTheEnd: number): void {
    this.gestures.fingerDown(1, inTheMiddle)
    this.gestures.fingerDown(2, { x: inTheMiddle.x + fingerGapAtStart, y: inTheMiddle.y })
    this.gestures.fingerMoved(2, { x: inTheMiddle.x + fingerGapAtTheEnd, y: inTheMiddle.y })
    this.gestures.fingerUp(2)
    this.gestures.fingerUp(1)
  }

  private walkTo(furnitureId: FurnitureId): void {
    this.play.pressStarted({ kind: 'furniture', furnitureId })
    this.play.pressEnded()
    for (let elapsed = 0; elapsed < longestWalkSeconds && this.play.view.kind !== 'closeUp'; elapsed += frameSeconds) this.play.advance(frameSeconds)
    assert.deepEqual(this.play.view, { kind: 'closeUp', furnitureId }, this.logLines.join('\n'))
  }

  private tapTargetAt(point: ScreenPoint): RoomTapTarget {
    const inspectedHandIndex = this.play.inspectionView?.handIndex ?? null
    if (isAt(point, inTheMiddle) && inspectedHandIndex !== null) return { kind: 'hand', handIndex: inspectedHandIndex }
    const firstHandsItemId = this.ritual.state.keeper.hands[0] ?? null
    if (isAt(point, onTheFirstHandsLid) && firstHandsItemId !== null) return { kind: 'lid', itemId: firstHandsItemId }
    const handIndex: HandIndex | null = isAt(point, onTheFirstHand) ? 0 : isAt(point, onTheSecondHand) ? 1 : null
    if (handIndex !== null && handIndex !== inspectedHandIndex) return { kind: 'hand', handIndex }
    return { kind: 'floor', point: { x: 0, z: 0 } }
  }
}

function isAt(point: ScreenPoint, place: ScreenPoint): boolean {
  return point.x === place.x && point.y === place.y
}
