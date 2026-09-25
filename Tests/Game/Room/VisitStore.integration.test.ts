import assert from 'node:assert/strict'
import test from 'node:test'
import { arrangementBeforeRoomsVaried } from '../../../Apps/Game/Room/RoomArrangement.ts'
import { VisitStore } from '../../../Apps/Game/Room/VisitStore.ts'

const aVisit = {
  savedVisitVersion: 1,
  sessionStateVersion: 1,
  savedAtMilliseconds: 0,
  ritual: {},
  place: { position: { x: 0.5, z: 0.5 }, headingRadians: 0, closeUpOf: null },
  camera: { mode: 'room', stickLayout: 'walkOnTheLeft', look: { headingRadians: 0, pitchRadians: 0 } },
}

test('savedVisit_fromBeforeTheRoomWasArrangedForEachGame_continuesInTheRoomItWasPlayedIn', () => {
  const store = storeHolding(aVisit)

  const found = store.find()

  assert.equal(found.kind, 'found')
  assert.deepEqual(found.kind === 'found' ? found.visit.arrangement : null, arrangementBeforeRoomsVaried)
})

test('savedVisit_namingItsRoomByTheKitchenFacingTheWindow_keepsTheWindowAlongTheLeftWallWithTheKitchenBesideIt', () => {
  const { window: _window, besideTheWindow: _besideTheWindow, table: _table, ...rest } = arrangementBeforeRoomsVaried
  const store = storeHolding({ ...aVisit, arrangement: { ...rest, kitchen: 'facingTheWindow' } })

  const found = store.find()

  assert.deepEqual(found.kind === 'found' ? found.visit.arrangement : null, { ...rest, window: 'alongTheLeftWall', besideTheWindow: 'kitchen', table: 'byTheWindow' })
})

test('savedVisit_ofAnotherVersion_isBrokenByAnUpdate', () => {
  const store = storeHolding({ ...aVisit, savedVisitVersion: 0 })

  assert.deepEqual(store.find(), { kind: 'brokenByAnUpdate' })
})

function storeHolding(visit: unknown): VisitStore {
  const items = new Map<string, string>([['visit', JSON.stringify(visit)]])
  const storage: Storage = {
    get length() {
      return items.size
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, value),
  }
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
  return new VisitStore(() => {})
}
