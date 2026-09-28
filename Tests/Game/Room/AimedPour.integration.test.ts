import assert from 'node:assert/strict'
import test from 'node:test'
import { screenRightOnTheFloor } from '../../../Apps/Game/Room/Camera/CameraPoses.ts'
import type { ScreenPoint } from '../../../Apps/Engine/ScreenPoint.ts'
import { furnitureWithId, roomHalfSize } from '../../../Apps/Game/Room/RoomLayout.ts'
import type { FloorPoint } from '../../../Apps/Engine/Points.ts'
import type { TapTarget } from '../../../Apps/Game/Room/TapTarget.ts'
import { assertNear } from '../../Support/Assertions.ts'
import { aimAPour } from '../../../Apps/Game/Room/AimedPour.ts'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import { frameSeconds, quietRoomLayout, onTheCounter, onTheCounterBesideTheBowl, onTopOf, screenShowing, TestRoom, withoutTheTurn } from '../../Support/TestRoom.ts'
import { wetMlOnEveryPlace } from '../../../Shared/GameLogic/Simulation/Puddles.ts'
import { isThePourRunningOverItsTarget, isThePourStreamRunning } from '../../../Apps/Game/Room/PourStream.ts'
import { itemIdsInTheHands } from '../../../Shared/GameLogic/State/WhereItemsAre.ts'
import type { PuddleState } from '../../../Shared/GameLogic/State/SessionState.ts'
import type { DeepReadonly } from '../../../Shared/Engine/DeepReadonly.ts'

const pixelsPerMetre = 100
const whereTheFingerStarts: ScreenPoint = { x: 0, y: 0 }
const onTheCounterLeftOfTheHeater: ScreenPoint = { x: 40, y: 700 }
const aboveTheHorizon: ScreenPoint = { x: 0, y: -300 }
const counterLeftOfTheHeater = onTopOf('counter', -0.2, 0.15)
const counter = furnitureWithId(quietRoomLayout, 'counter')
const frontEdgeOfTheCounterZ = counter.footprint.z + counter.footprint.depth / 2
const aimedVesselAwayFromTheWallsMetres = 0.05
const aimedVesselReachBehindItsSpoutMetres = 0.3

test('bowlOpening_whenTappedWithTheKettleChosen_isAimedAtWithoutPouring', () => {
  const room = new TestRoom()
  room.bringABowlToTheCounterAndTakeTheKettle()
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'opening', itemId: 'bowl1' })

  assert.equal(room.playerController.aimedPourView?.targetId, 'bowl1')
  assert.equal(room.state.pour, null)
})

test('pour_whileTiltIsHeldWithTheSpoutMovedOverTheBowl_landsEntirelyInTheBowl', () => {
  const room = new TestRoom()
  aimTheKettleAtTheBowl(room)
  moveTheSpoutOver(room, onTheCounter)

  room.playerController.tiltPressed()
  room.advance(2)

  assert.equal(room.state.pour?.streamOnTargetFraction, 1)
  assert.ok((room.state.vessels['bowl1']?.liquid.volumeMl ?? 0) > 0)
})

test('pour_whenTheSpoutIsMovedOverAnotherBowl_fillsThatBowl', () => {
  const room = new TestRoom()
  aimTheKettleAtTheFirstOfTwoBowls(room)
  moveTheSpoutOver(room, onTheCounterBesideTheBowl)

  room.playerController.tiltPressed()
  room.advance(2)

  assert.equal(room.playerController.aimedPourView?.targetId, 'bowl2')
  assert.equal(room.state.vessels['bowl1']?.liquid.volumeMl, 0)
  assert.ok((room.state.vessels['bowl2']?.liquid.volumeMl ?? 0) > 0)
})

test('pour_whenTheSpoutMovesToAnotherBowlWhilePouring_carriesOnIntoThatBowl', () => {
  const room = new TestRoom()
  aimTheKettleAtTheFirstOfTwoBowls(room)
  moveTheSpoutOver(room, onTheCounter)
  room.playerController.tiltPressed()
  room.advance(2)

  moveTheSpoutOver(room, onTheCounterBesideTheBowl)
  room.advance(2)

  assert.ok((room.state.vessels['bowl1']?.liquid.volumeMl ?? 0) > 0)
  assert.ok((room.state.vessels['bowl2']?.liquid.volumeMl ?? 0) > 0)
  assert.equal(room.state.pour?.targetId, 'bowl2')
})

