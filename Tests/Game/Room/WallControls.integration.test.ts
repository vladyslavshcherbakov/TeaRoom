import assert from 'node:assert/strict'
import test from 'node:test'
import { TestRoom } from '../../Support/TestRoom.ts'

test('medal_whenTapped_asksForTheListOfAchievements', () => {
  const room = new TestRoom()

  room.tap({ kind: 'medal' })

  assert.equal(room.achievementListsAsked, 1)
})

test('settingsGear_whenTapped_asksForTheSettings', () => {
  const room = new TestRoom()

  room.tap({ kind: 'settingsGear' })

  assert.equal(room.settingsAsked, 1)
})

test('guideBook_whenTapped_opensTheGuide', () => {
  const room = new TestRoom()

  room.tap({ kind: 'guideBook' })

  assert.equal(room.guidesAsked, 1)
})
