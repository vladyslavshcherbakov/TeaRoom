import assert from 'node:assert/strict'
import test from 'node:test'
import { openLidOffsetBeside, whyThereIsNoRoomFor } from '../../../Apps/Game/Room/Placement.ts'
import type { FloorPoint, FurnitureId, WorldPoint } from '../../../Apps/Game/Room/RoomLayout.ts'
import { RoomPlay, type RoomRemark, type RoomTapTarget } from '../../../Apps/Game/Room/RoomPlay.ts'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import { definitionIn } from '../../../Shared/Simulation/Definitions/Catalog.ts'
import type { Spot } from '../../../Shared/Simulation/Definitions/RoomDefinition.ts'
import { assertNear } from '../../Support/Assertions.ts'
import { TestRitual } from '../../Support/TestRitual.ts'
import { wetMlOnEveryPlace } from '../../../Shared/Simulation/Ritual/Puddles.ts'

const frameSeconds = 1 / 60
const longestWalkSeconds = 30
const onTheTeaTable: WorldPoint = { x: 1, y: 0.42, z: -1.5 }
const onTheCounter: WorldPoint = { x: -1.4, y: 0.9, z: -2.6 }
const onTheCounterBesideTheBowl: WorldPoint = { x: -0.8, y: 0.9, z: -2.6 }
const behindTheKettle: WorldPoint = { x: -1.9, y: 0.9, z: -2.86 }
const quietRoomHeaterSpot = definitionIn(defaultCatalog, 'rooms', 'quietRoom').heaterSpot

test('bowl_whenTappedInTheShelfCloseUp_goesIntoTheFirstFreeHand', () => {
  const room = new RoomVisit()
  room.walkTo('shelf')

  room.tap({ kind: 'item', itemId: 'bowl1' })

  assert.deepEqual(room.state.keeper.hands, ['bowl1', null, null])
})

test('bowl_whenPickedUpByATap_isChosenAtOnce', () => {
  const room = new RoomVisit()
  room.walkTo('shelf')
  room.tap({ kind: 'item', itemId: 'bowl1' })

  room.tap({ kind: 'item', itemId: 'bowl2' })

  assert.deepEqual(room.state.keeper.hands, ['bowl1', 'bowl2', null])
  assert.equal(room.play.chosenHandIndex, 1)
})

test('bowl_whenItsHandIsChosenAndTheTeaTableIsTapped_standsWhereTheTableWasTapped', () => {
  const room = new RoomVisit()
  room.carryFromTheShelf('bowl1')
  room.walkTo('teaTable')
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'surface', furnitureId: 'teaTable', point: onTheTeaTable })

  assert.deepEqual(room.state.vessels['bowl1']?.location, { kind: 'onSurface', spot: spotOn('teaTable', onTheTeaTable) })
  assert.equal(room.play.chosenHandIndex, null)
})

test('surfaceTap_withNoHandChosen_leavesTheItemInHand', () => {
  const room = new RoomVisit()
  room.carryFromTheShelf('bowl1')
  room.walkTo('teaTable')

  room.tap({ kind: 'surface', furnitureId: 'teaTable', point: onTheTeaTable })

  assert.deepEqual(room.state.keeper.hands, ['bowl1', null, null])
  assert.ok(room.logLines.includes('tap on the teaTable ignored: no hand is chosen'), room.logLines.join('\n'))
})

test('bowl_whenPutDownWhereAnotherBowlStands_staysInHandWithItsHandChosen', () => {
  const room = new RoomVisit()
  room.carryFromTheShelf('bowl1', 'bowl2')
  room.walkTo('teaTable')
  room.putDown(0, onTheTeaTable)
  room.tap({ kind: 'hand', handIndex: 1 })

  room.tap({ kind: 'surface', furnitureId: 'teaTable', point: { ...onTheTeaTable, x: onTheTeaTable.x + 0.1 } })

  assert.deepEqual(room.state.keeper.hands, [null, 'bowl2', null])
  assert.equal(room.play.chosenHandIndex, 1)
  assert.ok(room.logLines.some((line) => line.startsWith('no room for bowl2') && line.endsWith('somethingIsThere')), room.logLines.join('\n'))
})

test('openKettleLid_withTheHeaterOnItsLeftTheSinkOnItsRightAndTheEdgeInFront_liesBehindTheKettle', () => {
  const room = new RoomVisit()
  room.walkTo('counter')

  room.session.dispatch({ type: 'openVesselLid', vesselId: 'kettle' })

  const offset = openLidOffsetBeside('kettle', room.state, quietRoomHeaterSpot)
  assertNear(offset?.x ?? Number.NaN, 0, 1e-9)
  assert.ok((offset?.z ?? 0) < 0, `lid offset ${JSON.stringify(offset)}`)
})

test('bowl_whenPutDownOnTheKettlesOpenLid_staysInHand', () => {
  const room = new RoomVisit()
  room.carryFromTheShelf('bowl1')
  room.walkTo('counter')
  room.session.dispatch({ type: 'openVesselLid', vesselId: 'kettle' })
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'surface', furnitureId: 'counter', point: behindTheKettle })

  assert.deepEqual(room.state.keeper.hands, ['bowl1', null, null])
  assert.ok(room.logLines.some((line) => line.startsWith('no room for bowl1') && line.endsWith('somethingIsThere')), room.logLines.join('\n'))
})

test('bowl_underTheSpoutOfTheKettleStandingThere_hasNoRoom', () => {
  const room = new RoomVisit()
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
  room.walkTo('teaTable')
  room.putDown(0, onTheTeaTable)

  const refusal = whyThereIsNoRoomFor('bowl1', spotOn('teaTable', { ...onTheTeaTable, x: onTheTeaTable.x + 0.26 }), room.state, quietRoomHeaterSpot)

  assert.equal(refusal, 'somethingIsThere')
})