test('pour_whileTiltIsHeldWithTheSpoutBesideTheBowl_wetsTheTableAndNotTheBowl', () => {
  const room = new TestRoom()
  aimTheKettleAtTheBowl(room)

  room.playerController.tiltPressed()
  room.advance(2)

  assert.equal(room.state.vessels['bowl1']?.liquid.volumeMl, 0)
  assert.ok(wetMlOnEveryPlace(room.state) > 0)
})

test('pour_whileTiltIsHeldWithTheSpoutBesideTheBowl_puddlesUnderTheSpoutAndNotAroundTheBowl', () => {
  const room = new TestRoom()
  aimTheKettleAtTheBowl(room)
  const spout = room.playerController.aimedPourView?.spout

  room.playerController.tiltPressed()
  room.advance(2)

  const puddleCentre = puddleOnTheCounter(room)?.centre
  assertNear(puddleCentre?.x ?? Infinity, spout?.x ?? 0)
  assertNear(puddleCentre?.z ?? Infinity, spout?.z ?? 0)
})

test('pour_whenTheTiltButtonIsReleased_stopsAsTheKettleTiltsBack', () => {
  const room = new TestRoom()
  aimTheKettleAtTheBowl(room)
  moveTheSpoutOver(room, onTheCounter)
  room.playerController.tiltPressed()
  room.advance(2)

  room.playerController.tiltReleased()
  room.advance(1)

  assert.equal(room.state.pour, null)
  assert.equal(room.playerController.aimedPourView?.tiltDegrees, 0)
})

test('pourAim_whenDone_endsWithTheKettleStillInHand', () => {
  const room = new TestRoom()
  aimTheKettleAtTheBowl(room)

  room.playerController.pourDone()

  assert.equal(room.playerController.aimedPourView, null)
  assert.equal(itemIdsInTheHands(room.state)[0], 'kettle')
})

test('pourAim_whenDone_leavesNoHandChosen', () => {
  const room = new TestRoom()
  aimTheKettleAtTheBowl(room)

  room.playerController.pourDone()

  assert.equal(room.playerController.chosenHandIndex, null)
})

test('tiltRelease_afterTheAimEndedWhileTheTiltWasHeld_isNotRefused', () => {
  const room = new TestRoom()
  aimTheKettleAtTheBowl(room)
  room.playerController.tiltPressed()
  room.playerController.pourDone()
  const linesBeforeTheRelease = room.logLines.length

  room.playerController.tiltReleased()

  const linesOfTheRelease = room.logLines.slice(linesBeforeTheRelease)
  assert.ok(linesOfTheRelease.length > 0 && linesOfTheRelease.every((line) => !line.includes('refused')), linesOfTheRelease.join('\n'))
})

test('kettle_whenASurfaceIsTappedWhileAiming_isPutDownThere', () => {
  const room = new TestRoom()
  aimTheKettleAtTheBowl(room)

  room.playerController.aimingTapped({ kind: 'surface', furnitureId: 'counter', point: counterLeftOfTheHeater })

  assert.equal(room.playerController.aimedPourView, null)
  assert.deepEqual(withoutTheTurn(room.state.vessels['kettle']?.location), { kind: 'onSurface', spot: { placeId: 'counter', ...counterLeftOfTheHeater } })
})

test('kettle_whenASpotTakenByTheBowlIsTappedWhileAiming_returnsToItsHandThatIsNoLongerChosen', () => {
  const room = new TestRoom()
  aimTheKettleAtTheBowl(room)

  room.playerController.aimingTapped({ kind: 'surface', furnitureId: 'counter', point: onTheCounter })

  assert.equal(room.playerController.aimedPourView, null)
  assert.equal(itemIdsInTheHands(room.state)[0], 'kettle')
  assert.equal(room.playerController.chosenHandIndex, null)
})

