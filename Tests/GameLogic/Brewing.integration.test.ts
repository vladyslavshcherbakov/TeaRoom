import assert from 'node:assert/strict'
import test from 'node:test'
import { assertNear } from '../Support/Assertions.ts'
import { testCatalog, withMoreCaddies } from '../Support/TestCatalog.ts'
import { eventsOfType, TestTeaSession } from '../Support/TestTeaSession.ts'
import { steepedSecondsOf } from '../../Shared/GameLogic/Chemistry/Brewing.ts'

test('tea_whenSteepedForTheIdealTimeInGoodWater_tastesBalancedAndSoft', () => {
  const session = sessionWithTeaSteepingAt(80)
  session.wait(60)

  const verdict = tasteFromCup(session)

  assert.deepEqual(verdict, { temperature: 'pleasant', strength: 'balanced', bitterness: 'soft', reaction: 'contentSigh' })
})

test('tea_whenSteepedBriefly_tastesWeak', () => {
  const session = sessionWithTeaSteepingAt(80)
  session.wait(10)

  const verdict = tasteFromCup(session)

  assert.equal(verdict?.strength, 'weak')
  assert.equal(verdict?.reaction, 'shrug')
})

test('tea_whenLeftSteepingForFiveMinutes_tastesOverbrewed', () => {
  const session = sessionWithTeaSteepingAt(80)
  session.wait(300)

  const verdict = tasteFromCup(session)

  assert.deepEqual(verdict, { temperature: 'pleasant', strength: 'extreme', bitterness: 'overbrewed', reaction: 'strongGrimace' })
})

test('tea_whenBrewedWithSixTimesTheLeavesForAMinute_tastesExtremelyStrongButNotOverbrewed', () => {
  const session = new TestTeaSession(testCatalog({ cup: 0.05 }))
  session.heatKettleTo(80)
  session.addLeavesToKettle(30)
  session.wait(60)

  const verdict = tasteFromCup(session)

  assert.equal(verdict?.strength, 'extreme')
  assert.notEqual(verdict?.bitterness, 'overbrewed')
  assert.equal(verdict?.reaction, 'grimace')
})

test('tea_whenBrewedWithBoilingWater_turnsMoreBitterThanWithGoodWater', () => {
  const inGoodWater = sessionWithTeaSteepingAt(80)
  const inBoilingWater = sessionWithTeaSteepingAt(100)

  inGoodWater.wait(60)
  inBoilingWater.wait(60)

  const goodBitterness = inGoodWater.vessel('kettle').liquid.bitterness
  const boilingBitterness = inBoilingWater.vessel('kettle').liquid.bitterness
  assert.ok(boilingBitterness > goodBitterness * 2, `boiling ${boilingBitterness}, good ${goodBitterness}`)
})

test('tea_whileItBoilsOnTheHeater_brewsTwiceAsFastAsInWaterJustOffTheBoil', () => {
  const offTheHeater = sessionWithTeaSteepingAt(100)
  const onTheHeater = sessionWithTeaSteepingAt(100)
  onTheHeater.do({ type: 'placeOnHeater', itemId: 'kettle' })
  onTheHeater.do({ type: 'switchHeaterOn' })

  offTheHeater.wait(10)
  onTheHeater.wait(10)

  const bitternessOffTheHeater = offTheHeater.vessel('kettle').liquid.bitterness
  const bitternessOnTheHeater = onTheHeater.vessel('kettle').liquid.bitterness
  assertNear(bitternessOnTheHeater / bitternessOffTheHeater, 2, 0.05)
})

test('tea_onceTheHeaterUnderItsBoilIsSwitchedOff_brewsAtItsUsualPaceAgain', () => {
  const neverBoiled = sessionWithTeaSteepingAt(100)
  const boiledForAWhile = sessionWithTeaSteepingAt(100)
  boiledForAWhile.do({ type: 'placeOnHeater', itemId: 'kettle' })
  boiledForAWhile.do({ type: 'switchHeaterOn' })
  neverBoiled.wait(5)
  boiledForAWhile.wait(5)
  boiledForAWhile.do({ type: 'switchHeaterOff' })
  const bitternessBefore = [neverBoiled.vessel('kettle').liquid.bitterness, boiledForAWhile.vessel('kettle').liquid.bitterness]

  neverBoiled.wait(10)
  boiledForAWhile.wait(10)

  const gainNeverBoiled = neverBoiled.vessel('kettle').liquid.bitterness - (bitternessBefore[0] ?? 0)
  const gainAfterTheBoil = boiledForAWhile.vessel('kettle').liquid.bitterness - (bitternessBefore[1] ?? 0)
  assertNear(gainAfterTheBoil / gainNeverBoiled, 1, 0.02)
})