test('kettle_withItsSpoutOverTheShelfsFrontEdge_fits', () => {
  const room = new RoomVisit()
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
  room.walkTo('shelf')

  const refusal = whyThereIsNoRoomFor('kettle', spotOn('shelf', { x: -2.66, y: 1.22, z: 0.9 }), room.state, quietRoomHeaterSpot)

  assert.equal(refusal, null)
})

test('bowl_behindTheKettleAwayFromItsSpout_fits', () => {
  const room = new RoomVisit()
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
  room.walkTo('teaTable')
  room.putDown(0, onTheTeaTable)

  const refusal = whyThereIsNoRoomFor('bowl1', spotOn('teaTable', { ...onTheTeaTable, x: onTheTeaTable.x - 0.26 }), room.state, quietRoomHeaterSpot)

  assert.equal(refusal, null)
})

test('kettle_whenItsHandIsChosenAndTheHeaterIsTapped_sitsOnTheHeater', () => {
  const room = new RoomVisit()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })

  room.tap({ kind: 'heater' })

  assert.equal(room.state.heater.itemIdOnTop, 'kettle')
  assert.deepEqual(room.state.keeper.hands, [null, null, null])
})

test('heaterSwitch_whenTapped_switchesTheHeaterOn', () => {
  const room = new RoomVisit()
  room.walkTo('counter')

  room.tap({ kind: 'heaterSwitch' })

  assert.equal(room.state.heater.isOn, true)
})

test('heaterTap_withNoHandChosen_leavesTheHeaterEmpty', () => {
  const room = new RoomVisit()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'heater' })

  assert.equal(room.state.heater.itemIdOnTop, null)
  assert.ok(room.logLines.includes('tap on the heater ignored: no hand is chosen'), room.logLines.join('\n'))
})

test('bowl_whenTappedWithTheKettleChosen_isAimedAtWithoutPouring', () => {
  const room = new RoomVisit()
  room.bringABowlToTheCounterAndTakeTheKettle()
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'item', itemId: 'bowl1' })

  assert.equal(room.play.aimedPourView?.targetId, 'bowl1')
  assert.equal(room.state.pour, null)
})

test('pour_whileTiltIsHeldWithTheSpoutMovedOverTheBowl_landsEntirelyInTheBowl', () => {
  const room = new RoomVisit()
  room.aimTheKettleAtTheBowl()
  room.moveTheSpout({ x: 0.22, z: 0 })

  room.play.tiltPressed()
  room.wait(2)

  assert.equal(room.state.pour?.streamOnTargetFraction, 1)
  assert.ok((room.state.vessels['bowl1']?.liquid.volumeMl ?? 0) > 0)
})

test('pour_whenTheSpoutIsMovedOverAnotherBowl_fillsThatBowl', () => {
  const room = new RoomVisit()
  room.aimTheKettleAtTheFirstOfTwoBowls()
  room.moveTheSpout({ x: 0.22 + onTheCounterBesideTheBowl.x - onTheCounter.x, z: 0 })

  room.play.tiltPressed()
  room.wait(2)

  assert.equal(room.play.aimedPourView?.targetId, 'bowl2')
  assert.equal(room.state.vessels['bowl1']?.liquid.volumeMl, 0)
  assert.ok((room.state.vessels['bowl2']?.liquid.volumeMl ?? 0) > 0)
})

test('pour_whenTheSpoutMovesToAnotherBowlWhilePouring_carriesOnIntoThatBowl', () => {
  const room = new RoomVisit()
  room.aimTheKettleAtTheFirstOfTwoBowls()
  room.moveTheSpout({ x: 0.22, z: 0 })
  room.play.tiltPressed()
  room.wait(2)

  room.moveTheSpout({ x: onTheCounterBesideTheBowl.x - onTheCounter.x, z: 0 })
  room.wait(2)

  assert.ok((room.state.vessels['bowl1']?.liquid.volumeMl ?? 0) > 0)
  assert.ok((room.state.vessels['bowl2']?.liquid.volumeMl ?? 0) > 0)
  assert.equal(room.state.pour?.targetId, 'bowl2')
})

test('pour_whileTiltIsHeldWithTheSpoutBesideTheBowl_wetsTheTableAndNotTheBowl', () => {
  const room = new RoomVisit()
  room.aimTheKettleAtTheBowl()

  room.play.tiltPressed()
  room.wait(2)

  assert.equal(room.state.vessels['bowl1']?.liquid.volumeMl, 0)
  assert.ok(wetMlOnEveryPlace(room.state) > 0)
})

test('pour_whileTiltIsHeldWithTheSpoutBesideTheBowl_puddlesUnderTheSpoutAndNotAroundTheBowl', () => {
  const room = new RoomVisit()
  room.aimTheKettleAtTheBowl()
  const spout = room.play.aimedPourView?.spout

  room.play.tiltPressed()
  room.wait(2)

  const puddleCentre = room.state.puddles['counter']?.spilledAround
  assertNear(puddleCentre?.x ?? Infinity, spout?.x ?? 0)
  assertNear(puddleCentre?.z ?? Infinity, spout?.z ?? 0)
})

test('pour_whenTheTiltButtonIsReleased_stopsAsTheKettleTiltsBack', () => {
  const room = new RoomVisit()
  room.aimTheKettleAtTheBowl()
  room.moveTheSpout({ x: 0.22, z: 0 })
  room.play.tiltPressed()
  room.wait(2)

  room.play.tiltReleased()
  room.wait(1)

  assert.equal(room.state.pour, null)
  assert.equal(room.play.aimedPourView?.tiltDegrees, 0)
})

test('pourAim_whenDone_endsWithTheKettleStillInHand', () => {
  const room = new RoomVisit()
  room.aimTheKettleAtTheBowl()

  room.play.pourDone()

  assert.equal(room.play.aimedPourView, null)
  assert.equal(room.state.keeper.hands[0], 'kettle')
})