test('kettle_whenTheEmptySinkIsTappedWhileAiming_goesIntoTheSink', () => {
  const room = new TestRoom()
  aimTheKettleAtTheBowl(room)

  room.playerController.aimingTapped({ kind: 'sink' })

  assert.equal(room.playerController.aimedPourView, null)
  assert.equal(room.state.vessels['kettle']?.location.kind, 'inTheSink')
})

test('bowl_whenItsOpeningIsTappedWhileAiming_isTakenIntoAChosenHandWhileTheKettleGoesBackToItsHand', () => {
  const room = new TestRoom()
  aimTheKettleAtTheBowl(room)

  room.playerController.aimingTapped({ kind: 'opening', itemId: 'bowl1' })

  const hands = itemIdsInTheHands(room.state)
  assert.equal(room.playerController.aimedPourView, null)
  assert.ok(hands.includes('kettle') && hands.includes('bowl1'), `the hands hold ${hands.join(', ')}`)
  assert.equal(room.playerController.chosenHandIndex, hands.indexOf('bowl1'))
})

test('thermos_whenItsOpeningIsTappedWhileAiming_staysAndTheKettleGoesBackToItsHand', () => {
  const room = new TestRoom()
  aimTheKettleAtTheBowl(room)

  room.playerController.aimingTapped({ kind: 'opening', itemId: 'thermos' })

  assert.equal(room.playerController.aimedPourView, null)
  assert.deepEqual(itemIdsInTheHands(room.state).filter((itemId) => itemId !== null), ['kettle'])
})

test('kettle_whenTheBowlIsTappedWhileAiming_returnsToItsHand', () => {
  const room = new TestRoom()
  aimTheKettleAtTheBowl(room)

  room.playerController.aimingTapped({ kind: 'item', itemId: 'bowl1' })

  assert.equal(room.playerController.aimedPourView, null)
  assert.equal(itemIdsInTheHands(room.state)[0], 'kettle')
})

test('pour_whenAimedAtABowlOnTheShelf_startsStraightLeftOfItOnTheScreenAndOverTheShelf', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.testSession.doWithoutARefusal({ type: 'pickUp', itemId: 'kettle' })
  room.fillInTheSink('kettle')
  room.walkTo('shelf')
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'opening', itemId: 'bowl1' })

  const spout = room.playerController.aimedPourView?.spout ?? { x: Number.NaN, z: Number.NaN }
  const bowl = spotOf(room, 'bowl1')
  const towardsTheSpout = { x: spout.x - bowl.x, z: spout.z - bowl.z }
  const screenRight = screenRightOnTheFloor(closeUpInViewOf(room))
  const shareOfTheWayToTheLeft = -(towardsTheSpout.x * screenRight.x + towardsTheSpout.z * screenRight.z) / Math.hypot(towardsTheSpout.x, towardsTheSpout.z)
  assertNear(shareOfTheWayToTheLeft, 1)
  const { footprint } = furnitureWithId(quietRoomLayout, 'shelf')
  assert.ok(Math.abs(spout.x - footprint.x) < footprint.width / 2 && Math.abs(spout.z - footprint.z) < footprint.depth / 2, `the spout at (${spout.x}, ${spout.z}) is off the shelf`)
})

test('spout_whenDraggedFarPastTheBackLeftCornerOfTheRoom_staysFiveCentimetresFromTheBackWallWithTheKettlesBackAsFarFromTheLeft', () => {
  const room = new TestRoom()
  aimTheKettleAtTheBowl(room)

  room.moveTheSpout({ x: -10, z: -10 })

  const { spout, spoutDirection } = room.playerController.aimedPourView ?? { spout: { x: Number.NaN, z: Number.NaN }, spoutDirection: { x: Number.NaN, z: Number.NaN } }
  const backOfTheKettleX = spout.x - spoutDirection.x * aimedVesselReachBehindItsSpoutMetres
  assertNear(spout.z + roomHalfSize, aimedVesselAwayFromTheWallsMetres)
  assertNear(backOfTheKettleX + roomHalfSize, aimedVesselAwayFromTheWallsMetres)
})

test('spout_whenDraggedPastTheFrontOfTheCounter_leavesTheCounter', () => {
  const room = new TestRoom()
  aimTheKettleAtTheBowl(room)

  room.moveTheSpout({ x: 0, z: 1 })

  assert.ok((room.playerController.aimedPourView?.spout.z ?? 0) > frontEdgeOfTheCounterZ)
})

