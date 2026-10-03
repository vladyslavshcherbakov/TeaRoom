import assert from 'node:assert/strict'
import test from 'node:test'
import { arrangementOfANewGame, problemWithArrangement } from '../../../../Apps/Game/Room/NewGame/RoomArrangement.ts'

test('newGameArrangement_whenEveryDrawIsTheLowest_takesTheFirstOfEachChoice', () => {
  assert.deepEqual(arrangementOfANewGame(() => 0), { window: 'inTheBackWall', besideTheWindow: 'kitchen', table: 'byTheWindow', tools: 'onTheTeaTable', cushionColour: 'terracotta', cushionCount: 1, clothPlace: 'onTheTeaTable', clothPattern: 'blueStripes' })
})

test('newGameArrangement_whenEveryDrawIsTheHighest_takesTheLastOfEachChoice', () => {
  assert.deepEqual(arrangementOfANewGame(() => 0.999), { window: 'alongTheLeftWall', besideTheWindow: 'shelf', table: 'againstTheRightEdge', tools: 'apart', cushionColour: 'softBlue', cushionCount: 2, clothPlace: 'onTheCounter', clothPattern: 'redCheck' })
})

test('savedArrangement_withTheClothOnTheFloor_isRefusedNamingItsPlace', () => {
  const arrangement = { window: 'inTheBackWall', besideTheWindow: 'kitchen', table: 'byTheWindow', tools: 'apart', cushionColour: 'terracotta', cushionCount: 1, clothPlace: 'onTheFloor', clothPattern: 'redCheck' }

  assert.equal(problemWithArrangement(arrangement), 'its cloth onTheFloor is not in a place the room has')
})

test('savedArrangement_withATableAgainstTheFrontEdgeByTheSmallWindow_isRefusedNamingTheTable', () => {
  const arrangement = { window: 'inTheBackWall', besideTheWindow: 'kitchen', table: 'againstTheFrontEdge', tools: 'apart', cushionColour: 'terracotta', cushionCount: 1, clothPlace: 'onTheShelf', clothPattern: 'redCheck' }

  assert.equal(problemWithArrangement(arrangement), 'its tea table againstTheFrontEdge has no place by that window')
})
