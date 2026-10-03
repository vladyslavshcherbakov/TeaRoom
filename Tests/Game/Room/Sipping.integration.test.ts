import assert from 'node:assert/strict'
import test from 'node:test'
import { assertNear } from '../../Support/Assertions.ts'
import { onTheCounterBesideTheBowl, onTopOf, TestRoom } from '../../Support/TestRoom.ts'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import { definitionIn } from '../../../Shared/Engine/Catalog.ts'
import { itemIdsInTheHands } from '../../../Shared/GameLogic/State/WhereItemsAre.ts'

const onTheTeaTableAwayFromTheTeaThings = onTopOf('teaTable', -0.5, -0.25)
const bowlCapacityMl = definitionIn(defaultCatalog, 'vessels', 'teaBowl').capacityMl

test('handMenu_ofTheKettle_offersNoSip', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.take('kettle')

  room.tap({ kind: 'hand', handIndex: 0 })

  assert.deepEqual(room.actionsOffered(), ['putAway kettle', 'openTheLid kettle'])
})

test('handMenu_ofAnEmptyBowl_offersNoSip', () => {
  const room = new TestRoom()
  room.carryFromTheShelf('bowl1')

  room.tap({ kind: 'hand', handIndex: 0 })

  assert.deepEqual(room.actionsOffered(), ['putAway bowl'])
})

test('handMenu_ofABowlOfTea_offersToSipFromIt', () => {
  const room = new TestRoom()
  holdABowlOfTea(room)

  room.tap({ kind: 'hand', handIndex: 0 })

  assert.deepEqual(room.actionsOffered(), ['putAway bowl', 'sip bowl'])
})

test('handMenu_ofAThermosOfWater_offersToSipFromIt', () => {
  const room = new TestRoom()
  room.walkTo('counter')
  room.testSession.doWithoutARefusal({ type: 'pickUp', itemId: 'thermos' })
  room.fillInTheSink('thermos')

  room.tap({ kind: 'hand', handIndex: 0 })

  assert.ok(room.actionsOffered().includes('sip thermos'), room.actionsOffered().join(', '))
})

test('sip_chosenFromTheMenuOfABowlOfTea_takesFortyMillilitres', () => {
  const room = new TestRoom()
  holdABowlOfTea(room)
  const volumeBeforeTheSip = room.state.vessels['bowl1']?.liquid.volumeMl ?? 0

  room.tapAndChoose({ kind: 'hand', handIndex: 0 }, 'sip')

  assertNear(room.state.vessels['bowl1']?.liquid.volumeMl ?? 0, volumeBeforeTheSip - 40)
})

test('sipKey_withABowlOfTeaInHand_sipsFromIt', () => {
  const room = new TestRoom()
  holdABowlOfTea(room)
  const volumeBeforeTheSip = room.state.vessels['bowl1']?.liquid.volumeMl ?? 0

  room.playerController.sipTapped()

  assertNear(room.state.vessels['bowl1']?.liquid.volumeMl ?? 0, volumeBeforeTheSip - 40)
})

test('sipGesture_rightAfterASip_stillShowsTheSipInTheBowlAtTheHand', () => {
  const room = new TestRoom()
  holdABowlOfTea(room)

  room.playerController.sipTapped()

  assert.equal(room.playerController.sipGestureView?.cupId, 'bowl1')
  assert.equal(room.playerController.sipGestureView?.liftShare, 0)
  assertNear(room.playerController.sipGestureView?.fillShareNotYetSipped ?? 0, 40 / bowlCapacityMl)
})

test('sipGesture_halfwayThroughTheDrink_holdsTheBowlAtTheLipsWithHalfTheSipLeft', () => {
  const room = new TestRoom()
  holdABowlOfTea(room)
  room.playerController.sipTapped()

  room.advance(0.75)

  assertNear(room.playerController.sipGestureView?.liftShare ?? 0, 1)
  assertNear(room.playerController.sipGestureView?.fillShareNotYetSipped ?? 0, 20 / bowlCapacityMl)
})

test('sipGesture_afterOneAndAHalfSeconds_isOver', () => {
  const room = new TestRoom()
  holdABowlOfTea(room)
  room.playerController.sipTapped()

  room.advance(1.6)

  assert.equal(room.playerController.sipGestureView, null)
})

test('hand_whileTheBowlIsAtTheLips_opensNoMenu', () => {
  const room = new TestRoom()
  holdABowlOfTea(room)
  room.playerController.sipTapped()

  room.tap({ kind: 'hand', handIndex: 0 })

  assert.equal(room.playerController.actionMenuView, null)
})

test('handMenu_afterTheBowlIsLoweredFromASip_offersTheSipAgain', () => {
  const room = new TestRoom()
  holdABowlOfTea(room)
  room.playerController.sipTapped()
  room.advance(1.6)

  room.tap({ kind: 'hand', handIndex: 0 })

  assert.ok(room.actionsOffered().includes('sip bowl'), room.actionsOffered().join(', '))
})