test('pour_withTheSpoutPastTheFrontOfTheCounter_losesTheWaterWithoutAPuddle', () => {
  const room = new TestRoom()
  aimTheKettleAtTheBowl(room)
  room.moveTheSpout({ x: 0, z: 1 })
  const kettleMlBeforeThePour = room.state.vessels['kettle']?.liquid.volumeMl ?? 0

  room.playerController.tiltPressed()
  room.advance(2)

  assert.deepEqual(room.state.puddles, {})
  assert.ok((room.state.vessels['kettle']?.liquid.volumeMl ?? 0) < kettleMlBeforeThePour, 'the kettle poured nothing')
})

test('pour_withTheSpoutOverTheSinksOpening_losesTheWaterWithoutAPuddle', () => {
  const room = new TestRoom()
  aimTheKettleAtTheBowl(room)
  moveTheSpoutOver(room, quietRoomLayout.sinkBasin)
  const kettleMlBeforeThePour = room.state.vessels['kettle']?.liquid.volumeMl ?? 0

  room.playerController.tiltPressed()
  room.advance(2)

  assert.deepEqual(room.state.puddles, {})
  assert.ok((room.state.vessels['kettle']?.liquid.volumeMl ?? 0) < kettleMlBeforeThePour, 'the kettle poured nothing')
})

test('pour_whenTheTargetsPlaceHasNoFurnitureInTheLayout_losesTheWaterItMissesAndSaysSo', () => {
  const room = new TestRoom()
  room.bringABowlToTheCounterAndTakeTheKettle()
  const layoutWithoutTheCounter = { ...quietRoomLayout, furniture: quietRoomLayout.furniture.filter((piece) => piece.id !== 'counter') }
  const logLines: string[] = []
  const pour = aimAPour({ session: room.testSession.session, catalog: defaultCatalog, layout: layoutWithoutTheCounter, log: (line) => logLines.push(line), sourceId: 'kettle', targetId: 'bowl1', spoutDirection: { x: 1, z: 0 } })

  pour?.tiltPressed()
  for (let frame = 0; frame < 120; frame += 1) {
    pour?.advance(frameSeconds)
    room.testSession.wait(frameSeconds)
  }

  assert.deepEqual(room.state.puddles, {})
  assert.ok(logLines.some((line) => line.includes('has no furniture in this room')), logLines.join('\n'))
})

test('pour_whenTheSpoutMovesOverBowlsOnTwoShelfBoards_staysOnTheBoardOfItsTarget', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
  room.fillInTheSink('kettle')
  room.walkTo('shelf')
  room.tap({ kind: 'hand', handIndex: 0 })
  room.tap({ kind: 'opening', itemId: 'bowl5' })

  moveTheSpoutOver(room, spotOf(room, 'bowl4'))

  assert.equal(room.playerController.aimedPourView?.targetId, 'bowl4')
})

test('pour_whenTheTiltIsHeldOverTheMiddleOfAnEmptyBowl_spillsNothingOnTheTable', () => {
  const room = new TestRoom()
  aimTheKettleAtTheBowl(room)
  moveTheSpoutOver(room, onTheCounter)

  room.playerController.tiltPressed()
  room.advance(3)

  assert.equal(wetMlOnEveryPlace(room.state), 0)
  assert.ok((room.state.vessels['bowl1']?.liquid.volumeMl ?? 0) > 0, 'the bowl stayed empty')
})

test('thermosLid_whenTheClosedThermosIsAimedAtABowl_opens', () => {
  const room = new TestRoom()

  aimTheClosedThermosAtTheBowl(room)

  assert.equal(room.state.vessels['thermos']?.isLidOpen, true)
  assert.equal(room.playerController.aimedPourView?.targetId, 'bowl1')
})

test('thermosLid_whenTappedWhileAiming_closesAndKeepsTheAim', () => {
  const room = new TestRoom()
  aimTheClosedThermosAtTheBowl(room)

  room.playerController.aimingTapped({ kind: 'lid', itemId: 'thermos' })

  assert.equal(room.state.vessels['thermos']?.isLidOpen, false)
  assert.equal(room.playerController.aimedPourView?.sourceId, 'thermos')
})

