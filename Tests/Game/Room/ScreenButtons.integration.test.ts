import assert from 'node:assert/strict'
import test from 'node:test'
import { TestRoom } from '../../Support/TestRoom.ts'

test('whyPouringButton_whileAPourIsAimed_explainsThePour', () => {
  const room = new TestRoom()
  room.bringABowlToTheCounterAndTakeTheKettle()
  room.tapAndChoose({ kind: 'item', itemId: 'bowl1' }, 'pourInto')

  room.playerController.screenButtonPressed('whyPouring')

  assert.deepEqual(room.barks.filter((bark) => bark.kind === 'whyPouring'), [{ kind: 'whyPouring', timesMade: 1 }])
})

test('whyPouringButton_withNoPourAimed_isRefusedAndExplainsNothing', () => {
  const room = new TestRoom()

  room.playerController.screenButtonPressed('whyPouring')

  assert.deepEqual([room.barks, room.logLines.filter((line) => line.includes('why a pour is aimed refused'))], [[], ['the question why a pour is aimed refused: nothing is going on']])
})

test('leaveFirstPersonButton_whenPressed_asksToLeaveFirstPerson', () => {
  const room = new TestRoom()

  room.playerController.screenButtonPressed('leaveFirstPerson')

  assert.equal(room.firstPersonLeaves, 1)
})

test('tiltButton_whenPressedAndLetGoWhileAiming_tiltsTheVesselAndTipsItBack', () => {
  const room = new TestRoom()
  room.bringABowlToTheCounterAndTakeTheKettle()
  room.tapAndChoose({ kind: 'item', itemId: 'bowl1' }, 'pourInto')
  room.playerController.screenButtonPressed('tilt')
  room.advance(1)
  const tiltWhileHeld = room.playerController.aimedPourView?.tiltDegrees ?? 0

  room.playerController.screenButtonReleased('tilt')
  room.advance(2)

  assert.deepEqual([tiltWhileHeld > 0, room.playerController.aimedPourView?.tiltDegrees], [true, 0])
})