test('cloth_whenTheHeaterIsTappedWithItChosen_liesOnTheHeater', () => {
  const room = new RoomVisit()
  room.walkTo('teaTable')
  room.takeAndChoose('cloth')
  room.walkTo('counter')
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'heater' })

  assert.equal(room.state.heater.itemIdOnTop, 'cloth')
})

test('spoon_whenTheHeaterIsTappedWithItChosen_liesOnTheHeater', () => {
  const room = new RoomVisit()
  room.walkTo('teaTable')
  room.takeAndChoose('spoon')
  room.walkTo('counter')
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'heater' })

  assert.equal(room.state.heater.itemIdOnTop, 'spoon')
})

test('kettle_whenPutDownAtTheSinksEdge_staysInHand', () => {
  const room = new RoomVisit()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })

  room.tap({ kind: 'surface', furnitureId: 'counter', point: { x: -1.22, y: 0.9, z: -2.7 } })

  assert.equal(room.state.vessels['kettle']?.location.kind, 'inHand')
})

test('kettle_whenTheSinkIsTappedWithItChosen_goesInTheSinkUnderTheRunningTap', () => {
  const room = new RoomVisit()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })

  room.tap({ kind: 'faucet' })

  assert.equal(room.state.sink.itemIdInside, 'kettle')
  assert.notEqual(room.state.sink.runningWater, null)
  assert.equal(room.play.chosenHandIndex, null)
})

test('kettle_whenItsLidIsOpenedInTheSink_fillsFromTheTap', () => {
  const room = new RoomVisit()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })
  room.tap({ kind: 'faucet' })

  room.tap({ kind: 'lid', itemId: 'kettle' })
  room.wait(2)

  assertNear(room.state.vessels['kettle']?.liquid.volumeMl ?? 0, 100)
})

test('tap_whenTappedWithNothingChosenWhileRunning_turnsOff', () => {
  const room = new RoomVisit()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })
  room.tap({ kind: 'faucet' })

  room.tap({ kind: 'faucet' })

  assert.equal(room.state.sink.runningWater, null)
  assert.equal(room.state.sink.itemIdInside, 'kettle')
})

test('kettleInTheSink_whenTapped_isTakenBackIntoAHand', () => {
  const room = new RoomVisit()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })
  room.tap({ kind: 'faucet' })

  room.tap({ kind: 'item', itemId: 'kettle' })

  assert.deepEqual(room.state.vessels['kettle']?.location, { kind: 'inHand', handIndex: 0 })
  assert.equal(room.state.sink.itemIdInside, null)
})

test('kettle_whenASurfaceIsTappedWhileAiming_isPutDownThere', () => {
  const room = new RoomVisit()
  room.aimTheKettleAtTheBowl()

  room.play.aimingTapped({ kind: 'surface', furnitureId: 'counter', point: { x: -2, y: 0.9, z: -2.5 } })

  assert.equal(room.play.aimedPourView, null)
  assert.deepEqual(room.state.vessels['kettle']?.location, { kind: 'onSurface', spot: { placeId: 'counter', x: -2, y: 0.9, z: -2.5 } })
})

test('kettle_whenTheBowlIsTappedWhileAiming_returnsToItsHand', () => {
  const room = new RoomVisit()
  room.aimTheKettleAtTheBowl()

  room.play.aimingTapped({ kind: 'item', itemId: 'bowl1' })

  assert.equal(room.play.aimedPourView, null)
  assert.equal(room.state.keeper.hands[0], 'kettle')
})

test('bowl_whenTappedShortlyWithTheKettleInHand_isPickedUp', () => {
  const room = new RoomVisit()
  room.bringABowlToTheCounterAndTakeTheKettle()

  room.tap({ kind: 'item', itemId: 'bowl1' })

  assert.deepEqual(room.state.keeper.hands, ['kettle', 'bowl1', null])
  assert.equal(room.state.pour, null)
})

test('kettleLid_whenTapped_opens', () => {
  const room = new RoomVisit()
  room.walkTo('counter')

  room.tap({ kind: 'lid', itemId: 'kettle' })

  assert.equal(room.state.vessels['kettle']?.isLidOpen, true)
})

test('caddyLid_whenTappedOnTheTeaTable_opens', () => {
  const room = new RoomVisit()
  room.setTheTeaTable()

  room.tap({ kind: 'lid', itemId: 'caddy' })

  assert.equal(room.state.vessels['caddy']?.isLidOpen, true)
})

test('spoon_whenChosenAndTheOpenCaddyIsTapped_fillsWithLeaves', () => {
  const room = new RoomVisit()
  room.setTheTeaTable()
  room.session.dispatch({ type: 'openVesselLid', vesselId: 'caddy' })
  room.takeAndChoose('spoon')

  room.tap({ kind: 'item', itemId: 'caddy' })

  assert.equal(room.state.spoon.grams, 3)
  assert.equal(room.state.vessels['caddy']?.location.kind, 'onSurface')
})

test('spoon_whenFullAndTheOpenKettleIsTapped_tipsTheLeavesIntoIt', () => {
  const room = new RoomVisit()
  room.setTheTeaTable()
  room.session.dispatch({ type: 'openVesselLid', vesselId: 'caddy' })
  room.session.dispatch({ type: 'openVesselLid', vesselId: 'kettle' })
  room.takeAndChoose('spoon')
  room.session.dispatch({ type: 'scoopTea', depth: 1 })

  room.tap({ kind: 'item', itemId: 'kettle' })

  assert.equal(room.state.vessels['kettle']?.leaves?.grams, 3)
  assert.equal(room.state.spoon.grams, 0)
})

test('cloth_whenTappedWithTheSpoonChosen_isTakenIntoTheOtherHand', () => {
  const room = new RoomVisit()
  room.walkTo('teaTable')
  room.takeAndChoose('spoon')

  room.tap({ kind: 'item', itemId: 'cloth' })

  assert.deepEqual(room.state.keeper.hands, ['spoon', 'cloth', null])
})

