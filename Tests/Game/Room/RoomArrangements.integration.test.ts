import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import { quietRoomArrangedAs, quietRoomArrangements } from '../../../Shared/Content/Rooms.ts'
import { carriedItemIdsIn, itemLocationIn } from '../../../Shared/GameLogic/State/WhereItemsAre.ts'
import { LyingLids, whyThereIsNoRoomFor } from '../../../Apps/Game/Room/Placement.ts'
import { roomHalfSize, roomLayoutFor } from '../../../Apps/Game/Room/RoomLayout.ts'
import { RoomNavigator, type WalkTarget } from '../../../Apps/Game/Room/RoomNavigator.ts'
import { isWalking } from '../../../Apps/Engine/Walking/Walk.ts'
import { TestTeaSession } from '../../Support/TestTeaSession.ts'
import { assertNear } from '../../Support/Assertions.ts'
import { frameSeconds } from '../../Support/TestRoom.ts'

const longestWalkSeconds = 30
const cushionRadiusMetres = 0.28

test('startingItems_inEveryArrangement_standWhereTheRoomLetsThemBePutDown', () => {
  for (const arrangement of quietRoomArrangements) {
    const room = quietRoomArrangedAs(arrangement)
    const state = new TestTeaSession({ ...defaultCatalog, rooms: { ...defaultCatalog.rooms, [room.id]: room } }, room.id).state
    const surroundings = { layout: roomLayoutFor(arrangement), heaterSpot: room.heaterSpot }

    const refusals = carriedItemIdsIn(state).flatMap((itemId) => {
      const location = itemLocationIn(state, itemId)
      const refusal = location?.kind === 'onSurface' ? whyThereIsNoRoomFor(itemId, location.spot, state, surroundings, new LyingLids(() => {})) : 'not on a surface'
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
      for (const side of piece.sides) {
        const navigator = new RoomNavigator(layout, () => {})
        walkToTheEnd(navigator, { kind: 'floor', point: side.standingPoint })

        walkToTheEnd(navigator, { kind: 'furniture', furnitureId: piece.id })

        const whereItFailed = `${JSON.stringify(arrangement)}: ${side.name} of ${piece.id}`
        assert.deepEqual(navigator.view, { kind: 'closeUp', furnitureId: piece.id }, whereItFailed)
        assert.deepEqual(navigator.closeUpInView, side.closeUp, whereItFailed)
      }
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

function walkToTheEnd(navigator: RoomNavigator, target: WalkTarget): void {
  navigator.tapped(target)
  for (let elapsed = 0; elapsed < longestWalkSeconds && isWalking(navigator.walk); elapsed += frameSeconds) navigator.advance(frameSeconds)
}
