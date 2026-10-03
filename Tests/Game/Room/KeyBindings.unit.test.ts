import assert from 'node:assert/strict'
import test from 'node:test'
import { KeyBindings } from '../../../Apps/Game/Room/KeyBindings.ts'

test('handKey_whenPressedAndLetGo_tapsThatHand', () => {
  const { keyBindings, calls } = keyBindingsRecording()

  keyBindings.keyPressed('Digit2')
  keyBindings.keyReleased('Digit2')

  assert.deepEqual(calls, ['hand tapped 1'])
})

test('handKey_whenHeldForASecond_showsTheItemUpCloseAndDoesNotTapWhenLetGo', () => {
  const { keyBindings, calls } = keyBindingsRecording()
  keyBindings.keyPressed('Digit1')

  keyBindings.advance(0.6)
  keyBindings.advance(0.6)
  keyBindings.keyReleased('Digit1')

  assert.deepEqual(calls, ['hand held 0'])
})

test('key3_whenPressed_tapsNoHand', () => {
  const { keyBindings, calls } = keyBindingsRecording()

  keyBindings.keyPressed('Digit3')
  keyBindings.keyReleased('Digit3')

  assert.deepEqual(calls, [])
})

test('handKey_whileAnItemIsShownUpClose_closesIt', () => {
  const { keyBindings, calls } = keyBindingsRecording(true)

  keyBindings.keyPressed('Digit1')
  keyBindings.keyReleased('Digit1')

  assert.deepEqual(calls, ['inspection closed'])
})

test('eKey_sips', () => {
  const { keyBindings, calls } = keyBindingsRecording()

  keyBindings.keyPressed('KeyE')

  assert.deepEqual(calls, ['sipped'])
})

test('spaceKey_whileHeld_tiltsAndReleasesTheTilt', () => {
  const { keyBindings, calls } = keyBindingsRecording()

  keyBindings.keyPressed('Space')
  keyBindings.keyReleased('Space')

  assert.deepEqual(calls, ['tilt pressed', 'tilt released'])
})

test('spaceKey_heldWhenEveryKeyIsReleased_releasesTheTilt', () => {
  const { keyBindings, calls } = keyBindingsRecording()
  keyBindings.keyPressed('Space')

  keyBindings.everyKeyReleased('the window lost focus')

  assert.deepEqual(calls, ['tilt pressed', 'tilt released'])
})

test('handKey_heldWhenEveryKeyIsReleased_neitherShowsTheItemNorTapsLater', () => {
  const { keyBindings, calls } = keyBindingsRecording()
  keyBindings.keyPressed('Digit1')

  keyBindings.everyKeyReleased('the page was hidden')
  keyBindings.advance(1.2)
  keyBindings.keyReleased('Digit1')

  assert.deepEqual(calls, [])
})

function keyBindingsRecording(isInspecting = false): { keyBindings: KeyBindings; calls: string[] } {
  const calls: string[] = []
  const keyBindings = new KeyBindings({
    isInspecting: () => isInspecting,
    handTapped: (handIndex) => calls.push(`hand tapped ${handIndex}`),
    handHeld: (handIndex) => calls.push(`hand held ${handIndex}`),
    inspectionClosed: () => calls.push('inspection closed'),
    sipped: () => calls.push('sipped'),
    tiltPressed: () => calls.push('tilt pressed'),
    tiltReleased: () => calls.push('tilt released'),
  }, () => {})
  return { keyBindings, calls }
}
