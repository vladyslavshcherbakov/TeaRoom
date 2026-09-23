import assert from 'node:assert/strict'
import test from 'node:test'
import { testCatalog } from '../Support/TestCatalog.ts'
import { eventsOfType, TestRitual } from '../Support/TestRitual.ts'

function ritualWithTeaSteepingAt(waterC: number): TestRitual {
  const ritual = TestRitual.begun(testCatalog({ cup: 0.05 }))
  ritual.heatKettleTo(waterC)
  ritual.addLeavesToKettle(5)
  return ritual
}

function tasteFromCup(ritual: TestRitual) {
  ritual.pour('kettle', 'cup1', 9)
  ritual.waitUntilCupCoolsTo('cup1', 60)
  return eventsOfType(ritual.do({ type: 'tasteCup', cupId: 'cup1' }), 'teaTasted')[0]?.verdict
}

test('tea_whenSteepedForTheIdealTimeInGoodWater_tastesBalancedAndSoft', () => {
  const ritual = ritualWithTeaSteepingAt(80)
  ritual.wait(60)

  const verdict = tasteFromCup(ritual)

  assert.deepEqual(verdict, { temperature: 'pleasant', strength: 'balanced', bitterness: 'soft', reaction: 'contentSigh' })
})

test('tea_whenSteepedBriefly_tastesWeak', () => {
  const ritual = ritualWithTeaSteepingAt(80)
  ritual.wait(10)

  const verdict = tasteFromCup(ritual)

  assert.equal(verdict?.strength, 'weak')
  assert.equal(verdict?.reaction, 'shrug')
})

test('tea_whenLeftSteepingForFiveMinutes_tastesOverbrewed', () => {
  const ritual = ritualWithTeaSteepingAt(80)
  ritual.wait(300)

  const verdict = tasteFromCup(ritual)

  assert.deepEqual(verdict, { temperature: 'pleasant', strength: 'heavy', bitterness: 'overbrewed', reaction: 'strongGrimace' })
})

test('tea_whenBrewedWithBoilingWater_turnsMoreBitterThanWithGoodWater', () => {
  const inGoodWater = ritualWithTeaSteepingAt(80)
  const inBoilingWater = ritualWithTeaSteepingAt(100)

  inGoodWater.wait(60)
  inBoilingWater.wait(60)

  const goodBitterness = inGoodWater.vessel('kettle').liquid.bitterness
  const boilingBitterness = inBoilingWater.vessel('kettle').liquid.bitterness
  assert.ok(boilingBitterness > goodBitterness * 2, `boiling ${boilingBitterness}, good ${goodBitterness}`)
})

test('brew_whenWaterMeetsTheLeaves_startsAndJudgesTheWater', () => {
  const ritual = TestRitual.begun()
  ritual.heatKettleTo(80)

  const events = ritual.addLeavesToKettle(5)

  assert.deepEqual(eventsOfType(events, 'brewStarted'), [
    { type: 'brewStarted', vesselId: 'kettle', waterJudgement: 'ideal' },
  ])
})

test('brew_whenWaterIsPouredOntoLeavesInAnEmptyKettle_startsWithThatWater', () => {
  const ritual = TestRitual.begun()
  ritual.heatKettleTo(80)
  ritual.do({ type: 'openVesselLid', vesselId: 'thermos' })
  ritual.pour('kettle', 'thermos', 50)
  ritual.addLeavesToKettle(5)
  ritual.do({ type: 'openVesselLid', vesselId: 'kettle' })

  const events = ritual.pour('thermos', 'kettle', 25)

  assert.deepEqual(eventsOfType(events, 'brewStarted'), [
    { type: 'brewStarted', vesselId: 'kettle', waterJudgement: 'ideal' },
  ])
})

test('tea_onceInTheCup_stopsGrowingStronger', () => {
  const ritual = ritualWithTeaSteepingAt(80)
  ritual.wait(60)
  ritual.pour('kettle', 'cup1', 9)
  const strengthWhenPoured = ritual.vessel('cup1').liquid.strength

  ritual.wait(120)

  assert.equal(ritual.vessel('cup1').liquid.strength, strengthWhenPoured)
})

test('leaves_whenTheKettleLidIsClosed_areRefusedAndStayOnTheSpoon', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'openCaddy' })
  ritual.do({ type: 'scoopTea', depth: 1 })

  const events = ritual.do({ type: 'tipSpoonInto', vesselId: 'kettle' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'tipSpoonInto', reason: 'lidClosed' }])
  assert.equal(ritual.state.spoon.grams, 5)
})

test('spoon_whenTheCaddyIsClosed_scoopsNothing', () => {
  const ritual = TestRitual.begun()

  const events = ritual.do({ type: 'scoopTea', depth: 1 })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'scoopTea', reason: 'lidClosed' }])
  assert.equal(ritual.state.spoon.grams, 0)
})

test('spoon_whenDippedHalfway_holdsHalfItsCapacity', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'openCaddy' })

  ritual.do({ type: 'scoopTea', depth: 0.5 })

  assert.equal(ritual.state.spoon.grams, 2.5)
  assert.equal(ritual.state.caddy.grams, 47.5)
})

test('leaves_whenTippedIntoACup_areRefused', () => {
  const ritual = TestRitual.begun()
  ritual.do({ type: 'openCaddy' })
  ritual.do({ type: 'scoopTea', depth: 1 })

  const events = ritual.do({ type: 'tipSpoonInto', vesselId: 'cup1' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'tipSpoonInto', reason: 'cannotHoldLeaves' }])
})
