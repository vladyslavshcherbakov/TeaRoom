import assert from 'node:assert/strict'
import test from 'node:test'
import { assertNear } from '../../Support/Assertions.ts'
import { TestRoom } from '../../Support/TestRoom.ts'

test('kettle_whenTheSinkIsTappedWithItChosen_goesInTheSinkWithTheTapClosed', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })

  room.tap({ kind: 'sink' })

  assert.equal(room.state.sink.itemIdInside, 'kettle')
  assert.equal(room.state.sink.runningWater, null)
  assert.equal(room.play.chosenHandIndex, null)
})

test('sink_whenTappedWithNoHandChosen_staysEmpty', () => {
  const room = new TestRoom()
  room.walkTo('counter')

  room.tap({ kind: 'sink' })

  assert.equal(room.state.sink.itemIdInside, null)
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

  assertNear(room.state.vessels['kettle']?.liquid.volumeMl ?? 0, 100)
})

test('faucet_whenTappedWithTheKettleChosen_turnsTheTapOnAndKeepsTheKettleInHand', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })

  room.tap({ kind: 'faucet' })

  assert.notEqual(room.state.sink.runningWater, null)
  assert.deepEqual(room.state.vessels['kettle']?.location, { kind: 'inHand', handIndex: 0 })
  assert.equal(room.play.chosenHandIndex, 0)
})

test('faucet_whenTappedWithBothHandsFull_turnsTheRunningTapOff', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'faucet' })
  room.tap({ kind: 'item', itemId: 'kettle' })
  room.tap({ kind: 'hand', handIndex: 0 })
  room.tap({ kind: 'item', itemId: 'thermos' })

  room.tap({ kind: 'faucet' })

  assert.equal(room.state.sink.runningWater, null)
  assert.deepEqual(room.state.keeper.hands, ['kettle', 'thermos', null])
})

test('faucet_whileTheKettleStandsInTheSink_turnsTheTapOnAndOff', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })
  room.tap({ kind: 'sink' })
  room.tap({ kind: 'faucet' })

  room.tap({ kind: 'faucet' })

  assert.equal(room.state.sink.runningWater, null)
  assert.equal(room.state.sink.itemIdInside, 'kettle')
})

test('faucet_behindTheChosenHandsTouchArea_isReachedByATap', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })

  assert.equal(room.play.doesATapReachPastTheChosenHand({ kind: 'faucet' }), true)
})

test('kettleInTheSink_whenTapped_isTakenBackIntoAHand', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })
  room.tap({ kind: 'sink' })

  room.tap({ kind: 'item', itemId: 'kettle' })

  assert.deepEqual(room.state.vessels['kettle']?.location, { kind: 'inHand', handIndex: 0 })
  assert.equal(room.state.sink.itemIdInside, null)
})