test('leaves_addedToABrewPastTheFirstTeasIdealTime_steepFromTheStartWhileTheFirstTeaTurnsBitter', () => {
  const session = new TestTeaSession(withMoreCaddies(testCatalog(), { blackCaddy: 'testBlack' }))
  session.heatKettleTo(80)
  session.addLeavesToKettle(5)
  session.wait(60)
  session.do({ type: 'openVesselLid', vesselId: 'kettle' })
  session.tipASpoonOfLeavesInto('kettle', 'blackCaddy')
  const bitternessBefore = session.vessel('kettle').liquid.bitterness

  session.wait(10)

  assertNear(session.vessel('kettle').liquid.bitterness - bitternessBefore, 5, 0.05)
})

test('brew_whenWaterMeetsTheLeaves_starts', () => {
  const session = new TestTeaSession()
  session.heatKettleTo(80)

  const events = session.addLeavesToKettle(5)

  assert.deepEqual(eventsOfType(events, 'brewStarted'), [
    { type: 'brewStarted', vesselId: 'kettle' },
  ])
})

test('brew_whenWaterIsPouredOntoLeavesInAnEmptyKettle_startsWithThatWater', () => {
  const session = new TestTeaSession()
  session.heatKettleTo(80)
  session.do({ type: 'openVesselLid', vesselId: 'thermos' })
  session.pour('kettle', 'thermos', 50)
  session.addLeavesToKettle(5)
  session.do({ type: 'openVesselLid', vesselId: 'kettle' })

  const events = session.pour('thermos', 'kettle', 25)

  assert.deepEqual(eventsOfType(events, 'brewStarted'), [
    { type: 'brewStarted', vesselId: 'kettle' },
  ])
})

test('brew_whenItsVesselIsPouredEmpty_ends', () => {
  const session = kettleSteepingForAMinute()

  session.pour('kettle', null, 30, 45)

  assert.equal(session.vessel('kettle').leaves?.isSteeping, false)
})

test('brew_whenWaterComesBackToTheLeavesOfAnEndedBrew_startsFromNothing', () => {
  const session = kettleSteepingForAMinute()
  session.pour('kettle', null, 30, 45)
  session.doWithoutARefusal({ type: 'openVesselLid', vesselId: 'kettle' })

  session.fillInTheSink('kettle', 2)

  const leaves = session.vessel('kettle').leaves
  assert.ok(leaves !== null && steepedSecondsOf(leaves, 'testGreen') <= 2)
})

test('caddy_whenHotWaterIsPouredOntoItsLeaves_brewsTeaOfExtremeStrength', () => {
  const session = new TestTeaSession()
  session.heatKettleTo(80)
  session.do({ type: 'openVesselLid', vesselId: 'caddy' })
  session.pour('kettle', 'caddy', 10)
  session.wait(10)

  const events = session.do({ type: 'tasteCup', cupId: 'caddy' })

  assert.equal(eventsOfType(events, 'teaTasted')[0]?.verdict.strength, 'extreme')
})

test('tea_onceInTheCup_stopsGrowingStronger', () => {
  const session = sessionWithTeaSteepingAt(80)
  session.wait(60)
  session.pour('kettle', 'cup1', 9)
  const strengthWhenPoured = session.vessel('cup1').liquid.strength

  session.wait(120)

  assert.equal(session.vessel('cup1').liquid.strength, strengthWhenPoured)
})

test('leaves_whenTheKettleLidIsClosed_areRefusedAndStayOnTheSpoon', () => {
  const session = new TestTeaSession()
  session.do({ type: 'pickUp', itemId: 'spoon' })
  session.do({ type: 'openVesselLid', vesselId: 'caddy' })
  session.do({ type: 'scoopTea', caddyId: 'caddy', depth: 1 })

  const events = session.do({ type: 'tipSpoonInto', vesselId: 'kettle' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'tipSpoonInto', reason: 'lidClosed' }])
  assert.deepEqual(session.state.spoon.gramsByTeaId, { testGreen: 5 })
})

