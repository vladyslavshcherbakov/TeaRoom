import assert from 'node:assert/strict'
import test from 'node:test'
import { catalogOfANewGame } from '../../../Apps/Game/Room/NewGame/GameCatalog.ts'
import { arrangementOfANewGame } from '../../../Apps/Game/Room/NewGame/RoomArrangement.ts'

test('bowlOrder_ofANewGame_isLoggedWithEachBowlsSpotInAllThreeDirections', () => {
  const logLines: string[] = []

  const catalog = catalogOfANewGame(arrangementOfANewGame(() => 0), () => 0.5, (line) => logLines.push(line))

  const bowls = catalog.rooms['quietRoom']?.vessels.filter((vessel) => vessel.definitionId === 'teaBowl') ?? []
  const [firstBowl] = bowls
  assert.ok(firstBowl !== undefined)
  assert.ok(logLines.some((line) => line.includes(`${firstBowl.id} at shelf (${firstBowl.startsAt.x.toFixed(2)}, ${firstBowl.startsAt.y.toFixed(2)}, ${firstBowl.startsAt.z.toFixed(2)})`)), logLines.join('\n'))
})
