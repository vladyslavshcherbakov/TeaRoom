import assert from 'node:assert/strict'
import test from 'node:test'
import { arrangementOfANewGame, problemWithArrangement } from '../../../Apps/Game/Room/RoomArrangement.ts'

test('arrangementOfANewGame_whenEveryDrawIsTheLowest_takesTheFirstOfEachChoice', () => {
  assert.deepEqual(arrangementOfANewGame(() => 0), { kitchen: 'besideTheWindow', tools: 'onTheTeaTable', cushionColour: 'terracotta', cushionCount: 1, clothPatterns: ['blueStripes'] })
})

test('arrangementOfANewGame_whenEveryDrawIsTheHighest_takesTheLastOfEachChoice', () => {
  assert.deepEqual(arrangementOfANewGame(() => 0.999), { kitchen: 'facingTheWindow', tools: 'apart', cushionColour: 'softBlue', cushionCount: 2, clothPatterns: ['redCheck', 'redCheck'] })
})

test('savedArrangement_withThreeCloths_isRefusedNamingTheCloths', () => {
  const arrangement = { kitchen: 'besideTheWindow', tools: 'apart', cushionColour: 'terracotta', cushionCount: 1, clothPatterns: ['redCheck', 'redCheck', 'blueStripes'] }

  assert.equal(problemWithArrangement(arrangement), 'its cloths are not a count the room has')
})
