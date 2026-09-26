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

test('sip_fromTheChosenBowlOfTea_takesFortyMillilitres', () => {
  const room = new TestRoom()
  setTheTeaTable(room)
  room.ritual.pour('kettle', 'bowl1', 4)
  room.session.dispatch({ type: 'pickUp', itemId: 'bowl1' })
  room.tap({ kind: 'hand', handIndex: 0 })
  const volumeBeforeTheSip = room.state.vessels['bowl1']?.liquid.volumeMl ?? 0

  room.play.sipTapped()

  assertNear(room.state.vessels['bowl1']?.liquid.volumeMl ?? 0, volumeBeforeTheSip - 40)
})

test('sipGesture_rightAfterASip_stillShowsTheSipInTheBowlAtTheHand', () => {
  const room = new TestRoom()
  holdABowlOfTea(room)

  room.play.sipTapped()

  assert.equal(room.play.sipGestureView?.cupId, 'bowl1')
  assert.equal(room.play.sipGestureView?.liftShare, 0)
  assertNear(room.play.sipGestureView?.fillShareNotYetSipped ?? 0, 40 / 120)
})

test('sipGesture_halfwayThroughTheDrink_holdsTheBowlAtTheLipsWithHalfTheSipLeft', () => {
  const room = new TestRoom()
  holdABowlOfTea(room)
  room.play.sipTapped()

  room.advance(0.75)

  assertNear(room.play.sipGestureView?.liftShare ?? 0, 1)
  assertNear(room.play.sipGestureView?.fillShareNotYetSipped ?? 0, 20 / 120)
})

test('sipGesture_afterOneAndAHalfSeconds_isOver', () => {
  const room = new TestRoom()
  holdABowlOfTea(room)
  room.play.sipTapped()

  room.advance(1.6)

  assert.equal(room.play.sipGestureView, null)
})

test('sipButton_whileTheBowlIsAtTheLips_isNotOffered', () => {
  const room = new TestRoom()
  holdABowlOfTea(room)

  room.play.sipTapped()

  assert.equal(room.play.isTheSipOffered, false)
})

test('sipButton_afterTheBowlIsLoweredFromASip_isOfferedAgain', () => {
  const room = new TestRoom()
  holdABowlOfTea(room)
  room.play.sipTapped()

  room.advance(1.6)

  assert.equal(room.play.isTheSipOffered, true)
})

test('secondSip_whileTheBowlIsStillAtTheLips_drinksNothing', () => {
  const room = new TestRoom()
  holdABowlOfTea(room)
  room.play.sipTapped()
  const volumeAfterTheFirstSip = room.state.vessels['bowl1']?.liquid.volumeMl ?? 0

  room.play.sipTapped()

  assert.equal(room.state.vessels['bowl1']?.liquid.volumeMl, volumeAfterTheFirstSip)
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

test('handKey_afterTheKeeperDied_leavesTheHandsAsTheyWere', () => {
  const room = new TestRoom()
  holdTheCaddyWithHotWaterPouredOntoItsLeaves(room)
  const chosenHandIndexAtTheSip = room.play.chosenHandIndex
  room.play.sipTapped()

  room.play.handKeyTapped(chosenHandIndexAtTheSip ?? 0)

  assert.equal(room.play.chosenHandIndex, chosenHandIndexAtTheSip)
})

test('tapOnTheTap_afterTheKeeperDied_leavesTheWaterOff', () => {
  const room = new TestRoom()
  holdTheCaddyWithHotWaterPouredOntoItsLeaves(room)
  room.play.sipTapped()

  room.tap({ kind: 'faucet' })

  assert.equal(room.state.sink.runningWater, null)
})

test('keeper_whenSippingColdTapWaterStraightFromTheCaddy_lives', () => {
  const room = new TestRoom()
  holdTheCaddyWithColdTapWater(room)
  const mlBeforeTheSip = room.state.vessels['caddy']?.liquid.volumeMl ?? 0

  room.play.sipTapped()

  assert.equal(room.deathsSeen, 0)
  assertNear(mlBeforeTheSip - (room.state.vessels['caddy']?.liquid.volumeMl ?? 0), 40)
})

function holdABowlOfTea(room: TestRoom): void {
  setTheTeaTable(room)
  room.ritual.pour('kettle', 'bowl1', 4)
  room.session.dispatch({ type: 'pickUp', itemId: 'bowl1' })
  room.tap({ kind: 'hand', handIndex: 0 })
}

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
  room.session.dispatch({ type: 'turnTheTapOn' })
  room.advance(4)
  room.session.dispatch({ type: 'turnTheTapOff' })
  room.session.dispatch({ type: 'pickUp', itemId: 'caddy' })
  room.tap({ kind: 'hand', handIndex: room.state.keeper.hands[0] === 'caddy' ? 0 : 1 })
}