test('kettle_whenTappedWithAnEmptySpoonChosen_isTakenIntoTheOtherHand', () => {
  const room = new RoomVisit()
  room.setTheTeaTable()
  room.takeAndChoose('spoon')

  room.tap({ kind: 'item', itemId: 'kettle' })

  assert.deepEqual(room.state.keeper.hands, ['spoon', 'kettle', null])
  assert.equal(room.state.vessels['kettle']?.leaves, null)
})

test('spoon_whenTappedAtTheTeaTable_goesIntoTheFirstFreeHand', () => {
  const room = new RoomVisit()
  room.walkTo('teaTable')

  room.tap({ kind: 'item', itemId: 'spoon' })

  assert.deepEqual(room.state.keeper.hands, ['spoon', null, null])
})

test('sipButton_whenTheKettleIsPickedUp_isNotOffered', () => {
  const room = new RoomVisit()
  room.walkTo('counter')

  room.tap({ kind: 'item', itemId: 'kettle' })

  assert.equal(room.play.chosenHandIndex, 0)
  assert.equal(room.play.sippableCupId, null)
})

test('sipButton_whenTheChosenBowlIsEmpty_isNotOffered', () => {
  const room = new RoomVisit()
  room.carryFromTheShelf('bowl1')

  room.tap({ kind: 'hand', handIndex: 0 })

  assert.equal(room.play.sippableCupId, null)
})

test('sip_fromTheChosenBowlOfTea_takesTwentyMillilitres', () => {
  const room = new RoomVisit()
  room.setTheTeaTable()
  room.ritual.pour('kettle', 'bowl1', 4)
  room.session.dispatch({ type: 'pickUp', itemId: 'bowl1' })
  room.tap({ kind: 'hand', handIndex: 0 })
  const volumeBeforeTheSip = room.state.vessels['bowl1']?.liquid.volumeMl ?? 0

  room.play.sipTapped()

  assertNear(room.state.vessels['bowl1']?.liquid.volumeMl ?? 0, volumeBeforeTheSip - 20)
})

test('figurine_whenTappedWithABowlOfTeaChosen_isOfferedIt', () => {
  const room = new RoomVisit()
  room.setTheTeaTable()
  room.ritual.pour('kettle', 'bowl1', 4)
  room.session.dispatch({ type: 'pickUp', itemId: 'bowl1' })
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'figurine', figurineId: 'dragon' })

  assert.equal(room.state.figurines['dragon']?.wasOfferedTeaThisRitual, true)
})

test('figurine_whenTappedAwayFromTheTeaTable_leavesTheKeeperWhereTheyStand', () => {
  const room = new RoomVisit()
  room.walkTo('counter')

  room.tap({ kind: 'figurine', figurineId: 'dragon' })
  room.wait(2)

  assert.deepEqual(room.play.view, { kind: 'closeUp', furnitureId: 'counter' })
})

test('sill_whenItsFigurinesAreTappedFromAfar_isKeptByTheRoomWithADifferentLineEachTime', () => {
  const room = new RoomVisit()
  room.walkTo('counter')

  room.tap({ kind: 'figurine', figurineId: 'dragon' })
  room.tap({ kind: 'figurine', figurineId: 'toad' })

  assert.deepEqual(room.remarks, [
    { kind: 'sillIsTheRoomsOwn', timesTapped: 1 },
    { kind: 'sillIsTheRoomsOwn', timesTapped: 2 },
  ])
})

test('table_whenStrokedWithTheClothOneAndAHalfMetresInTenSeconds_isWipedSlowlyAllOver', () => {
  const room = new RoomVisit()
  room.setTheTeaTable()
  room.ritual.pour('kettle', null, 2)
  room.takeAndChoose('cloth')
  const wetMlBeforeTheStroke = wetMlOnEveryPlace(room.state)

  room.strokeTheTeaTable([{ x: 0.5, z: -1.6 }, { x: 1.25, z: -1.6 }, { x: 0.5, z: -1.6 }], 10)

  assert.ok(wetMlOnEveryPlace(room.state) <= wetMlBeforeTheStroke * 0.2, `${wetMlOnEveryPlace(room.state)} ml of ${wetMlBeforeTheStroke} ml left`)
})

test('table_whileStrokedWithTheCloth_driesBeforeTheFingerLifts', () => {
  const room = new RoomVisit()
  room.setTheTeaTable()
  room.ritual.pour('kettle', null, 2)
  room.takeAndChoose('cloth')
  const wetMlBeforeTheStroke = wetMlOnEveryPlace(room.state)

  room.moveTheClothOverTheTeaTable([{ x: 0.5, z: -1.6 }, { x: 1.25, z: -1.6 }], 5)

  assert.ok(wetMlOnEveryPlace(room.state) < wetMlBeforeTheStroke * 0.5, `${wetMlOnEveryPlace(room.state)} ml of ${wetMlBeforeTheStroke} ml left`)
  assert.ok((room.state.cloths['cloth']?.wetMl ?? 0) > 0, 'the cloth stayed dry')
})

test('table_whenStrokedWithTheClothAwayFromThePuddle_driesOnlyAsATableLeftAlone', () => {
  const [stroked, leftAlone] = [new RoomVisit(), new RoomVisit()]
  for (const room of [stroked, leftAlone]) {
    room.setTheTeaTable()
    room.ritual.pour('kettle', null, 2)
    room.takeAndChoose('cloth')
  }

  stroked.strokeTheTeaTable([{ x: 1.3, z: -1.9 }, { x: 1.6, z: -1.9 }, { x: 1.3, z: -1.9 }], 10)
  leftAlone.wait(10)

  assert.ok(Math.abs(wetMlOnEveryPlace(stroked.state) - wetMlOnEveryPlace(leftAlone.state)) < 0.01, `${wetMlOnEveryPlace(stroked.state)} ml against ${wetMlOnEveryPlace(leftAlone.state)} ml`)
})

