import assert from 'node:assert/strict'
import test from 'node:test'
import { isUnderAnotherItem, nearestSpotSearchedWithinMetres, whyThereIsNoRoomFor, type LyingLid } from '../../../Apps/Game/Room/Layout/Placement.ts'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import { definitionIn } from '../../../Shared/Engine/Catalog.ts'
import { assertNear } from '../../Support/Assertions.ts'
import { quietRoomLayout, onTheShelfBoard, onTheTeaTable, onTopOf, spotOn, TestRoom } from '../../Support/TestRoom.ts'
import { standingSpotOf } from '../../../Shared/GameLogic/State/WhereItemsAre.ts'

const behindTheKettle = onTopOf('counter', -0.1, -0.21)
const kettleAndCaddyLidsTouchWithinMetres = 0.17
const beyondTheSinksEdgeMetres = 0.05
const atTheSinksEdge = { x: quietRoomLayout.sinkBasin.x + quietRoomLayout.sinkBasin.width / 2 + beyondTheSinksEdgeMetres, y: onTopOf('counter', 0, 0).y, z: quietRoomLayout.sinkBasin.z }
const quietRoomSurroundings = { layout: quietRoomLayout, heaterSpot: definitionIn(defaultCatalog, 'rooms', 'quietRoom').heaterSpot }

test('openKettleLid_withTheHeaterOnItsLeftTheSinkOnItsRightAndTheEdgeInFront_liesBehindTheKettle', () => {
  const room = new TestRoom()
  room.walkTo('counter')

  room.session.dispatch({ type: 'openVesselLid', vesselId: 'kettle' })

  const offset = lidLyingOpen('kettle', room)?.offset
  assertNear(offset?.x ?? Number.NaN, 0, 1e-9)
  assert.ok((offset?.z ?? 0) < 0, `lid offset ${JSON.stringify(offset)}`)
})

test('openLids_ofACaddyPutDownBesideTheKettle_lieApart', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
  room.walkTo('teaTable')
  room.putDown(0, onTopOf('teaTable', 0, 0))
  room.session.dispatch({ type: 'openVesselLid', vesselId: 'kettle' })
  room.carryFromTheShelf('caddy')
  room.walkTo('teaTable')
  room.putDown(0, onTopOf('teaTable', -0.44, 0))

  room.session.dispatch({ type: 'openVesselLid', vesselId: 'caddy' })

  const kettleLid = lidLyingOpen('kettle', room)
  const caddyLid = lidLyingOpen('caddy', room)
  assert.ok(kettleLid !== undefined && caddyLid !== undefined, JSON.stringify(room.lyingLids.layOpenLids(room.state, quietRoomSurroundings)))
  const lidsApartMetres = Math.hypot(kettleLid.spot.x - caddyLid.spot.x, kettleLid.spot.z - caddyLid.spot.z)
  assert.ok(lidsApartMetres >= kettleAndCaddyLidsTouchWithinMetres, `the lids lie ${lidsApartMetres.toFixed(3)} m apart`)
})

test('openCaddyLid_whenTheKettleBesideItOpensItsLid_keepsItsPlace', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
  room.walkTo('teaTable')
  room.putDown(0, onTopOf('teaTable', 0, 0))
  room.carryFromTheShelf('caddy')
  room.walkTo('teaTable')
  room.putDown(0, onTopOf('teaTable', -0.44, 0))
  room.session.dispatch({ type: 'openVesselLid', vesselId: 'caddy' })
  const caddyLidBefore = lidLyingOpen('caddy', room)

  room.session.dispatch({ type: 'openVesselLid', vesselId: 'kettle' })

  assert.deepEqual(lidLyingOpen('caddy', room), caddyLidBefore)
})

test('openCaddyLid_withNoRoomBesideTheCaddy_isLoggedOnce', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1', 'bowl2')
  room.walkTo('teaTable')
  room.putDown(0, onTopOf('teaTable', 0.415, -0.35))
  room.putDown(1, onTopOf('teaTable', 0.6, -0.165))
  room.carryFromTheShelf('caddy')
  room.walkTo('teaTable')
  room.putDown(0, onTopOf('teaTable', 0.6, -0.35))
  room.session.dispatch({ type: 'openVesselLid', vesselId: 'caddy' })

  lidLyingOpen('caddy', room)
  lidLyingOpen('caddy', room)

  assert.equal(room.logLines.filter((line) => line.startsWith('the open lid of caddy finds no room')).length, 1, room.logLines.join('\n'))
})

