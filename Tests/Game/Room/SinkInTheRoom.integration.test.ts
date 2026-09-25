import assert from 'node:assert/strict'
import test from 'node:test'
import { assertNear } from '../../Support/Assertions.ts'
import { TestRoom } from '../../Support/TestRoom.ts'

test('kettle_whenTheSinkIsTappedWithItChosen_goesInTheSinkUnderTheRunningTap', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })

  room.tap({ kind: 'faucet' })

  assert.equal(room.state.sink.itemIdInside, 'kettle')
  assert.notEqual(room.state.sink.runningWater, null)
  assert.equal(room.play.chosenHandIndex, null)
})

test('kettle_whenItsLidIsOpenedInTheSink_fillsFromTheTap', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })
  room.tap({ kind: 'faucet' })

  room.tap({ kind: 'lid', itemId: 'kettle' })
  room.advance(2)

  assertNear(room.state.vessels['kettle']?.liquid.volumeMl ?? 0, 100)
})

test('tap_whenTappedWithNothingChosenWhileRunning_turnsOff', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })
  room.tap({ kind: 'faucet' })

  room.tap({ kind: 'faucet' })

  assert.equal(room.state.sink.runningWater, null)
  assert.equal(room.state.sink.itemIdInside, 'kettle')
})

test('kettleInTheSink_whenTapped_isTakenBackIntoAHand', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })
  room.tap({ kind: 'faucet' })

  room.tap({ kind: 'item', itemId: 'kettle' })

  assert.deepEqual(room.state.vessels['kettle']?.location, { kind: 'inHand', handIndex: 0 })
  assert.equal(room.state.sink.itemIdInside, null)
})