test('secondSip_whileTheBowlIsStillAtTheLips_drinksNothing', () => {
  const room = new TestRoom()
  holdABowlOfTea(room)
  room.playerController.sipTapped()
  const volumeAfterTheFirstSip = room.state.vessels['bowl1']?.liquid.volumeMl ?? 0

  room.playerController.sipTapped()

  assert.equal(room.state.vessels['bowl1']?.liquid.volumeMl, volumeAfterTheFirstSip)
})

test('tapOnTheTeaTable_whileTheBowlIsAtTheLips_leavesTheBowlInTheHand', () => {
  const room = new TestRoom()
  holdABowlOfTea(room)
  room.playerController.sipTapped()

  room.tap({ kind: 'surface', furnitureId: 'teaTable', point: onTheTeaTableAwayFromTheTeaThings })

  assert.equal(itemIdsInTheHands(room.state)[0], 'bowl1')
})

test('handKey_whileTheBowlIsAtTheLips_opensNoMenu', () => {
  const room = new TestRoom()
  holdABowlOfTea(room)
  room.playerController.sipTapped()

  room.playerController.handKeyTapped(0)

  assert.equal(room.playerController.actionMenuView, null)
})

test('figurine_whenTappedWithABowlOfTeaInHandAtTheTeaTable_takesNoTeaAndIsBarkedOn', () => {
  const room = new TestRoom()
  holdABowlOfTea(room)
  const teaBeforeTheTap = room.state.vessels['bowl1']?.liquid.volumeMl

  room.tap({ kind: 'figurine', figurineId: 'dragon' })

  assert.equal(room.state.vessels['bowl1']?.liquid.volumeMl, teaBeforeTheTap)
  assert.deepEqual(room.barks, [{ kind: 'sillIsTheRoomsOwn', timesMade: 1 }])
})

test('figurine_whenTappedAwayFromTheTeaTable_leavesThePlayerWhereTheyStand', () => {
  const room = new TestRoom()
  room.walkTo('counter')

  room.tap({ kind: 'figurine', figurineId: 'dragon' })
  room.advance(2)

  assert.deepEqual(room.playerController.view, { kind: 'closeUp', furnitureId: 'counter' })
})

test('player_whenSippingTeaBrewedInTheCaddyStraightFromIt_dies', () => {
  const room = new TestRoom()
  holdTheCaddyWithHotWaterPouredOntoItsLeaves(room)

  room.playerController.sipTapped()

  assert.equal(room.deathsSeen, 1)
})

test('deathSound_whenTheDeathScreenIsShown_isHeard', () => {
  const room = new TestRoom()
  holdTheCaddyWithHotWaterPouredOntoItsLeaves(room)
  const soundsBeforeTheSip = room.soundsStarted.length

  room.playerController.sipTapped()

  assert.deepEqual(room.soundsStarted.slice(soundsBeforeTheSip), ['playerDied'])
})

test('player_whoDied_forgetsTheVisitAndSavesItNoMore', () => {
  const room = new TestRoom()
  holdTheCaddyWithHotWaterPouredOntoItsLeaves(room)
  room.playerController.sipTapped()

  room.visit.frameDrawn(10, { headingRadians: 0, pitchRadians: 0 }, true)

  assert.deepEqual({ forgotten: room.visitsForgotten, saved: room.savedVisits }, { forgotten: 1, saved: 0 })
})

test('handKey_afterThePlayerDied_opensNoMenu', () => {
  const room = new TestRoom()
  holdTheCaddyWithHotWaterPouredOntoItsLeaves(room)
  room.playerController.sipTapped()

  room.playerController.handKeyTapped(0)

  assert.equal(room.playerController.actionMenuView, null)
})

test('tapOnTheTap_afterThePlayerDied_leavesTheWaterOff', () => {
  const room = new TestRoom()
  holdTheCaddyWithHotWaterPouredOntoItsLeaves(room)
  room.playerController.sipTapped()

  room.tap({ kind: 'faucet' })

  assert.equal(room.state.sink.runningWater, null)
})

test('player_whenSippingColdTapWaterStraightFromTheCaddy_lives', () => {
  const room = new TestRoom()
  holdTheCaddyWithColdTapWater(room)
  const mlBeforeTheSip = room.state.vessels['caddy']?.liquid.volumeMl ?? 0

  room.playerController.sipTapped()

  assert.equal(room.deathsSeen, 0)
  assertNear(mlBeforeTheSip - (room.state.vessels['caddy']?.liquid.volumeMl ?? 0), 40)
})

function holdABowlOfTea(room: TestRoom): void {
  room.setTheTeaTable()
  room.testSession.pour('kettle', 'bowl1', 4)
  room.session.dispatch({ type: 'pickUp', itemId: 'bowl1' })
}

function holdTheCaddyWithHotWaterPouredOntoItsLeaves(room: TestRoom): void {
  room.carryFromTheShelf('caddy')
  room.walkTo('counter')
  room.putDown(0, onTheCounterBesideTheBowl)
  room.session.dispatch({ type: 'openVesselLid', vesselId: 'caddy' })
  room.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
  room.fillInTheSink('kettle')
  room.testSession.heatKettleTo(90)
  room.testSession.pour('kettle', 'caddy', 4)
  room.session.dispatch({ type: 'pickUp', itemId: 'caddy' })
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
}
