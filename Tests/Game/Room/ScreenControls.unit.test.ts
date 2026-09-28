import assert from 'node:assert/strict'
import test from 'node:test'
import { screenControlsShown, type ScreenSituation } from '../../../Apps/Game/Room/ScreenControls.ts'

const inTheRoomView: ScreenSituation = { cameraMode: 'room', controlScheme: 'twoSticks', stickLayout: 'walkOnTheLeft', mode: 'free', hasACupToSip: false }
const inFirstPerson: ScreenSituation = { ...inTheRoomView, cameraMode: 'firstPerson' }
const noButtons = { sip: false, tilt: false, whyPouring: false, leaveFirstPerson: false }

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

  assert.deepEqual([shown.buttons, shown.leftStick, shown.rightStick, shown.mayHoldTheMouse], [{ sip: false, tilt: true, whyPouring: true, leaveFirstPerson: true }, false, false, false])
})

test('screenControls_whileInspectingInFirstPerson_letGoOfTheSticks', () => {
  const shown = screenControlsShown({ ...inFirstPerson, mode: 'lookingClosely' })

  assert.deepEqual([shown.leftStick, shown.rightStick], [false, false])
})

test('sipButton_withACupToSipInEachMode_isShownOnlyWhileFreeOrSipping', () => {
  const modes = ['free', 'aiming', 'lookingClosely', 'sipping', 'ended'] as const

  const isShownByMode = modes.map((mode) => screenControlsShown({ ...inTheRoomView, mode, hasACupToSip: true }).buttons.sip)

  assert.deepEqual(isShownByMode, [true, false, false, true, false])
})
