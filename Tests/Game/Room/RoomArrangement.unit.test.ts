import assert from 'node:assert/strict'
import test from 'node:test'
import { arrangementOfAnEarlierSave, arrangementOfANewGame, problemWithArrangement } from '../../../Apps/Game/Room/RoomArrangement.ts'

test('newGameArrangement_whenEveryDrawIsTheLowest_takesTheFirstOfEachChoice', () => {
  assert.deepEqual(arrangementOfANewGame(() => 0), { window: 'inTheBackWall', besideTheWindow: 'kitchen', table: 'byTheWindow', tools: 'onTheTeaTable', cushionColour: 'terracotta', cushionCount: 1, clothPatterns: ['blueStripes'] })
})

test('newGameArrangement_whenEveryDrawIsTheHighest_takesTheLastOfEachChoice', () => {
  assert.deepEqual(arrangementOfANewGame(() => 0.999), { window: 'alongTheLeftWall', besideTheWindow: 'shelf', table: 'againstTheRightEdge', tools: 'apart', cushionColour: 'softBlue', cushionCount: 2, clothPatterns: ['redCheck', 'redCheck'] })
})

test('savedArrangement_withThreeCloths_isRefusedNamingTheCloths', () => {
  const arrangement = { window: 'inTheBackWall', besideTheWindow: 'kitchen', table: 'byTheWindow', tools: 'apart', cushionColour: 'terracotta', cushionCount: 1, clothPatterns: ['redCheck', 'redCheck', 'blueStripes'] }

  assert.equal(problemWithArrangement(arrangement), 'its cloths are not a count the room has')
})

test('savedArrangement_withATableAgainstTheFrontEdgeByTheSmallWindow_isRefusedNamingTheTable', () => {
  const arrangement = { window: 'inTheBackWall', besideTheWindow: 'kitchen', table: 'againstTheFrontEdge', tools: 'apart', cushionColour: 'terracotta', cushionCount: 1, clothPatterns: ['redCheck'] }

  assert.equal(problemWithArrangement(arrangement), 'its tea table againstTheFrontEdge has no place by that window')
})

test('savedArrangement_fromBeforeTheFurnitureMoved_keepsItsWindowWithTheKitchenBesideItAndTheTableByIt', () => {
  const arrangement = { kitchen: 'facingTheWindow', tools: 'apart', cushionColour: 'softBlue', cushionCount: 2, clothPatterns: ['redCheck'] }

  assert.deepEqual(arrangementOfAnEarlierSave(arrangement), { tools: 'apart', cushionColour: 'softBlue', cushionCount: 2, clothPatterns: ['redCheck'], window: 'alongTheLeftWall', besideTheWindow: 'kitchen', table: 'byTheWindow' })
})
