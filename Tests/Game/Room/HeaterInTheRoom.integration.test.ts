import assert from 'node:assert/strict'
import test from 'node:test'
import { TestRoom } from '../../Support/TestRoom.ts'
import { itemIdsInTheHands, itemIdOnTheHeater } from '../../../Shared/GameLogic/State/WhereItemsAre.ts'
import { isHeating } from '../../../Shared/GameLogic/Judgement/HeaterModes.ts'

test('kettle_whenPutOnTheHeaterFromTheMenu_sitsOnTheHeater', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.take('kettle')

  room.tapAndChoose({ kind: 'heater' }, 'putOnTheHeater', 'kettle')

  assert.equal(itemIdOnTheHeater(room.state), 'kettle')
  assert.deepEqual(itemIdsInTheHands(room.state), [null, null])
})

test('heater_whenTappedWithTheKettleAndTheThermosInHand_offersToPutEitherOnIt', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.take('kettle')
  room.take('thermos')

  room.tap({ kind: 'heater' })

  assert.deepEqual(room.actionsOffered(), ['putOnTheHeater kettle', 'putOnTheHeater thermos'])
})

test('heaterSwitch_whenTapped_switchesTheHeaterOn', () => {
  const room = new TestRoom()
  room.walkTo('counter')

  room.tap({ kind: 'heaterSwitch' })

  assert.equal(isHeating(room.state.heater.mode), true)
})

test('heaterSwitch_whenTappedWithBothHandsFull_switchesTheHeaterOnWithNoMenu', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.take('kettle')
  room.take('thermos')

  room.tap({ kind: 'heaterSwitch' })

  assert.equal(isHeating(room.state.heater.mode), true)
  assert.equal(room.playerController.actionMenuView, null)
  assert.deepEqual(itemIdsInTheHands(room.state), ['kettle', 'thermos'])
})

test('heaterPanel_whenTappedWithBothHandsFull_leavesTheHandsAndTheHeaterAsTheyWere', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.take('kettle')
  room.take('thermos')

  room.tap({ kind: 'heaterPanel' })

  assert.deepEqual(itemIdsInTheHands(room.state), ['kettle', 'thermos'])
  assert.equal(room.playerController.actionMenuView, null)
  assert.deepEqual({ isOn: isHeating(room.state.heater.mode), itemIdOnTheHeater: itemIdOnTheHeater(room.state) }, { isOn: false, itemIdOnTheHeater: null })
})

test('heaterPanel_behindAHandsTouchArea_isReachedByATap', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.take('kettle')

  assert.equal(room.playerController.doesATapReachPastTheHands({ kind: 'heaterPanel' }), true)
})

test('heaterSwitch_behindAHandsTouchArea_isReachedByATap', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.take('kettle')

  assert.equal(room.playerController.doesATapReachPastTheHands({ kind: 'heaterSwitch' }), true)
})

test('heaterTap_withNothingInHand_opensNoMenuAndLeavesTheHeaterEmpty', () => {
  const room = new TestRoom()
  room.walkTo('counter')

  room.tap({ kind: 'heater' })

  assert.equal(room.playerController.actionMenuView, null)
  assert.equal(itemIdOnTheHeater(room.state), null)
})

test('cloth_whenPutOnTheHeaterFromTheMenu_liesOnTheHeater', () => {
  const room = new TestRoom()
  room.walkTo('teaTable')
  room.take('cloth')
  room.walkTo('counter')

  room.tapAndChoose({ kind: 'heater' }, 'putOnTheHeater', 'cloth')

  assert.equal(itemIdOnTheHeater(room.state), 'cloth')
})

test('spoon_whenPutOnTheHeaterFromTheMenu_liesOnTheHeater', () => {
  const room = new TestRoom()
  room.walkTo('teaTable')
  room.take('spoon')
  room.walkTo('counter')

  room.tapAndChoose({ kind: 'heater' }, 'putOnTheHeater', 'spoon')

  assert.equal(itemIdOnTheHeater(room.state), 'spoon')
})
