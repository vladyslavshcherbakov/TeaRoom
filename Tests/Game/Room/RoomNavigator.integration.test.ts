import assert from 'node:assert/strict'
import test from 'node:test'
import { furnitureWithId, walkerStart } from '../../../Apps/Game/Room/RoomLayout.ts'
import type { FloorPoint } from '../../../Apps/Engine/Points.ts'
import { RoomNavigator } from '../../../Apps/Game/Room/RoomNavigator.ts'
import { isWalking } from '../../../Apps/Engine/Walking/Walk.ts'
import { assertNear } from '../../Support/Assertions.ts'
import { quietRoomLayout, backRightCorner, behindTheTeaTable, frameSeconds, inFrontOfTheTeaTable, openFloorFrontLeft, openFloorRight } from '../../Support/TestRoom.ts'

const teaTable = furnitureWithId(quietRoomLayout, 'teaTable')
const [teaTableFront, teaTableWindowSide] = teaTable.sides

test('walker_whenTheFloorIsTapped_walksThereAndStops', () => {
  const navigator = quietRoomNavigator()

  navigator.tapped({ kind: 'floor', point: openFloorFrontLeft })
  walkUntilStill(navigator)

  assertNear(navigator.walk.position.x, openFloorFrontLeft.x)
  assertNear(navigator.walk.position.z, openFloorFrontLeft.z)
  assert.deepEqual(navigator.view, { kind: 'overview' })
})

test('walker_whenAPointInsideTheTeaTableIsTapped_staysWhereItIs', () => {
  const navigator = quietRoomNavigator()

  navigator.tapped({ kind: 'floor', point: { x: teaTable.footprint.x, z: teaTable.footprint.z } })

  assert.deepEqual(navigator.walk.position, walkerStart)
  assert.equal(isWalking(navigator.walk), false)
})

test('walksStarted_whenTheFloorIsTappedAgainOnTheWay_countsTheNewWalk', () => {
  const navigator = quietRoomNavigator()
  navigator.tapped({ kind: 'floor', point: openFloorFrontLeft })
  navigator.advance(frameSeconds)

  navigator.tapped({ kind: 'floor', point: { ...openFloorFrontLeft, z: openFloorFrontLeft.z - 0.1 } })

  assert.equal(navigator.walksStarted, 2)
})

test('walker_onTheWayBehindTheTeaTable_goesAroundIt', () => {
  const navigator = quietRoomNavigator()
  const positionsInsideTheTable: FloorPoint[] = []

  navigator.tapped({ kind: 'floor', point: behindTheTeaTable })
  walkUntilStill(navigator, (position) => {
    if (isInsideTeaTable(position)) positionsInsideTheTable.push(position)
  })

  assert.deepEqual(positionsInsideTheTable, [])
  assertNear(navigator.walk.position.z, behindTheTeaTable.z)
})

test('shelf_whenTapped_isShownCloseUpOnceTheWalkerArrives', () => {
  const navigator = quietRoomNavigator()

  navigator.tapped({ kind: 'furniture', furnitureId: 'shelf' })
  const viewOnTheWay = navigator.view
  walkUntilStill(navigator)

  assert.deepEqual(viewOnTheWay, { kind: 'approaching', furnitureId: 'shelf' })
  assert.deepEqual(navigator.view, { kind: 'closeUp', furnitureId: 'shelf' })
  assert.deepEqual(navigator.walk.position, furnitureWithId(quietRoomLayout, 'shelf').sides[0].standingPoint)
})

test('closeUp_whenTheFloorIsTapped_returnsToTheOverviewWithoutWalking', () => {
  const navigator = quietRoomNavigator()
  navigator.tapped({ kind: 'furniture', furnitureId: 'teaTable' })
  walkUntilStill(navigator)

  navigator.tapped({ kind: 'floor', point: openFloorFrontLeft })

  assert.deepEqual(navigator.view, { kind: 'overview' })
  assert.equal(isWalking(navigator.walk), false)
})

test('walker_whenTappedElsewhereMidWalk_changesCourseToTheNewPoint', () => {
  const navigator = quietRoomNavigator()
  navigator.tapped({ kind: 'furniture', furnitureId: 'counter' })
  navigator.advance(0.5)

  navigator.tapped({ kind: 'floor', point: openFloorRight })
  walkUntilStill(navigator)

  assertNear(navigator.walk.position.x, openFloorRight.x)
  assertNear(navigator.walk.position.z, openFloorRight.z)
  assert.deepEqual(navigator.view, { kind: 'overview' })
})

test('walker_whenWalkingFreelyIntoTheTeaTable_stopsAtItsEdge', () => {
  const navigator = quietRoomNavigator()
  navigator.tapped({ kind: 'floor', point: inFrontOfTheTeaTable })
  walkUntilStill(navigator)

  for (let frame = 0; frame < 120; frame += 1) navigator.walkFreely({ x: 0, z: -0.03 }, Math.PI)

  assert.equal(isInsideTeaTable(navigator.walk.position), false)
  assert.ok(navigator.walk.position.z > teaTable.footprint.z + teaTable.footprint.depth / 2, `z ${navigator.walk.position.z}`)
})