test('spoon_whenTheCaddyIsClosed_scoopsNothing', () => {
  const session = new TestTeaSession()
  session.do({ type: 'pickUp', itemId: 'spoon' })

  const events = session.do({ type: 'scoopTea', caddyId: 'caddy', depth: 1 })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'scoopTea', reason: 'lidClosed' }])
  assert.deepEqual(session.state.spoon.gramsByTeaId, {})
})

test('spoon_whenFull_scoopsNoMore', () => {
  const session = new TestTeaSession()
  session.do({ type: 'pickUp', itemId: 'spoon' })
  session.do({ type: 'openVesselLid', vesselId: 'caddy' })
  session.do({ type: 'scoopTea', caddyId: 'caddy', depth: 1 })

  const events = session.do({ type: 'scoopTea', caddyId: 'caddy', depth: 1 })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'scoopTea', reason: 'spoonIsFull' }])
  assert.deepEqual(session.vessel('caddy').leaves?.gramsByTeaId, { testGreen: 45 })
})

test('spoon_inAnEmptiedCaddy_scoopsNothing', () => {
  const session = new TestTeaSession()
  session.addLeavesToKettle(50)
  session.do({ type: 'pickUp', itemId: 'spoon' })
  session.do({ type: 'openVesselLid', vesselId: 'caddy' })

  const events = session.do({ type: 'scoopTea', caddyId: 'caddy', depth: 1 })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'scoopTea', reason: 'caddyIsEmpty' }])
})

test('spoon_holdingNoLeaves_tipsNothing', () => {
  const session = new TestTeaSession()
  session.do({ type: 'pickUp', itemId: 'spoon' })

  const events = session.do({ type: 'tipSpoonInto', vesselId: 'cup1' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'tipSpoonInto', reason: 'spoonIsEmpty' }])
})

test('spoon_whenDippedHalfway_holdsHalfItsCapacity', () => {
  const session = new TestTeaSession()
  session.do({ type: 'pickUp', itemId: 'spoon' })
  session.do({ type: 'openVesselLid', vesselId: 'caddy' })

  session.do({ type: 'scoopTea', caddyId: 'caddy', depth: 0.5 })

  assert.deepEqual(session.state.spoon.gramsByTeaId, { testGreen: 2.5 })
  assert.deepEqual(session.vessel('caddy').leaves?.gramsByTeaId, { testGreen: 47.5 })
})

test('leaves_whenTippedIntoTheThermos_areRefused', () => {
  const session = new TestTeaSession()
  session.do({ type: 'pickUp', itemId: 'spoon' })
  session.do({ type: 'openVesselLid', vesselId: 'caddy' })
  session.do({ type: 'scoopTea', caddyId: 'caddy', depth: 1 })

  const events = session.do({ type: 'tipSpoonInto', vesselId: 'thermos' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'tipSpoonInto', reason: 'cannotHoldLeaves' }])
})

test('spoon_tippedBackOverItsCaddy_isRefusedAndKeepsItsLeaves', () => {
  const session = new TestTeaSession()
  session.do({ type: 'pickUp', itemId: 'spoon' })
  session.do({ type: 'openVesselLid', vesselId: 'caddy' })
  session.do({ type: 'scoopTea', caddyId: 'caddy', depth: 1 })

  const events = session.do({ type: 'tipSpoonInto', vesselId: 'caddy' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'tipSpoonInto', reason: 'caddyTakesNoLeaves' }])
  assert.deepEqual([session.state.spoon.gramsByTeaId, session.vessel('caddy').leaves?.gramsByTeaId], [{ testGreen: 5 }, { testGreen: 45 }])
})

test('leaves_whenTippedIntoACup_lieInTheCup', () => {
  const session = new TestTeaSession()

  session.tipASpoonOfLeavesInto('cup1')

  assert.deepEqual(session.vessel('cup1').leaves?.gramsByTeaId, { testGreen: 5 })
})

test('tea_whenHotWaterIsPouredOnLeavesInACup_brewsInTheCup', () => {
  const session = new TestTeaSession()
  session.heatKettleTo(80)
  session.tipASpoonOfLeavesInto('cup1')

  const events = session.pour('kettle', 'cup1', 5)

  assert.deepEqual(eventsOfType(events, 'brewStarted'), [{ type: 'brewStarted', vesselId: 'cup1' }])
})

