import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import { kitchenPlacements, quietRoomArrangedAs, quietRoomArrangements } from '../../../Shared/Content/Rooms.ts'
import { carriedItemIdsIn, itemLocationIn } from '../../../Shared/Simulation/Ritual/Reach.ts'
import { whyThereIsNoRoomFor } from '../../../Apps/Game/Room/Placement.ts'
import { roomLayoutFor } from '../../../Apps/Game/Room/RoomLayout.ts'
import { RoomNavigator } from '../../../Apps/Game/Room/RoomNavigator.ts'
import { isWalking } from '../../../Apps/Game/Room/Walking/Walk.ts'
import { TestRitual } from '../../Support/TestRitual.ts'
import { assertNear } from '../../Support/Assertions.ts'

const frameSeconds = 1 / 60
const longestWalkSeconds = 30

test('startingItems_inEveryArrangement_standWhereTheRoomLetsThemBePutDown', () => {
  for (const arrangement of quietRoomArrangements) {
    const room = quietRoomArrangedAs(arrangement)
    const state = new TestRitual({ ...defaultCatalog, rooms: { ...defaultCatalog.rooms, [room.id]: room } }, room.id).state
    const surroundings = { layout: roomLayoutFor(arrangement.kitchen), heaterSpot: room.heaterSpot }

    const refusals = carriedItemIdsIn(state).flatMap((itemId) => {
      const location = itemLocationIn(state, itemId)
      const refusal = location?.kind === 'onSurface' ? whyThereIsNoRoomFor(itemId, location.spot, state, surroundings) : 'not on a surface'
      return refusal === null ? [] : [`${itemId}: ${refusal}`]
    })

    assert.deepEqual(refusals, [], JSON.stringify(arrangement))
  }
})

test('sink_inEveryKitchen_standsWhereTheTapFillsIt', () => {
  for (const kitchen of kitchenPlacements) {
    const { sinkBasin } = roomLayoutFor(kitchen)
    const sinkSpot = quietRoomArrangedAs({ kitchen, tools: 'onTheTeaTable', clothCount: 1 }).tap?.sinkSpot

    assertNear(sinkSpot?.x ?? Number.NaN, sinkBasin.x)
    assertNear(sinkSpot?.y ?? Number.NaN, sinkBasin.floorHeight + sinkBasin.plateMetres)
  }
})

test('everyFurnitureSide_inEveryKitchen_isReachedOnFootFromTheEntrance', () => {
  for (const kitchen of kitchenPlacements) {
    const layout = roomLayoutFor(kitchen)
    for (const piece of layout.furniture) {
      const navigator = new RoomNavigator(layout, () => {})

      navigator.tapped({ kind: 'furniture', furnitureId: piece.id })
      for (let elapsed = 0; elapsed < longestWalkSeconds && isWalking(navigator.walk); elapsed += frameSeconds) navigator.advance(frameSeconds)

      assert.deepEqual(navigator.view, { kind: 'closeUp', furnitureId: piece.id }, `${kitchen}: ${piece.id}`)
    }
  }
})