test('kettleLid_whenTappedWithTheClosedThermosChosen_opensBothLidsAndAimsAtTheKettle', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'thermos' })
  room.fillInTheSink('thermos')
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'lid', itemId: 'kettle' })

  assert.equal(room.state.vessels['thermos']?.isLidOpen, true)
  assert.equal(room.state.vessels['kettle']?.isLidOpen, true)
  assert.equal(room.playerController.aimedPourView?.targetId, 'kettle')
})

test('thermosLid_whenTappedAfterATapOnTheLidOfTheKettleInHand_isAimedAtAndTheThermosIsNotTaken', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
  room.fillInTheSink('kettle')
  room.session.dispatch({ type: 'closeVesselLid', vesselId: 'kettle' })
  room.tap({ kind: 'lid', itemId: 'kettle' })

  room.tap({ kind: 'lid', itemId: 'thermos' })

  assert.equal(room.playerController.aimedPourView?.targetId, 'thermos')
  assert.deepEqual(itemIdsInTheHands(room.state), ['kettle', null, null])
})

test('kettleLid_whenTappedWithTheEmptyThermosChosen_isAimedAtAndTheKettleIsNotTaken', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'thermos' })

  room.tap({ kind: 'lid', itemId: 'kettle' })

  assert.equal(room.playerController.aimedPourView?.targetId, 'kettle')
  assert.deepEqual(itemIdsInTheHands(room.state), ['thermos', null, null])
})

test('kettleOpening_whenTappedWithTheClosedThermosChosenAndTheKettleOpen_opensTheThermosAndIsAimedAt', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.session.dispatch({ type: 'openVesselLid', vesselId: 'kettle' })
  room.tap({ kind: 'item', itemId: 'thermos' })

  room.tap({ kind: 'opening', itemId: 'kettle' })

  assert.equal(room.state.vessels['thermos']?.isLidOpen, true)
  assert.equal(room.playerController.aimedPourView?.targetId, 'kettle')
})

test('kettle_whenItsBodyIsTappedWithTheThermosChosen_isTakenIntoTheOtherHand', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'thermos' })

  room.tap({ kind: 'item', itemId: 'kettle' })

  assert.equal(room.playerController.aimedPourView, null)
  assert.deepEqual(itemIdsInTheHands(room.state), ['thermos', 'kettle', null])
})

test('bowlOpening_whenTappedAfterWalkingToTheShelfWithTheThermosChosen_isAimedAt', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'thermos' })
  room.walkTo('shelf')

  room.tap({ kind: 'opening', itemId: 'bowl1' })

  assert.equal(room.playerController.aimedPourView?.targetId, 'bowl1')
})

test('pour_fromTheClosedThermosIntoTheClosedKettle_starts', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'thermos' })
  room.fillInTheSink('thermos')
  room.tap({ kind: 'hand', handIndex: 0 })
  room.tap({ kind: 'lid', itemId: 'kettle' })

  room.playerController.tiltPressed()
  room.advance(2)

  assert.equal(room.state.pour?.sourceId, 'thermos')
})

test('kettleLid_whenTheKettleIsAimedAtTheClosedThermos_staysClosedWhileTheThermosOpens', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
  room.fillInTheSink('kettle')
  room.session.dispatch({ type: 'closeVesselLid', vesselId: 'kettle' })
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'lid', itemId: 'thermos' })

  assert.equal(room.state.vessels['kettle']?.isLidOpen, false)
  assert.equal(room.state.vessels['thermos']?.isLidOpen, true)
})

test('emptyThermos_whenTheTiltIsHeldOverABowl_tiltsAndPoursNothing', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1')
  room.walkTo('counter')
  room.putDown(0, onTheCounter)
  room.tap({ kind: 'item', itemId: 'thermos' })
  room.tap({ kind: 'opening', itemId: 'bowl1' })

  room.playerController.tiltPressed()
  room.advance(1)

  assert.ok((room.playerController.aimedPourView?.tiltDegrees ?? 0) > 0)
  assert.equal(room.state.pour, null)
  assert.equal(room.state.vessels['bowl1']?.liquid.volumeMl, 0)
})

