import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import { quietRoomArrangedAs, quietRoomArrangements } from '../../../Shared/Content/Rooms.ts'
import { carriedItemIdsIn, itemLocationIn } from '../../../Shared/Simulation/Ritual/Reach.ts'
import { whyThereIsNoRoomFor } from '../../../Apps/Game/Room/Placement.ts'
import { roomHalfSize, roomLayoutFor } from '../../../Apps/Game/Room/RoomLayout.ts'
import { RoomNavigator } from '../../../Apps/Game/Room/RoomNavigator.ts'
import { isWalking } from '../../../Apps/Game/Room/Walking/Walk.ts'
import { TestRitual } from '../../Support/TestRitual.ts'
import { assertNear } from '../../Support/Assertions.ts'

const frameSeconds = 1 / 60
const longestWalkSeconds = 30
const cushionRadiusMetres = 0.28

test('startingItems_inEveryArrangement_standWhereTheRoomLetsThemBePutDown', () => {
  for (const arrangement of quietRoomArrangements) {
    const room = quietRoomArrangedAs(arrangement)
    const state = new TestRitual({ ...defaultCatalog, rooms: { ...defaultCatalog.rooms, [room.id]: room } }, room.id).state
    const surroundings = { layout: roomLayoutFor(arrangement), heaterSpot: room.heaterSpot }

    const refusals = carriedItemIdsIn(state).flatMap((itemId) => {
      const location = itemLocationIn(state, itemId)
      const refusal = location?.kind === 'onSurface' ? whyThereIsNoRoomFor(itemId, location.spot, state, surroundings) : 'not on a surface'
      return refusal === null ? [] : [`${itemId}: ${refusal}`]
    })

    assert.deepEqual(refusals, [], JSON.stringify(arrangement))
  }
})

test('sink_inEveryArrangement_standsItsItemOnTheFloorOfTheBasinTheTapFills', () => {
  for (const arrangement of quietRoomArrangements) {
    const { sinkBasin } = roomLayoutFor(arrangement)
    const sinkSpot = quietRoomArrangedAs(arrangement).tap?.sinkSpot

    assert.ok(Math.abs((sinkSpot?.x ?? Number.NaN) - sinkBasin.x) < sinkBasin.width / 2, JSON.stringify(arrangement))
    assert.ok(Math.abs((sinkSpot?.z ?? Number.NaN) - sinkBasin.z) < sinkBasin.depth / 2, JSON.stringify(arrangement))
    assertNear(sinkSpot?.y ?? Number.NaN, sinkBasin.floorHeight + sinkBasin.plateMetres)
  }
})

test('everyFurnitureSide_inEveryArrangement_isReachedOnFootFromTheEntrance', () => {
  for (const arrangement of quietRoomArrangements) {
    const layout = roomLayoutFor(arrangement)
    for (const piece of layout.furniture) {
      const navigator = new RoomNavigator(layout, () => {})

      navigator.tapped({ kind: 'furniture', furnitureId: piece.id })
      for (let elapsed = 0; elapsed < longestWalkSeconds && isWalking(navigator.walk); elapsed += frameSeconds) navigator.advance(frameSeconds)

      assert.deepEqual(navigator.view, { kind: 'closeUp', furnitureId: piece.id }, `${JSON.stringify(arrangement)}: ${piece.id}`)
    }
  }
})

test('cushions_inEveryArrangement_lieOnTheFloorClearOfTheFurniture', () => {
  for (const arrangement of quietRoomArrangements) {
    const layout = roomLayoutFor(arrangement)

    for (const cushion of layout.cushionSpots) {
      assert.ok(Math.abs(cushion.x) + cushionRadiusMetres <= roomHalfSize && Math.abs(cushion.z) + cushionRadiusMetres <= roomHalfSize, `${JSON.stringify(arrangement)}: cushion at ${cushion.x}, ${cushion.z} is off the floor`)
      const pieceUnder = layout.furniture.find(({ footprint }) => Math.abs(cushion.x - footprint.x) < footprint.width / 2 + cushionRadiusMetres && Math.abs(cushion.z - footprint.z) < footprint.depth / 2 + cushionRadiusMetres)
      assert.equal(pieceUnder, undefined, `${JSON.stringify(arrangement)}: cushion at ${cushion.x}, ${cushion.z} runs under the ${pieceUnder?.id}`)
    }
  }
})