test('chosenItem_behindItsGlow_canBePutDownOnTheTableThatTheTapHit', () => {
  const room = new RoomVisit()
  room.setTheTeaTable()
  room.takeAndChoose('cloth')

  const canActOnTheTable = room.play.canTheChosenItemActOn({ kind: 'surface', furnitureId: 'teaTable', point: onTheTeaTable })

  assert.equal(canActOnTheTable, true)
})

test('chosenItem_behindItsGlow_letsTheHandKeepATapOnTheFloor', () => {
  const room = new RoomVisit()
  room.setTheTeaTable()
  room.takeAndChoose('cloth')

  const canActOnTheFloor = room.play.canTheChosenItemActOn({ kind: 'floor', point: { x: 1, z: -0.6 } })

  assert.equal(canActOnTheFloor, false)
})

test('bowl_whenTappedWithTheClothChosen_isTakenIntoTheOtherHand', () => {
  const room = new RoomVisit()
  room.setTheTeaTable()
  room.takeAndChoose('cloth')

  room.tap({ kind: 'item', itemId: 'bowl1' })

  assert.deepEqual(room.state.keeper.hands, ['cloth', 'bowl1', null])
})

test('cloth_whileTheTableIsPressedWithoutMoving_staysInTheHand', () => {
  const room = new RoomVisit()
  room.setTheTeaTable()
  room.takeAndChoose('cloth')

  room.play.pressStarted({ kind: 'surface', furnitureId: 'teaTable', point: onTheTeaTable })

  assert.equal(room.play.clothWiping, null)
})

test('cloth_whileStrokingTheTable_isUnderTheFinger', () => {
  const room = new RoomVisit()
  room.setTheTeaTable()
  room.takeAndChoose('cloth')

  room.moveTheClothOverTheTeaTable([{ x: 0.5, z: -1.6 }, { x: 0.9, z: -1.4 }], 1)

  assert.deepEqual(room.play.clothWiping, { clothId: 'cloth', at: { x: 0.9, y: onTheTeaTable.y, z: -1.4 } })
})

test('cloth_whenTheTeaTableIsTappedAwayFromThePuddle_isPutDownThereAndWipesNothing', () => {
  const room = new RoomVisit()
  room.setTheTeaTable()
  room.ritual.pour('kettle', null, 2)
  room.takeAndChoose('cloth')
  const wetMlBeforeTheTap = wetMlOnEveryPlace(room.state)

  room.tap({ kind: 'surface', furnitureId: 'teaTable', point: { x: 1.45, y: onTheTeaTable.y, z: -1.7 } })

  assert.equal(room.state.cloths['cloth']?.location.kind, 'onSurface')
  assert.equal(wetMlOnEveryPlace(room.state), wetMlBeforeTheTap)
})

test('cloth_whenPutDownInThePuddle_soaksItUpWhileItLies', () => {
  const room = new RoomVisit()
  room.setTheTeaTable()
  room.ritual.pour('kettle', null, 2)
  room.takeAndChoose('cloth')

  room.tap({ kind: 'surface', furnitureId: 'teaTable', point: { x: 0.5, y: onTheTeaTable.y, z: -1.45 } })

  assert.equal(room.state.cloths['cloth']?.location.kind, 'onSurface')
  assert.equal(room.state.cloths['cloth']?.isSoakingThePuddle, true)
})

test('chosenHand_whenTheKeeperLeavesTheCloseUp_isLetGo', () => {
  const room = new RoomVisit()
  room.walkTo('counter')
  room.takeAndChoose('kettle')

  room.tap({ kind: 'floor', point: { x: 1, z: 1 } })

  assert.equal(room.play.chosenHandIndex, null)
})

test('hand_whenTappedInTheRoomView_isNotChosen', () => {
  const room = new RoomVisit()
  room.walkTo('counter')
  room.takeAndChoose('kettle')
  room.tap({ kind: 'floor', point: { x: 1, z: 1 } })

  room.tap({ kind: 'hand', handIndex: 0 })

  assert.equal(room.play.chosenHandIndex, null)
})

test('pour_whenAimedAtABowlOnTheShelf_startsFromTheLeftOfTheScreenAndNotFromBehindTheShelf', () => {
  const room = new RoomVisit()
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
  room.fillInTheSink('kettle')
  room.walkTo('shelf')
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'item', itemId: 'bowl1' })

  const spout = room.play.aimedPourView?.spout
  assertNear(spout?.x ?? 0, -2.772, 0.001)
  assertNear(spout?.z ?? 0, 0.319, 0.001)
})

test('pour_whenTheTiltIsHeldOverTheMiddleOfAnEmptyBowl_spillsNothingOnTheTable', () => {
  const room = new RoomVisit()
  room.aimTheKettleAtTheBowl()
  room.moveTheSpout({ x: 0.22, z: 0 })

  room.play.tiltPressed()
  room.wait(3)

  assert.equal(wetMlOnEveryPlace(room.state), 0)
  assert.ok((room.state.vessels['bowl1']?.liquid.volumeMl ?? 0) > 0, 'the bowl stayed empty')
})

test('bowl_whenPutOnTheHeater_staysInHandAndIsRemarkedOn', () => {
  const room = new RoomVisit()
  room.carryFromTheShelf('bowl1')
  room.walkTo('counter')
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'heater' })

  assert.equal(room.state.heater.itemIdOnTop, null)
  assert.deepEqual(room.remarks, [{ kind: 'bowlKeptOffTheHeater', timesTapped: 1 }])
})