test('overflowOfTheBowl_whilePouringOnIntoTheFullBowl_isShown', () => {
  const room = new TestRoom()
  aimTheKettleAtTheBowl(room)
  moveTheSpoutOver(room, onTheCounter)
  room.playerController.tiltPressed()

  room.advanceUntil(() => room.state.pour?.hasOverflowed === true)

  const pour = room.state.pour
  assert.ok(pour !== null)
  assert.equal(isThePourRunningOverItsTarget(pour), true)
})

test('streams_whenTheKettleRunsDryWhileTheFullBowlOverflows_stopBeingShown', () => {
  const room = new TestRoom()
  aimTheKettleAtTheBowl(room)
  moveTheSpoutOver(room, onTheCounter)
  room.playerController.tiltPressed()
  room.advanceUntil(() => room.state.pour?.hasOverflowed === true)

  room.advanceUntil(() => room.state.pour?.hasRunDry === true)

  const pour = room.state.pour
  assert.ok(pour !== null)
  assert.equal(isThePourStreamRunning(pour), false)
  assert.equal(isThePourRunningOverItsTarget(pour), false)
})

test('aimingFinger_whenMovedFurtherThanTwelvePixels_movesTheSpoutAndKeepsTheAim', () => {
  const room = roomWithAScreen()
  aimTheKettleAtTheBowl(room)
  const spoutBefore = room.playerController.aimedPourView?.spout ?? { x: Number.NaN, z: Number.NaN }

  room.touchInput.fingerDown(1, whereTheFingerStarts)
  room.touchInput.fingerMoved(1, { x: 22, y: 0 })
  room.touchInput.fingerUp(1)

  assertNear(room.playerController.aimedPourView?.spout.x ?? Number.NaN, spoutBefore.x + 22 / pixelsPerMetre)
  assert.equal(itemIdsInTheHands(room.state)[0], 'kettle')
})

test('aimingFinger_whenItLeavesTheAimPlaneAndComesBackFarAway_movesTheSpoutOnlyByItsDragAfterComingBack', () => {
  const room = roomWithAScreen()
  aimTheKettleAtTheBowl(room)
  const spoutBefore = room.playerController.aimedPourView?.spout ?? { x: Number.NaN, z: Number.NaN }
  room.touchInput.fingerDown(1, whereTheFingerStarts)
  room.touchInput.fingerMoved(1, aboveTheHorizon)

  room.touchInput.fingerMoved(1, { x: 100, y: 0 })
  room.touchInput.fingerMoved(1, { x: 110, y: 0 })

  assertNear(room.playerController.aimedPourView?.spout.x ?? Number.NaN, spoutBefore.x + 0.1)
  assertNear(room.playerController.aimedPourView?.spout.z ?? Number.NaN, spoutBefore.z)
})

test('aimingFinger_whenLiftedWithoutMoving_putsTheKettleDownWhereItTouched', () => {
  const room = roomWithAScreen()
  aimTheKettleAtTheBowl(room)

  room.touchInput.fingerDown(1, onTheCounterLeftOfTheHeater)
  room.touchInput.fingerUp(1)

  assert.equal(room.playerController.aimedPourView, null)
  assert.deepEqual(withoutTheTurn(room.state.vessels['kettle']?.location), { kind: 'onSurface', spot: { placeId: 'counter', ...counterLeftOfTheHeater } })
})

test('aimingFinger_whenTheBrowserCancelsIt_returnsTheKettleToItsHandThatIsNoLongerChosen', () => {
  const room = roomWithAScreen()
  aimTheKettleAtTheBowl(room)
  room.touchInput.fingerDown(1, onTheCounterLeftOfTheHeater)

  room.touchInput.fingerCancelled(1)

  assert.equal(room.playerController.aimedPourView, null)
  assert.equal(itemIdsInTheHands(room.state)[0], 'kettle')
  assert.equal(room.playerController.chosenHandIndex, null)
})

