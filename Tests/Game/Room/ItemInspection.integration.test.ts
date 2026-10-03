import assert from 'node:assert/strict'
import test from 'node:test'
import type { ScreenPoint } from '../../../Apps/Engine/ScreenPoint.ts'
import type { TapTarget } from '../../../Apps/Game/Room/TapTarget.ts'
import type { HandIndex } from '../../../Shared/GameLogic/State/SessionState.ts'
import { assertNear } from '../../Support/Assertions.ts'
import { middleOfTheFloor, screenShowing, TestRoom } from '../../Support/TestRoom.ts'
import type { FurnitureId } from '../../../Apps/Game/Room/RoomLayout.ts'
import { itemIdsInTheHands } from '../../../Shared/GameLogic/State/WhereItemsAre.ts'

const onTheFirstHand: ScreenPoint = { x: 60, y: 780 }
const onTheSecondHand: ScreenPoint = { x: 330, y: 780 }
const onTheFirstHandsLid: ScreenPoint = { x: 60, y: 700 }
const inTheMiddle: ScreenPoint = { x: 195, y: 420 }
const nearTheTop: ScreenPoint = { x: 195, y: 100 }
const startingPitchRadians = 0.55

test('heldItem_whenPressedStillForOneSecond_isInspected', () => {
  const room = new InspectingRoom()
  room.touchInput.fingerDown(1, onTheFirstHand)

  room.holdFor(1)

  assert.equal(room.playerController.inspectionView?.itemId, 'bowl1')
})

test('heldKettle_whenItsLidIsPressedStillForOneSecond_isInspected', () => {
  const room = new InspectingRoom('counter', ['kettle'])
  room.touchInput.fingerDown(1, onTheFirstHandsLid)

  room.holdFor(1)

  assert.equal(room.playerController.inspectionView?.itemId, 'kettle')
})

test('heldItem_whenReleasedBeforeOneSecond_isNotInspectedAndOpensItsMenuAsByATap', () => {
  const room = new InspectingRoom()
  room.touchInput.fingerDown(1, onTheFirstHand)
  room.holdFor(0.875)

  room.touchInput.fingerUp(1)

  assert.equal(room.playerController.inspectionView, null)
  assert.deepEqual(room.actionsOffered(), ['putAway bowl'])
})

test('heldItem_whenTheBrowserCancelsThePressBeforeOneSecond_isNotInspectedAndOpensNoMenu', () => {
  const room = new InspectingRoom()
  room.touchInput.fingerDown(1, onTheFirstHand)
  room.holdFor(0.875)

  room.touchInput.fingerCancelled(1)
  room.holdFor(0.25)

  assert.equal(room.playerController.inspectionView, null)
  assert.equal(room.playerController.actionMenuView, null)
})

test('heldItem_whenTheFingerDriftsTwelvePixelsWhileHeld_isInspected', () => {
  const room = new InspectingRoom()
  room.touchInput.fingerDown(1, onTheFirstHand)
  room.touchInput.fingerMoved(1, { x: onTheFirstHand.x + 12, y: onTheFirstHand.y })

  room.holdFor(1)

  assert.equal(room.playerController.inspectionView?.itemId, 'bowl1')
})

test('heldItem_whenTheFingerMovesThirteenPixelsWhileHeld_isNotInspected', () => {
  const room = new InspectingRoom()
  room.touchInput.fingerDown(1, onTheFirstHand)
  room.touchInput.fingerMoved(1, { x: onTheFirstHand.x + 13, y: onTheFirstHand.y })

  room.holdFor(1)

  assert.equal(room.playerController.inspectionView, null)
})

test('heldItem_whenASecondFingerTouchesWhileHeld_isNotInspected', () => {
  const room = new InspectingRoom()
  room.touchInput.fingerDown(1, onTheFirstHand)
  room.touchInput.fingerDown(2, nearTheTop)

  room.holdFor(1)

  assert.equal(room.playerController.inspectionView, null)
})

test('pressThatInspects_whenTheFingerLifts_isNotATapAndOpensNoMenu', () => {
  const room = new InspectingRoom()
  room.touchInput.fingerDown(1, onTheSecondHand)
  room.holdFor(1)

  room.touchInput.fingerUp(1)

  assert.equal(room.playerController.inspectionView?.itemId, 'bowl2')
  assert.equal(room.playerController.actionMenuView, null)
})

test('inspection_whenLeft_opensNoMenu', () => {
  const room = new InspectingRoom()
  room.inspect(onTheFirstHand)

  room.tapOn(nearTheTop)

  assert.equal(room.playerController.inspectionView, null)
  assert.equal(room.playerController.actionMenuView, null)
})

test('inspection_whenTappedOutsideTheItem_endsWithoutTheTapReachingTheRoom', () => {
  const room = new InspectingRoom()
  room.inspect(onTheFirstHand)

  room.tapOn(nearTheTop)

  assert.equal(room.playerController.inspectionView, null)
  assert.deepEqual(room.playerController.view, { kind: 'closeUp', furnitureId: 'shelf' })
  assert.deepEqual(itemIdsInTheHands(room.testSession.state), ['bowl1', 'bowl2'])
})

test('inspection_whenTheOtherHeldItemIsTapped_endsWithoutOpeningItsMenu', () => {
  const room = new InspectingRoom()
  room.inspect(onTheFirstHand)

  room.tapOn(onTheSecondHand)

  assert.equal(room.playerController.inspectionView, null)
  assert.equal(room.playerController.actionMenuView, null)
})