test('heaterTester_onTheItemThatReachesTheVisitsCount_isTeasedInPlaceOfTheItemsOwnLine', () => {
  const room = new RoomVisit(2)
  room.carryFromTheShelf('bowl1', 'caddy')
  room.walkTo('counter')
  room.tap({ kind: 'heaterSwitch' })
  room.tap({ kind: 'hand', handIndex: 0 })
  room.tap({ kind: 'heater' })
  room.tap({ kind: 'hand', handIndex: 1 })

  room.tap({ kind: 'heater' })

  assert.deepEqual(room.remarks, [
    { kind: 'bowlKeptOffTheHeater', timesTapped: 1 },
    { kind: 'heaterTester', timesTapped: 1 },
  ])
})

test('heaterTester_onceTeased_leavesEveryLaterTryToTheItemsOwnLine', () => {
  const room = new RoomVisit(2)
  room.carryFromTheShelf('bowl1', 'caddy')
  room.walkTo('counter')
  room.tap({ kind: 'heaterSwitch' })
  room.tap({ kind: 'hand', handIndex: 0 })
  room.tap({ kind: 'heater' })
  room.tap({ kind: 'hand', handIndex: 1 })
  room.tap({ kind: 'heater' })
  room.putDown(1, onTheCounterBesideTheBowl)
  room.tap({ kind: 'item', itemId: 'kettle' })
  room.tap({ kind: 'heater' })

  room.tap({ kind: 'hand', handIndex: 0 })
  room.tap({ kind: 'heater' })

  assert.equal(room.state.heater.itemIdOnTop, 'kettle')
  assert.deepEqual(room.remarks, [
    { kind: 'bowlKeptOffTheHeater', timesTapped: 1 },
    { kind: 'heaterTester', timesTapped: 1 },
    { kind: 'bowlKeptOffTheHeater', timesTapped: 2 },
  ])
})

test('keeper_whenSippingTeaBrewedInTheCaddyStraightFromIt_dies', () => {
  const room = new RoomVisit()
  room.holdTheCaddyWithHotWaterPouredOntoItsLeaves()

  room.play.sipTapped()

  assert.equal(room.deathsSeen, 1)
})

test('keeper_whenSippingColdTapWaterStraightFromTheCaddy_lives', () => {
  const room = new RoomVisit()
  room.holdTheCaddyWithColdTapWater()
  const mlBeforeTheSip = room.state.vessels['caddy']?.liquid.volumeMl ?? 0

  room.play.sipTapped()

  assert.equal(room.deathsSeen, 0)
  assertNear(mlBeforeTheSip - (room.state.vessels['caddy']?.liquid.volumeMl ?? 0), 20)
})

test('heaterTester_whenTheHeaterIsOff_isNeverTeased', () => {
  const room = new RoomVisit(2)
  room.carryFromTheShelf('bowl1', 'caddy')
  room.walkTo('counter')
  room.tap({ kind: 'hand', handIndex: 0 })
  room.tap({ kind: 'heater' })
  room.tap({ kind: 'hand', handIndex: 1 })

  room.tap({ kind: 'heater' })

  assert.deepEqual(room.remarks, [
    { kind: 'bowlKeptOffTheHeater', timesTapped: 1 },
    { kind: 'caddyKeptOffTheHeater', timesTapped: 1 },
  ])
})

test('shelf_whenTheLastThingIsPutOnIt_isRemarkedOnOnce', () => {
  const room = new RoomVisit()
  room.putEverythingButTheClothOnTheShelf()
  room.walkTo('teaTable')
  room.takeAndChoose('cloth')
  room.walkTo('shelf')
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'surface', furnitureId: 'shelf', point: { x: -2.75, y: 1.22, z: 1.05 } })
  room.takeAndChoose('cloth')
  room.tap({ kind: 'surface', furnitureId: 'shelf', point: { x: -2.75, y: 1.22, z: 1.05 } })

  assert.equal(room.state.cloths['cloth']?.location.kind, 'onSurface')
  assert.deepEqual(room.remarks, [{ kind: 'everythingOnTheShelf', timesTapped: 1 }])
})

test('shelf_withTheClothStillOnTheTeaTable_isNotRemarkedOn', () => {
  const room = new RoomVisit()
  room.putEverythingButTheClothOnTheShelf()
  room.walkTo('shelf')
  room.takeAndChoose('caddy')

  room.tap({ kind: 'surface', furnitureId: 'shelf', point: { x: -2.75, y: 1.22, z: 1.05 } })

  assert.deepEqual(room.remarks, [])
})

test('thirdItem_whenBothHandsAreFull_isRemarkedOn', () => {
  const room = new RoomVisit()
  room.carryFromTheShelf('bowl1', 'caddy')

  room.tap({ kind: 'item', itemId: 'bowl2' })

  assert.deepEqual(room.state.keeper.hands, ['bowl1', 'caddy', null])
  assert.deepEqual(room.remarks, [{ kind: 'handsFull', timesTapped: 1 }])
})

test('thirdBowl_whenBothHandsHoldBowls_isRemarkedOnAsASkillToPractise', () => {
  const room = new RoomVisit()
  room.carryFromTheShelf('bowl1', 'bowl2')

  room.tap({ kind: 'item', itemId: 'bowl3' })
  room.tap({ kind: 'item', itemId: 'caddy' })

  assert.deepEqual(room.remarks, [
    { kind: 'handsFullOfBowls', timesTapped: 1 },
    { kind: 'handsFullOfBowls', timesTapped: 2 },
  ])
})

test('caddy_whenPutOnTheHeaterTwice_isRemarkedOnEachTime', () => {
  const room = new RoomVisit()
  room.carryFromTheShelf('caddy')
  room.walkTo('counter')
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'heater' })
  room.tap({ kind: 'heater' })

  assert.deepEqual(room.remarks, [
    { kind: 'caddyKeptOffTheHeater', timesTapped: 1 },
    { kind: 'caddyKeptOffTheHeater', timesTapped: 2 },
  ])
})