test('sip_fromACupWithLeavesInIt_saysTheCupHeldLeaves', () => {
  const session = new TestTeaSession()
  session.heatKettleTo(80)
  session.tipASpoonOfLeavesInto('cup1')
  session.pour('kettle', 'cup1', 5)
  session.wait(30)

  const events = session.do({ type: 'tasteCup', cupId: 'cup1' })

  assert.equal(eventsOfType(events, 'teaTasted')[0]?.cupHeldLeaves, true)
})

test('sip_fromACupPouredFromTheKettle_saysTheCupHeldNoLeaves', () => {
  const session = sessionWithTeaSteepingAt(80)
  session.pour('kettle', 'cup1', 5)

  const events = session.do({ type: 'tasteCup', cupId: 'cup1' })

  assert.equal(eventsOfType(events, 'teaTasted')[0]?.cupHeldLeaves, false)
})

test('spoon_lyingOnTheTable_scoopsNothingUntilItIsTaken', () => {
  const session = new TestTeaSession()
  session.do({ type: 'openVesselLid', vesselId: 'caddy' })

  const events = session.do({ type: 'scoopTea', caddyId: 'caddy', depth: 1 })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'scoopTea', reason: 'notInHand' }])
  assert.deepEqual(session.vessel('caddy').leaves?.gramsByTeaId, { testGreen: 50 })
})

test('leaves_scoopedFromASecondCaddy_areOfTheTeaThatCaddyKeeps', () => {
  const session = new TestTeaSession(withMoreCaddies(testCatalog(), { blackCaddy: 'testBlack' }))

  session.tipASpoonOfLeavesInto('cup1', 'blackCaddy')

  assert.deepEqual(session.vessel('cup1').leaves?.gramsByTeaId, { testBlack: 5 })
})

test('spoon_halfFullOfOneTea_scoopsASecondTeaAndHoldsBoth', () => {
  const session = new TestTeaSession(withMoreCaddies(testCatalog(), { blackCaddy: 'testBlack' }))
  session.do({ type: 'pickUp', itemId: 'spoon' })
  session.do({ type: 'openVesselLid', vesselId: 'caddy' })
  session.do({ type: 'openVesselLid', vesselId: 'blackCaddy' })
  session.do({ type: 'scoopTea', caddyId: 'caddy', depth: 0.5 })

  session.do({ type: 'scoopTea', caddyId: 'blackCaddy', depth: 1 })

  assert.deepEqual(session.state.spoon.gramsByTeaId, { testGreen: 2.5, testBlack: 2.5 })
})

test('leaves_ofASecondTeaTippedIntoACup_lieThereWithTheFirst', () => {
  const session = new TestTeaSession(withMoreCaddies(testCatalog(), { blackCaddy: 'testBlack' }))
  session.tipASpoonOfLeavesInto('cup1')

  session.tipASpoonOfLeavesInto('cup1', 'blackCaddy')

  assert.deepEqual(session.vessel('cup1').leaves?.gramsByTeaId, { testGreen: 5, testBlack: 5 })
})

test('spoon_dippedIntoAVesselTheRoomKeepsNoTeaIn_scoopsNothing', () => {
  const session = new TestTeaSession()
  session.tipASpoonOfLeavesInto('cup1')

  const events = session.do({ type: 'scoopTea', caddyId: 'cup1', depth: 1 })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'scoopTea', reason: 'notACaddy' }])
})

function sessionWithTeaSteepingAt(waterC: number): TestTeaSession {
  const session = new TestTeaSession(testCatalog({ cup: 0.05 }))
  session.heatKettleTo(waterC)
  session.addLeavesToKettle(5)
  return session
}

function tasteFromCup(session: TestTeaSession) {
  session.pour('kettle', 'cup1', 9)
  session.waitUntilCupCoolsTo('cup1', 60)
  return eventsOfType(session.do({ type: 'tasteCup', cupId: 'cup1' }), 'teaTasted')[0]?.verdict
}

function kettleSteepingForAMinute(): TestTeaSession {
  const session = new TestTeaSession()
  session.heatKettleTo(80)
  session.addLeavesToKettle(5)
  session.wait(60)
  return session
}