test('inspection_whenTheInspectedItemIsTapped_goesOn', () => {
  const room = new InspectingRoom()
  room.inspect(onTheFirstHand)

  room.tapOn(inTheMiddle)

  assert.equal(room.playerController.inspectionView?.itemId, 'bowl1')
})

test('inspectedItem_whenDraggedAHundredPixelsAcross_turnsOneRadianAroundItself', () => {
  const room = new InspectingRoom()
  room.inspect(onTheFirstHand)

  room.drag(inTheMiddle, { x: inTheMiddle.x + 100, y: inTheMiddle.y })

  assertNear(room.playerController.inspectionView?.yawRadians ?? Number.NaN, 1)
  assertNear(room.playerController.inspectionView?.pitchRadians ?? Number.NaN, startingPitchRadians)
})

test('inspectedItem_whenTheHoldingFingerDragsFiftyPixelsDown_tipsHalfARadianTowardsTheViewer', () => {
  const room = new InspectingRoom()
  room.touchInput.fingerDown(1, onTheFirstHand)
  room.holdFor(1)

  room.touchInput.fingerMoved(1, { x: onTheFirstHand.x, y: onTheFirstHand.y + 50 })

  assertNear(room.playerController.inspectionView?.pitchRadians ?? Number.NaN, startingPitchRadians + 0.5)
})

test('inspectedItem_whenPinchedToTwiceTheFingerGap_isShownTwiceAsLargeAndTheCameraStays', () => {
  const room = new InspectingRoom()
  room.inspect(onTheFirstHand)

  room.pinch(100, 200)

  assertNear(room.playerController.inspectionView?.magnification ?? Number.NaN, 2)
  assert.equal(room.zoom.distanceShare, 1)
  assert.equal(room.playerController.inspectionView?.itemId, 'bowl1')
})

test('inspectedItem_whenPinchedToTenTimesTheFingerGap_growsToThreeTimesItsSize', () => {
  const room = new InspectingRoom()
  room.inspect(onTheFirstHand)

  room.pinch(30, 300)

  assertNear(room.playerController.inspectionView?.magnification ?? Number.NaN, 3)
})

test('inspectedItem_whenPinchedToATenthOfTheFingerGap_shrinksToSixTenthsOfItsSize', () => {
  const room = new InspectingRoom()
  room.inspect(onTheFirstHand)

  room.pinch(300, 30)

  assertNear(room.playerController.inspectionView?.magnification ?? Number.NaN, 0.6)
})

test('inspectedItem_whenTheWheelTurnsFarUp_growsToThreeTimesItsSizeAndTheCameraStays', () => {
  const room = new InspectingRoom()
  room.inspect(onTheFirstHand)

  room.touchInput.wheelTurned(-2000)

  assertNear(room.playerController.inspectionView?.magnification ?? Number.NaN, 3)
  assert.equal(room.zoom.distanceShare, 1)
})

class InspectingRoom extends TestRoom {
  constructor(furnitureId: FurnitureId = 'shelf', itemIdsToHold: readonly string[] = ['bowl1', 'bowl2']) {
    super({ screen: (room) => screenShowing((point) => tapTargetAt(room, point)) })
    this.walkTo(furnitureId)
    for (const itemId of itemIdsToHold) this.session.dispatch({ type: 'pickUp', itemId })
  }

  inspect(point: ScreenPoint): void {
    this.touchInput.fingerDown(1, point)
    this.holdFor(1)
    this.touchInput.fingerUp(1)
    if (this.playerController.inspectionView === null) throw new Error(`nothing is inspected after a hold at (${point.x}, ${point.y}):\n${this.logLines.join('\n')}`)
  }

  tapOn(point: ScreenPoint): void {
    this.touchInput.fingerDown(1, point)
    this.touchInput.fingerUp(1)
  }

  drag(from: ScreenPoint, to: ScreenPoint): void {
    this.touchInput.fingerDown(1, from)
    this.touchInput.fingerMoved(1, to)
    this.touchInput.fingerUp(1)
  }

  pinch(fingerGapAtStart: number, fingerGapAtTheEnd: number): void {
    this.touchInput.fingerDown(1, inTheMiddle)
    this.touchInput.fingerDown(2, { x: inTheMiddle.x + fingerGapAtStart, y: inTheMiddle.y })
    this.touchInput.fingerMoved(2, { x: inTheMiddle.x + fingerGapAtTheEnd, y: inTheMiddle.y })
    this.touchInput.fingerUp(2)
    this.touchInput.fingerUp(1)
  }
}

function isAt(point: ScreenPoint, place: ScreenPoint): boolean {
  return point.x === place.x && point.y === place.y
}

function tapTargetAt(room: TestRoom, point: ScreenPoint): TapTarget {
  const inspectedHandIndex = room.playerController.inspectionView?.handIndex ?? null
  if (isAt(point, inTheMiddle) && inspectedHandIndex !== null) return { kind: 'hand', handIndex: inspectedHandIndex }
  const firstHandsItemId = itemIdsInTheHands(room.testSession.state)[0] ?? null
  if (isAt(point, onTheFirstHandsLid) && firstHandsItemId !== null) return { kind: 'lid', itemId: firstHandsItemId }
  const handIndex: HandIndex | null = isAt(point, onTheFirstHand) ? 0 : isAt(point, onTheSecondHand) ? 1 : null
  if (handIndex !== null && handIndex !== inspectedHandIndex) return { kind: 'hand', handIndex }
  return { kind: 'floor', point: middleOfTheFloor }
}
