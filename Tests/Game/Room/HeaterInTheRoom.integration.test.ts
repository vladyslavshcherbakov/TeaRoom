import assert from 'node:assert/strict'
import test from 'node:test'
import { TestRoom } from '../../Support/TestRoom.ts'
import { itemIdsInTheHands, itemIdOnTheHeater } from '../../../Shared/GameLogic/State/WhereItemsAre.ts'
import { isHeating } from '../../../Shared/GameLogic/Judgement/HeaterModes.ts'

test('kettle_whenItsHandIsChosenAndTheHeaterIsTapped_sitsOnTheHeater', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })

  room.tap({ kind: 'heater' })

  assert.equal(itemIdOnTheHeater(room.state), 'kettle')
  assert.deepEqual(itemIdsInTheHands(room.state), [null, null, null])
})

test('heaterSwitch_whenTapped_switchesTheHeaterOn', () => {
  const room = new TestRoom()
  room.walkTo('counter')

  room.tap({ kind: 'heaterSwitch' })

  assert.equal(isHeating(room.state.heater.mode), true)
})

test('heaterSwitch_whenTappedWithBothHandsFullAndOneChosen_switchesTheHeaterOn', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })
  room.tap({ kind: 'item', itemId: 'thermos' })

  room.tap({ kind: 'heaterSwitch' })

  assert.equal(isHeating(room.state.heater.mode), true)
  assert.deepEqual(itemIdsInTheHands(room.state), ['kettle', 'thermos', null])
})

test('heaterPanel_whenTappedWithBothHandsFullAndOneChosen_leavesTheHandsTheChoiceAndTheHeaterAsTheyWere', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })
  room.tap({ kind: 'item', itemId: 'thermos' })

  room.tap({ kind: 'heaterPanel' })

  assert.deepEqual(itemIdsInTheHands(room.state), ['kettle', 'thermos', null])
  assert.equal(room.playerController.chosenHandIndex, 1)
  assert.deepEqual({ isOn: isHeating(room.state.heater.mode), itemIdOnTheHeater: itemIdOnTheHeater(room.state) }, { isOn: false, itemIdOnTheHeater: null })
})

test('heaterPanel_behindTheChosenHandsTouchArea_isReachedByATap', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })

  assert.equal(room.playerController.doesATapReachPastTheChosenHand({ kind: 'heaterPanel' }), true)
})

test('heaterSwitch_behindTheChosenHandsTouchArea_isReachedByATap', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })

  assert.equal(room.playerController.doesATapReachPastTheChosenHand({ kind: 'heaterSwitch' }), true)
})

test('heaterTap_withNoHandChosen_leavesTheHeaterEmpty', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'heater' })

  assert.equal(itemIdOnTheHeater(room.state), null)
})

test('cloth_whenTheHeaterIsTappedWithItChosen_liesOnTheHeater', () => {
  const room = new TestRoom()
  room.walkTo('teaTable')
  room.takeAndChoose('cloth')
  room.walkTo('counter')

  room.tap({ kind: 'heater' })

  assert.equal(itemIdOnTheHeater(room.state), 'cloth')
})

test('spoon_whenTheHeaterIsTappedWithItChosen_liesOnTheHeater', () => {
  const room = new TestRoom()
  room.walkTo('teaTable')
  room.takeAndChoose('spoon')
  room.walkTo('counter')

  room.tap({ kind: 'heater' })

  assert.equal(itemIdOnTheHeater(room.state), 'spoon')
})