test('roseBush_whenTappedTenTimesInARow_asksForTheDebugMenu', () => {
  const room = new RoomVisit()

  for (let tap = 0; tap < 10; tap += 1) room.tap({ kind: 'roseBush' })

  assert.equal(room.debugMenusAsked, 1)
})

test('roseBush_whenAnotherTapComesBeforeTheTenth_startsCountingAgain', () => {
  const room = new RoomVisit()
  for (let tap = 0; tap < 9; tap += 1) room.tap({ kind: 'roseBush' })
  room.tap({ kind: 'nothing' })

  room.tap({ kind: 'roseBush' })

  assert.equal(room.debugMenusAsked, 0)
})

test('thermosLid_whenTappedWhileAimingTheClosedThermos_opensAndKeepsTheAim', () => {
  const room = new RoomVisit()
  room.aimTheClosedThermosAtTheBowl()

  room.play.aimingTapped({ kind: 'lid', itemId: 'thermos' })

  assert.equal(room.state.vessels['thermos']?.isLidOpen, true)
  assert.equal(room.play.aimedPourView?.sourceId, 'thermos')
})

test('medal_whenTapped_asksForTheListOfAchievements', () => {
  const room = new RoomVisit()

  room.tap({ kind: 'medal' })

  assert.equal(room.achievementListsAsked, 1)
})

test('settingsGear_whenTapped_asksForTheSettings', () => {
  const room = new RoomVisit()

  room.tap({ kind: 'settingsGear' })

  assert.equal(room.settingsAsked, 1)
})

test('middleHand_whenTheSameItemIsTappedTenTimesWithFullHands_growsHoldingItAndChosen', () => {
  const room = new RoomVisit()
  room.carryFromTheShelf('bowl1', 'bowl2')
  room.tapTimes(9, { kind: 'item', itemId: 'bowl3' })

  room.tap({ kind: 'item', itemId: 'bowl3' })

  assert.deepEqual(room.state.keeper.hands, ['bowl1', 'bowl2', 'bowl3'])
  assert.equal(room.play.chosenHandIndex, 2)
})

test('middleHand_whenAnotherItemIsTappedInBetween_countsTheTapsAgain', () => {
  const room = new RoomVisit()
  room.carryFromTheShelf('bowl1', 'bowl2')
  room.tapTimes(9, { kind: 'item', itemId: 'bowl3' })
  room.tap({ kind: 'item', itemId: 'bowl4' })

  room.tapTimes(9, { kind: 'item', itemId: 'bowl3' })

  assert.equal(room.state.keeper.hasAMiddleHand, false)
})

test('middleHand_whenItHasBeenGrownBefore_doesNotGrowAgain', () => {
  const room = new RoomVisit()
  room.mayGrowAMiddleHand = false
  room.carryFromTheShelf('bowl1', 'bowl2')

  room.tapTimes(10, { kind: 'item', itemId: 'bowl3' })

  assert.equal(room.state.keeper.hasAMiddleHand, false)
})

class RoomVisit {
  readonly logLines: string[] = []
  readonly ritual = TestRitual.begun(defaultCatalog, 'sencha', 'quietRoom')
  readonly remarks: RoomRemark[] = []
  debugMenusAsked = 0
  achievementListsAsked = 0
  settingsAsked = 0
  mayGrowAMiddleHand = true
  deathsSeen = 0
  readonly play: RoomPlay

  constructor(heaterItemsBeforeTheTesterJoke = 4) {
    this.play = new RoomPlay(this.ritual.session, defaultCatalog, (message) => this.logLines.push(message), heaterItemsBeforeTheTesterJoke, { remarked: (remark) => this.remarks.push(remark), debugMenuAsked: () => (this.debugMenusAsked += 1), achievementsAsked: () => (this.achievementListsAsked += 1), settingsAsked: () => (this.settingsAsked += 1), mayGrowAMiddleHand: () => this.mayGrowAMiddleHand, keeperDied: () => (this.deathsSeen += 1) })
  }

  get session() {
    return this.ritual.session
  }

  get state() {
    return this.ritual.state
  }

  tap(target: RoomTapTarget): void {
    this.play.pressStarted(target)
    this.play.pressEnded()
  }

  tapTimes(times: number, target: RoomTapTarget): void {
    for (let tap = 0; tap < times; tap += 1) this.tap(target)
  }

  takeAndChoose(itemId: string): void {
    this.tap({ kind: 'item', itemId })
    const handIndex = this.state.keeper.hands.indexOf(itemId)
    if (this.play.chosenHandIndex !== handIndex) throw new Error(`${itemId} did not reach a chosen hand`)
  }

  wait(seconds: number): void {
    this.advance(seconds)
  }

  moveTheSpout(by: FloorPoint): void {
    this.play.pourFingerDown({ x: 0, z: 0 })
    this.play.pourFingerMoved(by)
    this.play.pourFingerUp()
  }

  walkTo(furnitureId: FurnitureId): void {
    this.tap({ kind: 'furniture', furnitureId })
    for (let elapsed = 0; elapsed < longestWalkSeconds && this.play.view.kind !== 'closeUp'; elapsed += frameSeconds) this.advance(frameSeconds)
    assert.deepEqual(this.play.view, { kind: 'closeUp', furnitureId }, this.logLines.join('\n'))
  }

  carryFromTheShelf(...itemIds: string[]): void {
    this.walkTo('shelf')
    for (const itemId of itemIds) this.session.dispatch({ type: 'pickUp', itemId })
  }

  putDown(handIndex: 0 | 1, point: WorldPoint): void {
    const itemId = this.state.keeper.hands[handIndex]
    const placeId = this.state.keeper.placeId
    if (itemId === null || itemId === undefined || placeId === null) throw new Error(`nothing to put down from hand ${handIndex}`)
    this.session.dispatch({ type: 'putDown', itemId, spot: spotOn(placeId, point) })
  }

