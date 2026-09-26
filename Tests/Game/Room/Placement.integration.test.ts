import assert from 'node:assert/strict'
import test from 'node:test'
import { lidsLyingOpen, whyThereIsNoRoomFor, type LyingLid } from '../../../Apps/Game/Room/Placement.ts'
import { quietRoomLayout } from '../../../Apps/Game/Room/RoomLayout.ts'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import { definitionIn } from '../../../Shared/Simulation/Definitions/Catalog.ts'
import { assertNear } from '../../Support/Assertions.ts'
import { onTopOf, spotOn, TestRoom } from '../../Support/TestRoom.ts'

const onTheTeaTable = onTopOf('teaTable', 0, 0.05)
const behindTheKettle = onTopOf('counter', -0.1, -0.21)
const kettleAndCaddyLidsTouchWithinMetres = 0.17
const quietRoomSurroundings = { layout: quietRoomLayout, heaterSpot: definitionIn(defaultCatalog, 'rooms', 'quietRoom').heaterSpot }

test('openKettleLid_withTheHeaterOnItsLeftTheSinkOnItsRightAndTheEdgeInFront_liesBehindTheKettle', () => {
  const room = new TestRoom()
  room.walkTo('counter')

  room.session.dispatch({ type: 'openVesselLid', vesselId: 'kettle' })

  const offset = lidLyingOpen('kettle', room.state)?.offset
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

  const kettleLid = lidLyingOpen('kettle', room.state)
  const caddyLid = lidLyingOpen('caddy', room.state)
  assert.ok(kettleLid !== undefined && caddyLid !== undefined, JSON.stringify(lidsLyingOpen(room.state, quietRoomSurroundings)))
  const lidsApartMetres = Math.hypot(kettleLid.spot.x - caddyLid.spot.x, kettleLid.spot.z - caddyLid.spot.z)
  assert.ok(lidsApartMetres >= kettleAndCaddyLidsTouchWithinMetres, `the lids lie ${lidsApartMetres.toFixed(3)} m apart`)
})

test('bowl_whenPutDownOnTheKettlesOpenLid_staysInHand', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1')
  room.walkTo('counter')
  room.session.dispatch({ type: 'openVesselLid', vesselId: 'kettle' })
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'surface', furnitureId: 'counter', point: behindTheKettle })

  assert.deepEqual(room.state.keeper.hands, ['bowl1', null, null])
  assert.ok(room.logLines.some((line) => line.startsWith('no room for bowl1') && line.endsWith('somethingIsThere')), room.logLines.join('\n'))
})

test('bowl_underTheSpoutOfTheKettleStandingThere_hasNoRoom', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
  room.walkTo('teaTable')
  room.putDown(0, onTheTeaTable)

  const refusal = whyThereIsNoRoomFor('bowl1', spotOn('teaTable', { ...onTheTeaTable, x: onTheTeaTable.x + 0.26 }), room.state, quietRoomSurroundings)

  assert.equal(refusal, 'somethingIsThere')
})

test('kettle_withItsSpoutOverTheShelfsFrontEdge_fits', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
  room.walkTo('shelf')

  const refusal = whyThereIsNoRoomFor('kettle', spotOn('shelf', { x: -2.66, y: 1.22, z: 0.9 }), room.state, quietRoomSurroundings)

  assert.equal(refusal, null)
})

test('bowl_onTopOfTheShelf_hasNoRoom', () => {
  const room = new TestRoom()
  room.walkTo('shelf')
  room.session.dispatch({ type: 'pickUp', itemId: 'bowl1' })

  const refusal = whyThereIsNoRoomFor('bowl1', spotOn('shelf', { x: -2.75, y: 1.72, z: 0.4 }), room.state, quietRoomSurroundings)

  assert.equal(refusal, 'theTopTakesNoItems')
})

test('bowl_behindTheKettleAwayFromItsSpout_fits', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
  room.walkTo('teaTable')
  room.putDown(0, onTheTeaTable)

  const refusal = whyThereIsNoRoomFor('bowl1', spotOn('teaTable', { ...onTheTeaTable, x: onTheTeaTable.x - 0.26 }), room.state, quietRoomSurroundings)

  assert.equal(refusal, null)
})

test('kettle_whenPutDownAtTheSinksEdge_staysInHand', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })

  room.tap({ kind: 'surface', furnitureId: 'counter', point: { x: -1.22, y: 0.9, z: -2.7 } })

  assert.equal(room.state.vessels['kettle']?.location.kind, 'inHand')
})

test('bowl_overACornerOfTheHeaterPlate_hasNoRoom', () => {
  const room = new TestRoom()
  room.walkTo('shelf')
  room.session.dispatch({ type: 'pickUp', itemId: 'bowl1' })
  room.walkTo('counter')

  const refusal = whyThereIsNoRoomFor('bowl1', spotOn('counter', onTopOf('counter', -0.76, 0.19)), room.state, quietRoomSurroundings)

  assert.equal(refusal, 'theHeaterIsThere')
})

function lidLyingOpen(itemId: string, state: TestRoom['state']): LyingLid | undefined {
  return lidsLyingOpen(state, quietRoomSurroundings).find((lid) => lid.itemId === itemId)
}
