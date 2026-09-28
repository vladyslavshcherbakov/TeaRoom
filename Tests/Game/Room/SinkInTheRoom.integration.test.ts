import assert from 'node:assert/strict'
import test from 'node:test'
import { assertNear } from '../../Support/Assertions.ts'
import { TestRoom } from '../../Support/TestRoom.ts'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import { definitionIn } from '../../../Shared/Engine/Catalog.ts'
import { itemIdsInTheHands, itemIdInTheSink } from '../../../Shared/GameLogic/State/WhereItemsAre.ts'

const tapFlowMlPerSecond = definitionIn(defaultCatalog, 'rooms', 'quietRoom').tap?.flowMlPerSecond ?? Number.NaN

test('kettle_whenTheSinkIsTappedWithItChosen_goesInTheSinkWithTheTapClosed', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })

  room.tap({ kind: 'sink' })

  assert.equal(itemIdInTheSink(room.state), 'kettle')
  assert.equal(room.state.sink.runningWater, null)
  assert.equal(room.playerController.chosenHandIndex, null)
})

test('sink_whenTappedWithNoHandChosen_staysEmpty', () => {
  const room = new TestRoom()
  room.walkTo('counter')

  room.tap({ kind: 'sink' })

  assert.equal(itemIdInTheSink(room.state), null)
  assert.equal(room.state.sink.runningWater, null)
})

test('kettle_whenItsLidIsOpenedInTheSinkUnderTheTurnedOnTap_fillsFromTheTap', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })
  room.tap({ kind: 'sink' })
  room.tap({ kind: 'faucet' })

  room.tap({ kind: 'lid', itemId: 'kettle' })
  room.advance(2)

  assertNear(room.state.vessels['kettle']?.liquid.volumeMl ?? 0, tapFlowMlPerSecond * 2)
})

test('faucet_whenTappedWithTheKettleChosen_turnsTheTapOnAndKeepsTheKettleInHand', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })

  room.tap({ kind: 'faucet' })

  assert.notEqual(room.state.sink.runningWater, null)
  assert.deepEqual(room.state.vessels['kettle']?.location, { kind: 'inHand', handIndex: 0 })
  assert.equal(room.playerController.chosenHandIndex, 0)
})

test('faucet_whenTappedWithBothHandsFull_turnsTheRunningTapOff', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'faucet' })
  room.tap({ kind: 'item', itemId: 'kettle' })
  room.tap({ kind: 'item', itemId: 'thermos' })

  room.tap({ kind: 'faucet' })

  assert.equal(room.state.sink.runningWater, null)
  assert.deepEqual(itemIdsInTheHands(room.state), ['kettle', 'thermos', null])
})

test('faucet_whileTheKettleStandsInTheSink_turnsTheTapOnAndOff', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })
  room.tap({ kind: 'sink' })
  room.tap({ kind: 'faucet' })

  room.tap({ kind: 'faucet' })

  assert.equal(room.state.sink.runningWater, null)
  assert.equal(itemIdInTheSink(room.state), 'kettle')
})

test('faucet_behindTheChosenHandsTouchArea_isReachedByATap', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })

  assert.equal(room.playerController.doesATapReachPastTheChosenHand({ kind: 'faucet' }), true)
})

test('kettleInTheSink_whenTapped_isTakenBackIntoAHand', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })
  room.tap({ kind: 'sink' })

  room.tap({ kind: 'item', itemId: 'kettle' })

  assert.deepEqual(room.state.vessels['kettle']?.location, { kind: 'inHand', handIndex: 0 })
  assert.equal(itemIdInTheSink(room.state), null)
})

test('bowlInTheSink_whenTheKettleIsAimedAtItAndTilted_fills', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1')
  room.walkTo('counter')
  room.testSession.doWithoutARefusal({ type: 'pickUp', itemId: 'kettle' })
  room.fillInTheSink('kettle')
  room.tap({ kind: 'hand', handIndex: 0 })
  room.tap({ kind: 'sink' })
  room.tap({ kind: 'hand', handIndex: 1 })
  room.tap({ kind: 'opening', itemId: 'bowl1' })
  const bowlSpot = room.state.vessels['bowl1']?.location
  const spout = room.playerController.aimedPourView?.spout
  if (bowlSpot?.kind !== 'inTheSink' || spout === undefined) throw new Error('the kettle is not aimed at the bowl in the sink')
  room.moveTheSpout({ x: bowlSpot.spot.x - spout.x, z: bowlSpot.spot.z - spout.z })

  room.playerController.tiltPressed()
  room.advance(2)

  assert.ok((room.state.vessels['bowl1']?.liquid.volumeMl ?? 0) > 0)
})
