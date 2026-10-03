import assert from 'node:assert/strict'
import test from 'node:test'
import { screenControlsShown, type ScreenSituation } from '../../../../Apps/Game/Room/Screen/ScreenControls.ts'

const inTheRoomView: ScreenSituation = { cameraMode: 'room', controlScheme: 'twoSticks', stickLayout: 'walkOnTheLeft', mode: 'free' }
const inFirstPerson: ScreenSituation = { ...inTheRoomView, cameraMode: 'firstPerson' }
const noButtons = { tilt: false, whyPouring: false, leaveFirstPerson: false }

test('screenControls_inTheRoomView_showNoButtonsNoSticksAndHoldNoMouse', () => {
  assert.deepEqual(screenControlsShown(inTheRoomView), { buttons: noButtons, leftStick: false, rightStick: false, mayHoldTheMouse: false })
})

test('screenControls_inFirstPersonWithTwoSticks_showBothSticksAndTheWayOut', () => {
  assert.deepEqual(screenControlsShown(inFirstPerson), { buttons: { ...noButtons, leaveFirstPerson: true }, leftStick: true, rightStick: true, mayHoldTheMouse: false })
})

test('screenControls_inFirstPersonWithTheMouseAndKeyboard_holdTheMouseAndShowNoSticks', () => {
  const shown = screenControlsShown({ ...inFirstPerson, controlScheme: 'mouseAndKeyboard' })

  assert.deepEqual([shown.leftStick, shown.rightStick, shown.mayHoldTheMouse], [false, false, true])
})

test('screenControls_whileAimingInFirstPerson_showThePourButtonsAndLetGoOfTheSticksAndTheMouse', () => {
  const shown = screenControlsShown({ ...inFirstPerson, controlScheme: 'mouseAndWalkStick', mode: 'aiming' })

  assert.deepEqual([shown.buttons, shown.leftStick, shown.rightStick, shown.mayHoldTheMouse], [{ tilt: true, whyPouring: true, leaveFirstPerson: true }, false, false, false])
})

test('screenControls_whileInspectingInFirstPerson_letGoOfTheSticks', () => {
  const shown = screenControlsShown({ ...inFirstPerson, mode: 'lookingClosely' })

  assert.deepEqual([shown.leftStick, shown.rightStick], [false, false])
})

test('screenControls_whileAMenuOfActionsIsOpenInFirstPerson_letGoOfTheSticksAndTheMouse', () => {
  const shown = screenControlsShown({ ...inFirstPerson, controlScheme: 'mouseAndWalkStick', mode: 'choosing' })

  assert.deepEqual([shown.leftStick, shown.rightStick, shown.mayHoldTheMouse], [false, false, false])
})
