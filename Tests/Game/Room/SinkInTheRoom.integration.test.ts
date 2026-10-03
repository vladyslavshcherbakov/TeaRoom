import assert from 'node:assert/strict'
import test from 'node:test'
import { assertNear } from '../../Support/Assertions.ts'
import { TestRoom } from '../../Support/TestRoom.ts'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import { definitionIn } from '../../../Shared/Engine/Catalog.ts'
import { itemIdsInTheHands, itemIdInTheSink } from '../../../Shared/GameLogic/State/WhereItemsAre.ts'

const secondsTheTapRunsOverTheThermos = 120
const tapFlowMlPerSecond = definitionIn(defaultCatalog, 'rooms', 'quietRoom').tap?.flowMlPerSecond ?? Number.NaN

test('kettle_whenPutInTheSinkFromTheMenuWithTheTapClosed_goesInWithTheTapStillClosed', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.take('kettle')

  room.tapAndChoose({ kind: 'sink' }, 'putInTheSink', 'kettle')

  assert.equal(itemIdInTheSink(room.state), 'kettle')
  assert.equal(room.state.sink.runningWater, null)
})

test('sink_whenTappedWithNothingInHand_opensNoMenuAndStaysEmpty', () => {
  const room = new TestRoom()
  room.walkTo('counter')

  room.tap({ kind: 'sink' })

  assert.equal(room.playerController.actionMenuView, null)
  assert.equal(itemIdInTheSink(room.state), null)
  assert.equal(room.state.sink.runningWater, null)
})

test('sink_whenTappedWithTheKettleInHandAndTheTapRunning_asksWhetherToFillOrWashIt', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'faucet' })
  room.take('kettle')

  room.tap({ kind: 'sink' })

  assert.deepEqual(room.actionsOffered(), ['fillWithWater kettle', 'wash kettle'])
})

test('kettle_whenPutUnderTheRunningTapToFill_opensItsLidAndFills', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'faucet' })
  room.take('kettle')

  room.tapAndChoose({ kind: 'sink' }, 'fillWithWater', 'kettle')
  room.advance(2)

  assert.equal(room.state.vessels['kettle']?.isLidOpen, true)
  assertNear(room.state.vessels['kettle']?.liquid.volumeMl ?? 0, tapFlowMlPerSecond * 2)
})

test('faucet_whenTappedWithTheKettleInTheSink_asksWhetherToFillOrWashIt', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.take('kettle')
  room.tapAndChoose({ kind: 'sink' }, 'putInTheSink')

  room.tap({ kind: 'faucet' })

  assert.deepEqual(room.actionsOffered(), ['fillWithWater kettle', 'wash kettle'])
  assert.equal(room.state.sink.runningWater, null)
})

test('kettleInTheSink_whenWashingIsChosen_hasTheTapRunToWashWithItsLidOpen', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.take('kettle')
  room.tapAndChoose({ kind: 'sink' }, 'putInTheSink')

  room.tapAndChoose({ kind: 'faucet' }, 'wash')

  assert.equal(room.state.sink.runningWater?.use, 'wash')
  assert.equal(room.state.vessels['kettle']?.isLidOpen, true)
})

test('kettleLid_openedForTheTap_staysOpenWhenTheTapIsTurnedOff', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.take('kettle')
  room.tapAndChoose({ kind: 'sink' }, 'putInTheSink')
  room.tapAndChoose({ kind: 'faucet' }, 'fillWithWater')

  room.tap({ kind: 'faucet' })

  assert.equal(room.state.sink.runningWater, null)
  assert.equal(room.state.vessels['kettle']?.isLidOpen, true)
})

test('cloth_underTheRunningTap_canOnlyBeWashed', () => {
  const room = new TestRoom()
  room.walkTo('teaTable')
  room.take('cloth')
  room.walkTo('counter')
  room.tap({ kind: 'faucet' })

  room.tap({ kind: 'sink' })

  assert.deepEqual(room.actionsOffered(), ['wash cloth'])
})

test('faucet_whenTappedWithTheSinkEmpty_turnsTheTapOnWithNoMenu', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.take('kettle')

  room.tap({ kind: 'faucet' })

  assert.notEqual(room.state.sink.runningWater, null)
  assert.equal(room.playerController.actionMenuView, null)
  assert.deepEqual(room.state.vessels['kettle']?.location, { kind: 'inHand', handIndex: 0 })
})

test('faucet_whenTappedWithBothHandsFull_turnsTheRunningTapOff', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'faucet' })
  room.take('kettle')
  room.take('thermos')

  room.tap({ kind: 'faucet' })

  assert.equal(room.state.sink.runningWater, null)
  assert.deepEqual(itemIdsInTheHands(room.state), ['kettle', 'thermos'])
})

test('faucet_behindAHandsTouchArea_isReachedByATap', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.take('kettle')

  assert.equal(room.playerController.doesATapReachPastTheHands({ kind: 'faucet' }), true)
})

test('kettleInTheSink_whenTakenFromTheMenu_comesBackIntoAHand', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.take('kettle')
  room.tapAndChoose({ kind: 'sink' }, 'putInTheSink')

  room.tapAndChoose({ kind: 'item', itemId: 'kettle' }, 'take')

  assert.deepEqual(room.state.vessels['kettle']?.location, { kind: 'inHand', handIndex: 0 })
  assert.equal(itemIdInTheSink(room.state), null)
})

test('bowlInTheSink_whenTheKettleIsAimedAtItAndTilted_fills', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1')
  room.walkTo('counter')
  room.testSession.doWithoutARefusal({ type: 'pickUp', itemId: 'kettle' })
  room.fillInTheSink('kettle')
  room.tapAndChoose({ kind: 'sink' }, 'putInTheSink', 'bowl')
  room.tapAndChoose({ kind: 'item', itemId: 'bowl1' }, 'pourInto', 'kettle', 'bowl')
  const bowlSpot = room.state.vessels['bowl1']?.location
  const spout = room.playerController.aimedPourView?.spout
  if (bowlSpot?.kind !== 'inTheSink' || spout === undefined) throw new Error('the kettle is not aimed at the bowl in the sink')
  room.moveTheSpout({ x: bowlSpot.spot.x - spout.x, z: bowlSpot.spot.z - spout.z })

  room.playerController.tiltPressed()
  room.advance(2)

  assert.ok((room.state.vessels['bowl1']?.liquid.volumeMl ?? 0) > 0)
})

test('thermos_whenTakenOutAfterItWasWashedPastItsRim_isPouredEmpty', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.testSession.doWithoutARefusal({ type: 'pickUp', itemId: 'thermos' })
  room.testSession.doWithoutARefusal({ type: 'openVesselLid', vesselId: 'thermos' })

  room.testSession.washInTheSink('thermos', secondsTheTapRunsOverTheThermos)

  assert.equal(room.state.vessels['thermos']?.liquid.volumeMl, 0)
})
