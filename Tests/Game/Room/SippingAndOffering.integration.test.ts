import assert from 'node:assert/strict'
import test from 'node:test'
import { assertNear } from '../../Support/Assertions.ts'
import { onTopOf, TestRoom } from '../../Support/TestRoom.ts'

const onTheCounterBesideTheBowl = onTopOf('counter', 1, 0.05)

test('sipButton_whenTheKettleIsPickedUp_isNotOffered', () => {
  const room = new TestRoom()
  room.walkTo('counter')

  room.tap({ kind: 'item', itemId: 'kettle' })

  assert.equal(room.play.chosenHandIndex, 0)
  assert.equal(room.play.sippableCupId, null)
})

test('sipButton_whenTheChosenBowlIsEmpty_isNotOffered', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1')

  room.tap({ kind: 'hand', handIndex: 0 })

  assert.equal(room.play.sippableCupId, null)
})

test('sip_fromTheChosenBowlOfTea_takesTwentyMillilitres', () => {
  const room = new TestRoom()
  setTheTeaTable(room)
  room.ritual.pour('kettle', 'bowl1', 4)
  room.session.dispatch({ type: 'pickUp', itemId: 'bowl1' })
  room.tap({ kind: 'hand', handIndex: 0 })
  const volumeBeforeTheSip = room.state.vessels['bowl1']?.liquid.volumeMl ?? 0

  room.play.sipTapped()

  assertNear(room.state.vessels['bowl1']?.liquid.volumeMl ?? 0, volumeBeforeTheSip - 20)
})

test('figurine_whenTappedWithABowlOfTeaChosen_isOfferedIt', () => {
  const room = new TestRoom()
  setTheTeaTable(room)
  room.ritual.pour('kettle', 'bowl1', 4)
  room.session.dispatch({ type: 'pickUp', itemId: 'bowl1' })
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'figurine', figurineId: 'dragon' })

  assert.equal(room.state.figurines['dragon']?.wasOfferedTeaThisRitual, true)
})

test('figurine_whenTappedAwayFromTheTeaTable_leavesTheKeeperWhereTheyStand', () => {
  const room = new TestRoom()
  room.walkTo('counter')

  room.tap({ kind: 'figurine', figurineId: 'dragon' })
  room.advance(2)

  assert.deepEqual(room.play.view, { kind: 'closeUp', furnitureId: 'counter' })
})

test('keeper_whenSippingTeaBrewedInTheCaddyStraightFromIt_dies', () => {
  const room = new TestRoom()
  holdTheCaddyWithHotWaterPouredOntoItsLeaves(room)

  room.play.sipTapped()

  assert.equal(room.deathsSeen, 1)
})

test('keeper_whenSippingColdTapWaterStraightFromTheCaddy_lives', () => {
  const room = new TestRoom()
  holdTheCaddyWithColdTapWater(room)
  const mlBeforeTheSip = room.state.vessels['caddy']?.liquid.volumeMl ?? 0

  room.play.sipTapped()

  assert.equal(room.deathsSeen, 0)
  assertNear(mlBeforeTheSip - (room.state.vessels['caddy']?.liquid.volumeMl ?? 0), 20)
})

function setTheTeaTable(room: TestRoom): void {
  room.carryFromTheShelf('bowl1', 'caddy')
  room.walkTo('teaTable')
  room.putDown(0, { x: 0.8, y: 0.42, z: -1.5 })
  room.putDown(1, { x: 1.2, y: 0.42, z: -1.5 })
  room.walkTo('counter')
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
  room.fillInTheSink('kettle')
  room.walkTo('teaTable')
  room.putDown(0, { x: 1, y: 0.42, z: -1.8 })
}

function holdTheCaddyWithHotWaterPouredOntoItsLeaves(room: TestRoom): void {
  room.carryFromTheShelf('caddy')
  room.walkTo('counter')
  room.putDown(0, onTheCounterBesideTheBowl)
  room.session.dispatch({ type: 'openVesselLid', vesselId: 'caddy' })
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
  room.fillInTheSink('kettle')
  room.ritual.heatKettleTo(90)
  room.ritual.pour('kettle', 'caddy', 4)
  room.session.dispatch({ type: 'pickUp', itemId: 'caddy' })
  room.tap({ kind: 'hand', handIndex: room.state.keeper.hands[0] === 'caddy' ? 0 : 1 })
}

function holdTheCaddyWithColdTapWater(room: TestRoom): void {
  room.carryFromTheShelf('caddy')
  room.walkTo('counter')
  room.session.dispatch({ type: 'openVesselLid', vesselId: 'caddy' })
  room.session.dispatch({ type: 'putInTheSink', itemId: 'caddy' })
  room.advance(4)
  room.session.dispatch({ type: 'turnTheTapOff' })
  room.session.dispatch({ type: 'pickUp', itemId: 'caddy' })
  room.tap({ kind: 'hand', handIndex: room.state.keeper.hands[0] === 'caddy' ? 0 : 1 })
}