test('handKey_whileAPourIsAimed_leavesTheHandOfTheAimedVesselChosen', () => {
  const room = new TestRoom()
  aimTheKettleAtTheBowl(room)

  room.playerController.handKeyTapped(1)

  assert.equal(room.playerController.chosenHandIndex, 0)
  assert.equal(room.playerController.aimedPourView?.sourceId, 'kettle')
})

test('handKey_heldForASecondWhileAPourIsAimed_showsNothingUpClose', () => {
  const room = new TestRoom()
  aimTheKettleAtTheBowl(room)

  room.playerController.handPressHeld(0, 1)

  assert.equal(room.playerController.inspectionView, null)
  assert.equal(room.playerController.aimedPourView?.sourceId, 'kettle')
})

test('secondFinger_whileAFingerAims_isIgnored', () => {
  const room = roomWithAScreen()
  aimTheKettleAtTheBowl(room)
  const spoutBefore = room.playerController.aimedPourView?.spout ?? { x: Number.NaN, z: Number.NaN }
  room.touchInput.fingerDown(1, whereTheFingerStarts)

  room.touchInput.fingerDown(2, onTheCounterLeftOfTheHeater)
  room.touchInput.fingerUp(2)
  room.touchInput.fingerMoved(1, { x: 22, y: 0 })
  room.touchInput.fingerUp(1)

  assertNear(room.playerController.aimedPourView?.spout.x ?? Number.NaN, spoutBefore.x + 22 / pixelsPerMetre)
  assert.equal(itemIdsInTheHands(room.state)[0], 'kettle')
})

function aimTheKettleAtTheFirstOfTwoBowls(room: TestRoom): void {
  room.carryFromTheShelf('bowl1', 'bowl2')
  room.walkTo('counter')
  room.putDown(0, onTheCounter)
  room.putDown(1, onTheCounterBesideTheBowl)
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
  room.fillInTheSink('kettle')
  room.tap({ kind: 'hand', handIndex: 0 })
  room.tap({ kind: 'opening', itemId: 'bowl1' })
}

function aimTheClosedThermosAtTheBowl(room: TestRoom): void {
  room.carryFromTheShelf('bowl1')
  room.walkTo('counter')
  room.putDown(0, onTheCounter)
  room.session.dispatch({ type: 'pickUp', itemId: 'thermos' })
  room.fillInTheSink('thermos')
  room.tap({ kind: 'hand', handIndex: 0 })
  room.tap({ kind: 'opening', itemId: 'bowl1' })
}

function aimTheKettleAtTheBowl(room: TestRoom): void {
  room.bringABowlToTheCounterAndTakeTheKettle()
  room.tap({ kind: 'hand', handIndex: 0 })
  room.tap({ kind: 'opening', itemId: 'bowl1' })
}

function moveTheSpoutOver(room: TestRoom, point: FloorPoint): void {
  const spout = room.playerController.aimedPourView?.spout
  if (spout === undefined) throw new Error('no pour is aimed, so there is no spout to move')
  room.moveTheSpout({ x: point.x - spout.x, z: point.z - spout.z })
}

function spotOf(room: TestRoom, itemId: string): FloorPoint {
  const location = room.state.vessels[itemId]?.location
  if (location?.kind !== 'onSurface') throw new Error(`${itemId} does not stand on a surface`)
  return location.spot
}

function closeUpInViewOf(room: TestRoom) {
  const closeUp = room.playerController.closeUpInView
  if (closeUp === null) throw new Error('the room shows no close-up')
  return closeUp
}

function roomWithAScreen(): TestRoom {
  return new TestRoom({ screen: () => screenShowing(targetOnTheScreenAt, (point) => (point.y < 0 ? null : { x: point.x / pixelsPerMetre, z: point.y / pixelsPerMetre })) })
}

function targetOnTheScreenAt(point: ScreenPoint): TapTarget {
  const isOnTheCounter = point.x === onTheCounterLeftOfTheHeater.x && point.y === onTheCounterLeftOfTheHeater.y
  return isOnTheCounter ? { kind: 'surface', furnitureId: 'counter', point: counterLeftOfTheHeater } : { kind: 'nothing' }
}

function puddleOnTheCounter(room: TestRoom): DeepReadonly<PuddleState> | undefined {
  return Object.values(room.state.puddles).find((puddle) => puddle.centre.placeId === 'counter')
}