  bringABowlToTheCounterAndTakeTheKettle(): void {
    this.carryFromTheShelf('bowl1')
    this.walkTo('counter')
    this.putDown(0, onTheCounter)
    this.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
    this.fillInTheSink('kettle')
  }

  aimTheKettleAtTheFirstOfTwoBowls(): void {
    this.carryFromTheShelf('bowl1', 'bowl2')
    this.walkTo('counter')
    this.putDown(0, onTheCounter)
    this.putDown(1, onTheCounterBesideTheBowl)
    this.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
    this.fillInTheSink('kettle')
    this.tap({ kind: 'hand', handIndex: 0 })
    this.tap({ kind: 'item', itemId: 'bowl1' })
  }

  aimTheClosedThermosAtTheBowl(): void {
    this.carryFromTheShelf('bowl1')
    this.walkTo('counter')
    this.putDown(0, onTheCounter)
    this.session.dispatch({ type: 'pickUp', itemId: 'thermos' })
    this.fillInTheSink('thermos')
    this.tap({ kind: 'hand', handIndex: 0 })
    this.tap({ kind: 'item', itemId: 'bowl1' })
  }

  aimTheKettleAtTheBowl(): void {
    this.bringABowlToTheCounterAndTakeTheKettle()
    this.tap({ kind: 'hand', handIndex: 0 })
    this.tap({ kind: 'item', itemId: 'bowl1' })
  }

  setTheTeaTable(): void {
    this.carryFromTheShelf('bowl1', 'caddy')
    this.walkTo('teaTable')
    this.putDown(0, { x: 0.8, y: 0.42, z: -1.5 })
    this.putDown(1, { x: 1.2, y: 0.42, z: -1.5 })
    this.walkTo('counter')
    this.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
    this.fillInTheSink('kettle')
    this.walkTo('teaTable')
    this.putDown(0, { x: 1, y: 0.42, z: -1.8 })
  }

  strokeTheTeaTable(corners: readonly FloorPoint[], seconds: number): void {
    this.moveTheClothOverTheTeaTable(corners, seconds)
    this.play.pressEnded()
  }

  moveTheClothOverTheTeaTable(corners: readonly FloorPoint[], seconds: number): void {
    const [start, ...rest] = corners
    if (start === undefined) return
    this.play.pressStarted(surfaceOfTheTeaTableAt(start))
    const framesPerLeg = Math.round(seconds / frameSeconds / rest.length)
    let from = start
    for (const to of rest) {
      for (let frame = 1; frame <= framesPerLeg; frame += 1) {
        this.advance(frameSeconds)
        this.play.pressMovedAway()
        this.play.pressMovedOver(surfaceOfTheTeaTableAt({ x: from.x + ((to.x - from.x) * frame) / framesPerLeg, z: from.z + ((to.z - from.z) * frame) / framesPerLeg }))
      }
      from = to
    }
  }

  holdTheCaddyWithHotWaterPouredOntoItsLeaves(): void {
    this.carryFromTheShelf('caddy')
    this.walkTo('counter')
    this.putDown(0, onTheCounterBesideTheBowl)
    this.session.dispatch({ type: 'openVesselLid', vesselId: 'caddy' })
    this.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
    this.fillInTheSink('kettle')
    this.ritual.heatKettleTo(90)
    this.ritual.pour('kettle', 'caddy', 4)
    this.session.dispatch({ type: 'pickUp', itemId: 'caddy' })
    this.tap({ kind: 'hand', handIndex: this.state.keeper.hands[0] === 'caddy' ? 0 : 1 })
  }

  putEverythingButTheClothOnTheShelf(): void {
    const onTheTopShelf = (z: number): Spot => ({ placeId: 'shelf', x: -2.75, y: 1.22, z })
    this.walkTo('counter')
    this.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
    this.session.dispatch({ type: 'pickUp', itemId: 'thermos' })
    this.walkTo('shelf')
    this.session.dispatch({ type: 'putDown', itemId: 'kettle', spot: onTheTopShelf(0.3) })
    this.session.dispatch({ type: 'putDown', itemId: 'thermos', spot: onTheTopShelf(0.7) })
    this.walkTo('teaTable')
    this.session.dispatch({ type: 'pickUp', itemId: 'spoon' })
    this.walkTo('shelf')
    this.session.dispatch({ type: 'putDown', itemId: 'spoon', spot: { placeId: 'shelf', x: -2.75, y: 0.07, z: -0.45 } })
  }

    holdTheCaddyWithColdTapWater(): void {
    this.carryFromTheShelf('caddy')
    this.walkTo('counter')
    this.session.dispatch({ type: 'openVesselLid', vesselId: 'caddy' })
    this.session.dispatch({ type: 'putInTheSink', itemId: 'caddy' })
    this.advance(4)
    this.session.dispatch({ type: 'turnTheTapOff' })
    this.session.dispatch({ type: 'pickUp', itemId: 'caddy' })
    this.tap({ kind: 'hand', handIndex: this.state.keeper.hands[0] === 'caddy' ? 0 : 1 })
  }

  fillInTheSink(vesselId: string): void {
    this.session.dispatch({ type: 'openVesselLid', vesselId })
    this.session.dispatch({ type: 'putInTheSink', itemId: vesselId })
    this.advance(10)
    this.session.dispatch({ type: 'turnTheTapOff' })
    this.session.dispatch({ type: 'pickUp', itemId: vesselId })
  }

  private advance(seconds: number): void {
    for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += frameSeconds) {
      this.play.advance(frameSeconds)
      this.session.advance(frameSeconds)
    }
  }
}

function surfaceOfTheTeaTableAt(point: FloorPoint): RoomTapTarget {
  return { kind: 'surface', furnitureId: 'teaTable', point: { x: point.x, y: onTheTeaTable.y, z: point.z } }
}

function spotOn(placeId: string, point: WorldPoint): Spot {
  return { placeId, x: point.x, y: point.y, z: point.z }
}