test('walker_whenWalkingFreelyAwayFromFurniture_leavesIt', () => {
  const places: (string | null)[] = []
  const navigator = new RoomNavigator(quietRoomLayout, () => {}, (furnitureId) => places.push(furnitureId))
  navigator.tapped({ kind: 'furniture', furnitureId: 'teaTable' })
  walkUntilStill(navigator)

  for (let step = 0; step < 20; step += 1) navigator.walkFreely({ x: 0, z: 0.1 }, 0)

  assert.deepEqual(places, ['teaTable', null])
  assert.deepEqual(navigator.view, { kind: 'overview' })
})

test('walker_whenWalkingFreelyUpToTheShelf_standsWithinReachOfItWithoutWalkingOnToIt', () => {
  const moves: string[] = []
  const navigator = new RoomNavigator(quietRoomLayout, () => {}, (furnitureId, byWalkingFreely) => moves.push(`${furnitureId} ${byWalkingFreely ? 'freely' : 'by a tap'}`))
  navigator.tapped({ kind: 'furniture', furnitureId: 'shelf' })
  walkUntilStill(navigator)
  for (let step = 0; step < 20; step += 1) navigator.walkFreely({ x: 0, z: 0.1 }, 0)

  for (let step = 0; step < 20; step += 1) navigator.walkFreely({ x: 0, z: -0.1 }, Math.PI)

  assert.deepEqual(navigator.view, { kind: 'closeUp', furnitureId: 'shelf' })
  assert.deepEqual(moves, ['shelf by a tap', 'null freely', 'shelf freely'])
})

test('walker_whenWalkingFreelyOnTheWayToFurniture_givesUpTheWay', () => {
  const navigator = quietRoomNavigator()
  navigator.tapped({ kind: 'furniture', furnitureId: 'shelf' })
  navigator.advance(frameSeconds)

  navigator.walkFreely({ x: 0.01, z: 0 }, Math.PI / 2)

  assert.deepEqual(navigator.view, { kind: 'overview' })
  assert.equal(isWalking(navigator.walk), false)
})

test('walker_whenTheVisitLeftThemAtTheTeaTableCloseUp_startsThereCloseUp', () => {
  const place = { position: teaTableFront.standingPoint, headingRadians: 1, closeUpOf: 'teaTable' } as const

  const navigator = new RoomNavigator(quietRoomLayout, () => {}, () => {}, place)

  assert.deepEqual(navigator.place, place)
  assert.deepEqual(navigator.view, { kind: 'closeUp', furnitureId: 'teaTable' })
})

test('walker_whenTheSavedPlaceIsInsideFurniture_startsAtTheEntrance', () => {
  const place = { position: { x: teaTable.footprint.x, z: teaTable.footprint.z }, headingRadians: 1, closeUpOf: null }

  const navigator = new RoomNavigator(quietRoomLayout, () => {}, () => {}, place)

  assert.deepEqual(navigator.walk.position, walkerStart)
})

test('walker_whenStartedAtTheTeaTableCloseUpAndTheFloorIsTapped_leavesTheCloseUp', () => {
  const navigator = new RoomNavigator(quietRoomLayout, () => {}, () => {}, { position: teaTableFront.standingPoint, headingRadians: 1, closeUpOf: 'teaTable' })

  navigator.tapped({ kind: 'floor', point: openFloorFrontLeft })

  assert.deepEqual(navigator.view, { kind: 'overview' })
})

test('teaTable_whenTappedFromTheEntrance_isApproachedAndShownFromTheFront', () => {
  const navigator = quietRoomNavigator()

  navigator.tapped({ kind: 'furniture', furnitureId: 'teaTable' })
  walkUntilStill(navigator)

  assert.deepEqual(navigator.walk.position, teaTableFront.standingPoint)
  assert.deepEqual(navigator.closeUpInView, teaTableFront.closeUp)
})

test('teaTable_whenTappedFromBesideTheWindow_isApproachedAndShownFromTheWindowSide', () => {
  const navigator = new RoomNavigator(quietRoomLayout, () => {}, () => {}, { position: backRightCorner, headingRadians: 0, closeUpOf: null })

  navigator.tapped({ kind: 'furniture', furnitureId: 'teaTable' })
  walkUntilStill(navigator)

  assert.deepEqual(navigator.walk.position, teaTableWindowSide?.standingPoint)
  assert.deepEqual(navigator.closeUpInView, teaTableWindowSide?.closeUp)
})

test('walker_whenTheVisitLeftThemAtTheTeaTableWindowSideCloseUp_startsShowingItFromTheWindowSide', () => {
  const place = { position: teaTableWindowSide?.standingPoint ?? walkerStart, headingRadians: 0, closeUpOf: 'teaTable' } as const

  const navigator = new RoomNavigator(quietRoomLayout, () => {}, () => {}, place)

  assert.deepEqual(navigator.closeUpInView, teaTableWindowSide?.closeUp)
})

function quietRoomNavigator(): RoomNavigator {
  return new RoomNavigator(quietRoomLayout, () => {})
}

function walkUntilStill(navigator: RoomNavigator, onEachFrame: (position: FloorPoint) => void = () => {}): void {
  for (let frame = 0; frame < 60 * 30 && isWalking(navigator.walk); frame += 1) {
    navigator.advance(frameSeconds)
    onEachFrame(navigator.walk.position)
  }
}

function isInsideTeaTable(point: FloorPoint): boolean {
  const { footprint } = teaTable
  return Math.abs(point.x - footprint.x) < footprint.width / 2 && Math.abs(point.z - footprint.z) < footprint.depth / 2
}
