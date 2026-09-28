import assert from 'node:assert/strict'
import test, { type TestContext } from 'node:test'
import { arrangementOfANewGame } from '../../../Apps/Game/Room/RoomArrangement.ts'
import type { BrowserStore } from '../../../Apps/Engine/BrowserStorage.ts'
import { visitStore, type SavedVisit } from '../../../Apps/Game/Room/VisitStore.ts'
import { RecordingRoomLog } from '../../Support/RecordingRoomLog.ts'
import { installStorageInMemory } from '../../Support/StorageInMemory.ts'

const aVisit = {
  savedVisitVersion: 2,
  sessionStateVersion: 1,
  savedAtMilliseconds: 0,
  session: {},
  place: { position: { x: 0.5, z: 0.5 }, headingRadians: 0, closeUpOf: null },
  camera: { look: { headingRadians: 0, pitchRadians: 0 } },
  arrangement: arrangementOfANewGame(() => 0),
}

test('visit_whenKept_isFoundAgainByTheNextPage', (t) => {
  installStorageInMemory(t)
  visitStore(() => {}).keep(aVisit)

  const found = visitStore(() => {}).load()

  assert.deepEqual(found, { kind: 'found', value: aVisit })
})

test('savedVisit_whenTheStorageIsBlocked_isNotFoundAndTheFailureIsLoggedAsAnError', (t) => {
  installStorageInMemory(t).isBlocked = true
  const log = new RecordingRoomLog()

  const found = visitStore(log.write).load()

  assert.deepEqual(found, { kind: 'none' })
  assert.equal(log.messagesAt('error').length, 1)
})

test('savedVisit_whenItsTextIsNotJson_doesNotFitAndTheFailureIsLoggedAsAnError', (t) => {
  installStorageInMemory(t).setItem('visit', '{"savedVisitVersion": 1,')
  const log = new RecordingRoomLog()

  const found = visitStore(log.write).load()

  assert.deepEqual(found, { kind: 'doesNotFit' })
  assert.equal(log.messagesAt('error').length, 1)
})

test('savedVisit_withoutItsArrangement_doesNotFit', (t) => {
  const { arrangement: _arrangement, ...visitWithoutItsArrangement } = aVisit
  const store = storeHolding(t, visitWithoutItsArrangement)

  assert.deepEqual(store.load(), { kind: 'doesNotFit' })
})

test('savedVisit_ofAnotherVersion_doesNotFit', (t) => {
  const store = storeHolding(t, { ...aVisit, savedVisitVersion: 0 })

  assert.deepEqual(store.load(), { kind: 'doesNotFit' })
})

test('visit_whenTheStorageRefusesOneSaveAndTakesTheNext_logsTheFailureAsAnErrorAndThenTheSave', (t) => {
  const lines: string[] = []
  const storage = installStorageInMemory(t)
  const store = visitStore((message: string, level = 'info') => lines.push(`${level} ${message}`))
  storage.refusesTheNextWrite = true
  store.keep(aVisit)

  store.keep(aVisit)

  assert.deepEqual(lines, ['error could not save the visit, it will be tried again: QuotaExceededError: the quota is full', 'info saved the visit again after a save that failed'])
})

function storeHolding(t: TestContext, visit: unknown): BrowserStore<SavedVisit> {
  installStorageInMemory(t).setItem('visit', JSON.stringify(visit))
  return visitStore(() => {})
}
