import assert from 'node:assert/strict'
import test from 'node:test'
import { TestRoom } from '../../Support/TestRoom.ts'

test('kettle_whenItsHandIsChosenAndTheHeaterIsTapped_sitsOnTheHeater', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })

  room.tap({ kind: 'heater' })

  assert.equal(room.state.heater.itemIdOnTop, 'kettle')
  assert.deepEqual(room.state.keeper.hands, [null, null, null])
})

test('heaterSwitch_whenTapped_switchesTheHeaterOn', () => {
  const room = new TestRoom()
  room.walkTo('counter')

  room.tap({ kind: 'heaterSwitch' })

  assert.equal(room.state.heater.isOn, true)
})

test('heaterSwitch_whenTappedWithBothHandsFullAndOneChosen_switchesTheHeaterOn', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })
  room.tap({ kind: 'item', itemId: 'thermos' })

  room.tap({ kind: 'heaterSwitch' })

  assert.equal(room.state.heater.isOn, true)
  assert.deepEqual(room.state.keeper.hands, ['kettle', 'thermos', null])
})

test('heaterSwitch_behindTheChosenHandsTouchArea_isReachedByATap', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })

  assert.equal(room.play.doesATapReachPastTheChosenHand({ kind: 'heaterSwitch' }), true)
})

test('heaterTap_withNoHandChosen_leavesTheHeaterEmpty', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'heater' })

  assert.equal(room.state.heater.itemIdOnTop, null)
  assert.ok(room.logLines.includes('tap on the heater ignored: no hand is chosen'), room.logLines.join('\n'))
})

test('cloth_whenTheHeaterIsTappedWithItChosen_liesOnTheHeater', () => {
  const room = new TestRoom()
  room.walkTo('teaTable')
  room.takeAndChoose('cloth')
  room.walkTo('counter')

  room.tap({ kind: 'heater' })

  assert.equal(room.state.heater.itemIdOnTop, 'cloth')
})

test('spoon_whenTheHeaterIsTappedWithItChosen_liesOnTheHeater', () => {
  const room = new TestRoom()
  room.walkTo('teaTable')
  room.takeAndChoose('spoon')
  room.walkTo('counter')

  room.tap({ kind: 'heater' })

  assert.equal(room.state.heater.itemIdOnTop, 'spoon')
})
