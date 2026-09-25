import assert from 'node:assert/strict'
import test from 'node:test'
import { furnitureWithId, walkerStart, type FloorPoint } from '../../../Apps/Game/Room/RoomLayout.ts'
import { RoomNavigator } from '../../../Apps/Game/Room/RoomNavigator.ts'
import { isWalking } from '../../../Apps/Game/Room/Walking/Walk.ts'
import { assertNear } from '../../Support/Assertions.ts'

const frameSeconds = 1 / 60
const teaTable = furnitureWithId('teaTable')

function roomWithLog() {
  const logLines: string[] = []
  return { navigator: new RoomNavigator((message) => logLines.push(message)), logLines }
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

test('walker_whenTheFloorIsTapped_walksThereAndStops', () => {
  const { navigator } = roomWithLog()

  navigator.tapped({ kind: 'floor', point: { x: -1, z: 1.5 } })
  walkUntilStill(navigator)

  assertNear(navigator.walk.position.x, -1)
  assertNear(navigator.walk.position.z, 1.5)
  assert.deepEqual(navigator.view, { kind: 'overview' })
})

test('walker_whenAPointInsideTheTeaTableIsTapped_staysWhereItIs', () => {
  const { navigator, logLines } = roomWithLog()

  navigator.tapped({ kind: 'floor', point: { x: teaTable.footprint.x, z: teaTable.footprint.z } })

  assert.deepEqual(navigator.walk.position, walkerStart)
  assert.equal(isWalking(navigator.walk), false)
  assert.ok(logLines.some((line) => line.startsWith('no way to (1.00, -1.55)')), logLines.join('\n'))
})

test('walker_onTheWayBehindTheTeaTable_goesAroundIt', () => {
  const { navigator } = roomWithLog()
  const positionsInsideTheTable: FloorPoint[] = []

  navigator.tapped({ kind: 'floor', point: { x: 1, z: -2.45 } })
  walkUntilStill(navigator, (position) => {
    if (isInsideTeaTable(position)) positionsInsideTheTable.push(position)
  })

  assert.deepEqual(positionsInsideTheTable, [])
  assertNear(navigator.walk.position.z, -2.45)
})

test('shelf_whenTapped_isShownCloseUpOnceTheWalkerArrives', () => {
  const { navigator } = roomWithLog()

  navigator.tapped({ kind: 'furniture', furnitureId: 'shelf' })
  const viewOnTheWay = navigator.view
  walkUntilStill(navigator)

  assert.deepEqual(viewOnTheWay, { kind: 'approaching', furnitureId: 'shelf' })
  assert.deepEqual(navigator.view, { kind: 'closeUp', furnitureId: 'shelf' })
  assert.deepEqual(navigator.walk.position, furnitureWithId('shelf').standingPoint)
})

test('closeUp_whenTheFloorIsTapped_returnsToTheOverviewWithoutWalking', () => {
  const { navigator } = roomWithLog()
  navigator.tapped({ kind: 'furniture', furnitureId: 'teaTable' })
  walkUntilStill(navigator)

  navigator.tapped({ kind: 'floor', point: { x: -1, z: 1.5 } })

  assert.deepEqual(navigator.view, { kind: 'overview' })
  assert.equal(isWalking(navigator.walk), false)
})

test('walker_whenTappedElsewhereMidWalk_changesCourseToTheNewPoint', () => {
  const { navigator } = roomWithLog()
  navigator.tapped({ kind: 'furniture', furnitureId: 'counter' })
  navigator.advance(0.5)

  navigator.tapped({ kind: 'floor', point: { x: 2, z: 0 } })
  walkUntilStill(navigator)

  assertNear(navigator.walk.position.x, 2)
  assertNear(navigator.walk.position.z, 0)
  assert.deepEqual(navigator.view, { kind: 'overview' })
})

test('walker_whenWalkingFreelyIntoTheTeaTable_stopsAtItsEdge', () => {
  const { navigator } = roomWithLog()
  navigator.tapped({ kind: 'floor', point: { x: 1, z: -0.6 } })
  walkUntilStill(navigator)

  for (let frame = 0; frame < 120; frame += 1) navigator.walkFreely({ x: 0, z: -0.03 }, Math.PI)

  assert.equal(isInsideTeaTable(navigator.walk.position), false)
  assert.ok(navigator.walk.position.z > teaTable.footprint.z + teaTable.footprint.depth / 2, `z ${navigator.walk.position.z}`)
})

test('walker_whenWalkingFreelyAwayFromFurniture_leavesIt', () => {
  const places: (string | null)[] = []
  const navigator = new RoomNavigator(() => {}, (furnitureId) => places.push(furnitureId))
  navigator.tapped({ kind: 'furniture', furnitureId: 'teaTable' })
  walkUntilStill(navigator)

  navigator.walkFreely({ x: 0, z: 0.1 }, 0)

  assert.deepEqual(places, ['teaTable', null])
})

test('walker_whenWalkingFreelyOnTheWayToFurniture_givesUpTheWay', () => {
  const { navigator } = roomWithLog()
  navigator.tapped({ kind: 'furniture', furnitureId: 'shelf' })
  navigator.advance(frameSeconds)

  navigator.walkFreely({ x: 0.01, z: 0 }, Math.PI / 2)

  assert.deepEqual(navigator.view, { kind: 'overview' })
  assert.equal(isWalking(navigator.walk), false)
})

test('walker_whenTheVisitLeftThemAtTheTeaTableCloseUp_startsThereCloseUp', () => {
  const place = { position: teaTable.standingPoint, headingRadians: 1, closeUpOf: 'teaTable' } as const

  const navigator = new RoomNavigator(() => {}, () => {}, place)

  assert.deepEqual(navigator.place, place)
  assert.deepEqual(navigator.view, { kind: 'closeUp', furnitureId: 'teaTable' })
})

test('walker_whenTheSavedPlaceIsInsideFurniture_startsAtTheEntrance', () => {
  const place = { position: { x: teaTable.footprint.x, z: teaTable.footprint.z }, headingRadians: 1, closeUpOf: null }

  const navigator = new RoomNavigator(() => {}, () => {}, place)

  assert.deepEqual(navigator.walk.position, walkerStart)
})

test('walker_whenStartedAtTheTeaTableCloseUpAndTheFloorIsTapped_leavesTheCloseUp', () => {
  const navigator = new RoomNavigator(() => {}, () => {}, { position: teaTable.standingPoint, headingRadians: 1, closeUpOf: 'teaTable' })

  navigator.tapped({ kind: 'floor', point: { x: -1, z: 1.5 } })

  assert.deepEqual(navigator.view, { kind: 'overview' })
})