test('bowl_whenPutDownOnTheKettlesOpenLid_standsClearOfTheLid', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1')
  room.walkTo('counter')
  room.session.dispatch({ type: 'openVesselLid', vesselId: 'kettle' })

  room.tapAndChoose({ kind: 'surface', furnitureId: 'counter', point: behindTheKettle }, 'putDownHere')

  const bowlSpot = standingSpotOf(room.state.vessels['bowl1']?.location)
  if (bowlSpot === null) throw new Error('the bowl is not standing on the counter')
  assert.equal(isUnderAnotherItem('bowl1', bowlSpot, room.state, quietRoomSurroundings, room.lyingLids), false)
})

test('bowl_underTheSpoutOfTheKettleStandingThere_hasNoRoom', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
  room.walkTo('teaTable')
  room.putDown(0, onTheTeaTable)

  const refusal = whyThereIsNoRoomFor('bowl1', spotOn('teaTable', { ...onTheTeaTable, x: onTheTeaTable.x + 0.26 }), room.state, quietRoomSurroundings, room.lyingLids)

  assert.equal(refusal, 'somethingIsThere')
})

test('kettle_withItsSpoutOverTheShelfsFrontEdge_fits', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
  room.walkTo('shelf')

  const refusal = whyThereIsNoRoomFor('kettle', spotOn('shelf', onTheShelfBoard('upper', 0.09, 0.5)), room.state, quietRoomSurroundings, room.lyingLids)

  assert.equal(refusal, null)
})

test('bowl_onTopOfTheShelf_hasNoRoom', () => {
  const room = new TestRoom()
  room.walkTo('shelf')
  room.session.dispatch({ type: 'pickUp', itemId: 'bowl1' })

  const refusal = whyThereIsNoRoomFor('bowl1', spotOn('shelf', onTopOf('shelf', 0, 0)), room.state, quietRoomSurroundings, room.lyingLids)

  assert.equal(refusal, 'theTopTakesNoItems')
})

test('bowl_behindTheKettleAwayFromItsSpout_fits', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
  room.walkTo('teaTable')
  room.putDown(0, onTheTeaTable)

  const refusal = whyThereIsNoRoomFor('bowl1', spotOn('teaTable', { ...onTheTeaTable, x: onTheTeaTable.x - 0.26 }), room.state, quietRoomSurroundings, room.lyingLids)

  assert.equal(refusal, null)
})

test('kettle_whenPutDownAtTheSinksEdge_standsNearbyClearOfTheSink', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.take('kettle')

  room.tapAndChoose({ kind: 'surface', furnitureId: 'counter', point: atTheSinksEdge }, 'putDownHere')

  const kettleSpot = standingSpotOf(room.state.vessels['kettle']?.location)
  if (kettleSpot === null) throw new Error('the kettle is not standing on the counter')
  assert.equal(whyThereIsNoRoomFor('kettle', kettleSpot, room.state, quietRoomSurroundings, room.lyingLids), null)
  assert.ok(Math.hypot(kettleSpot.x - atTheSinksEdge.x, kettleSpot.z - atTheSinksEdge.z) <= nearestSpotSearchedWithinMetres, JSON.stringify(kettleSpot))
})

test('kettle_atTheSinksEdge_hasNoRoomBecauseTheSinkIsThere', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })

  const refusal = whyThereIsNoRoomFor('kettle', spotOn('counter', atTheSinksEdge), room.state, quietRoomSurroundings, room.lyingLids)

  assert.equal(refusal, 'theSinkIsThere')
})

test('bowl_whenPutDownOnTopOfTheShelf_staysInTheHandAndThePlayerSaysThereIsNoRoom', () => {
  const room = new TestRoom()
  room.walkTo('shelf')
  room.take('bowl1')

  room.tapAndChoose({ kind: 'surface', furnitureId: 'shelf', point: onTopOf('shelf', 0, 0) }, 'putDownHere')

  assert.deepEqual({ bowlIsIn: room.state.vessels['bowl1']?.location.kind, barks: room.barks }, { bowlIsIn: 'inHand', barks: [{ kind: 'noRoomToPutDown', timesMade: 1 }] })
})

test('bowl_overACornerOfTheHeaterPlate_hasNoRoom', () => {
  const room = new TestRoom()
  room.walkTo('shelf')
  room.session.dispatch({ type: 'pickUp', itemId: 'bowl1' })
  room.walkTo('counter')

  const refusal = whyThereIsNoRoomFor('bowl1', spotOn('counter', onTopOf('counter', -0.76, 0.19)), room.state, quietRoomSurroundings, room.lyingLids)

  assert.equal(refusal, 'theHeaterIsThere')
})

function lidLyingOpen(itemId: string, room: TestRoom): LyingLid | undefined {
  return room.lyingLids.layOpenLids(room.state, quietRoomSurroundings).find((lid) => lid.itemId === itemId)
}
