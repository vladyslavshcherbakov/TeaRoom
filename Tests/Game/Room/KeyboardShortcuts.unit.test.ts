import assert from 'node:assert/strict'
import test from 'node:test'
import { KeyboardShortcuts } from '../../../Apps/Game/Room/KeyboardShortcuts.ts'
import { middleHandIndex } from '../../../Shared/Simulation/Ritual/Reach.ts'

test('handKey_whenPressedAndLetGo_tapsThatHand', () => {
  const { shortcuts, calls } = shortcutsRecording()

  shortcuts.keyPressed('Digit2')
  shortcuts.keyReleased('Digit2')

  assert.deepEqual(calls, ['hand tapped 1'])
})

test('handKey_whenHeldForASecond_showsTheItemUpCloseAndDoesNotTapWhenLetGo', () => {
  const { shortcuts, calls } = shortcutsRecording()
  shortcuts.keyPressed('Digit1')

  shortcuts.advance(0.6)
  shortcuts.advance(0.6)
  shortcuts.keyReleased('Digit1')

  assert.deepEqual(calls, ['hand held 0'])
})

test('handKey_forTheThirdHand_tapsTheMiddleHand', () => {
  const { shortcuts, calls } = shortcutsRecording()

  shortcuts.keyPressed('Digit3')
  shortcuts.keyReleased('Digit3')

  assert.deepEqual(calls, [`hand tapped ${middleHandIndex}`])
})

test('handKey_whileAnItemIsShownUpClose_closesIt', () => {
  const { shortcuts, calls } = shortcutsRecording(true)

  shortcuts.keyPressed('Digit1')
  shortcuts.keyReleased('Digit1')

  assert.deepEqual(calls, ['inspection closed'])
})

test('eKey_sips', () => {
  const { shortcuts, calls } = shortcutsRecording()

  shortcuts.keyPressed('KeyE')

  assert.deepEqual(calls, ['sipped'])
})

test('spaceKey_whileHeld_tiltsAndReleasesTheTilt', () => {
  const { shortcuts, calls } = shortcutsRecording()

  shortcuts.keyPressed('Space')
  shortcuts.keyReleased('Space')

  assert.deepEqual(calls, ['tilt pressed', 'tilt released'])
})

function shortcutsRecording(isInspecting = false): { shortcuts: KeyboardShortcuts; calls: string[] } {
  const calls: string[] = []
  const shortcuts = new KeyboardShortcuts({
    isInspecting: () => isInspecting,
    handTapped: (handIndex) => calls.push(`hand tapped ${handIndex}`),
    handHeld: (handIndex) => calls.push(`hand held ${handIndex}`),
    inspectionClosed: () => calls.push('inspection closed'),
    sipped: () => calls.push('sipped'),
    tiltPressed: () => calls.push('tilt pressed'),
    tiltReleased: () => calls.push('tilt released'),
  }, () => {})
  return { shortcuts, calls }
}
