import assert from 'node:assert/strict'
import test from 'node:test'
import { remarkText, tasteCardLines } from '../../../Apps/Game/Room/RoomTexts.ts'

test('godsRemark_readsAsADeadpanLine', () => {
  assert.equal(remarkText('weWillTellNoOne'), 'We will tell no one.')
  assert.equal(remarkText('pretendNotToNotice'), 'The gods pretend not to notice.')
})

test('tasteCard_namesTemperatureStrengthAndBitternessInWords', () => {
  const lines = tasteCardLines({ temperature: 'pleasant', strength: 'rich', bitterness: 'high', reaction: 'grimace' })

  assert.deepEqual(lines, ['Temperature  good', 'Strength  rich', 'Bitterness  above normal'])
})
