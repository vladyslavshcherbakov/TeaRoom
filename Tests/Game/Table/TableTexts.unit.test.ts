import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import { remarkText, tasteCardLines, teaName, timeOfDayName } from '../../../Apps/Game/Table/TableTexts.ts'

test('teaName_isWrittenForPeopleNotForCode', () => {
  assert.equal(teaName('shouPuerh'), 'Shou puerh')
  assert.equal(timeOfDayName('sunset'), 'Sunset')
})

test('godsRemark_readsAsADeadpanLine', () => {
  assert.equal(remarkText('weWillTellNoOne'), 'We will tell no one.')
  assert.equal(remarkText('pretendNotToNotice'), 'The gods pretend not to notice.')
})

test('tasteCard_namesTemperatureStrengthAndBitternessInWords', () => {
  const lines = tasteCardLines({ temperature: 'pleasant', strength: 'rich', bitterness: 'high', reaction: 'grimace' })

  assert.deepEqual(lines, ['Temperature  good', 'Strength  rich', 'Bitterness  above normal'])
})

test('teaName_existsForEveryTeaInTheDefaultCatalog', () => {
  for (const teaId of Object.keys(defaultCatalog.teas)) assert.notEqual(teaName(teaId), teaId, teaId)
})
