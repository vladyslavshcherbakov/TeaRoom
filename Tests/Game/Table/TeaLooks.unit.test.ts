import assert from 'node:assert/strict'
import test from 'node:test'
import { teaLookFor } from '../../../Apps/Game/Table/TeaLooks.ts'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'

test('teaLook_existsForEveryTeaInTheDefaultCatalog', () => {
  for (const teaId of Object.keys(defaultCatalog.teas)) assert.notEqual(teaLookFor(teaId), teaLookFor(null), teaId)
})
