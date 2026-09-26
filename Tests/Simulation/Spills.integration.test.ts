import assert from 'node:assert/strict'
import test from 'node:test'
import { testHouseCatalog } from '../Support/TestCatalog.ts'
import { ritualWithSpillOnTheTable, TestRitual } from '../Support/TestRitual.ts'
import { wetMlAt, wetMlOnEveryPlace } from '../../Shared/Simulation/Ritual/Puddles.ts'

const cupOnTheCounter = { placeId: 'counter', x: 5, y: 0, z: 0 }

test('table_whenLeftAlone_driesByItself', () => {
  const ritual = ritualWithSpillOnTheTable()

  ritual.wait(600)

  assert.equal(wetMlOnEveryPlace(ritual.state), 0)
})

test('spill_whilePouringAtTheCounter_wetsTheCounterAndNotTheTeaTable', () => {
  const ritual = new TestRitual(testHouseCatalog(), 'testHouse')
  ritual.do({ type: 'standAt', placeId: 'counter' })
  ritual.do({ type: 'pickUp', itemId: 'kettle' })

  ritual.pour('kettle', null, 2.5)

  assert.ok(wetMlAt(ritual.state, 'counter') > 0, JSON.stringify(ritual.state.puddles))
  assert.equal(wetMlAt(ritual.state, 'table'), 0)
})

test('spill_besideACupOnTheCounter_liesAroundThatCup', () => {
  const ritual = new TestRitual(testHouseCatalog(), 'testHouse')
  ritual.do({ type: 'standAt', placeId: 'shelf' })
  ritual.do({ type: 'pickUp', itemId: 'cup1' })
  ritual.do({ type: 'standAt', placeId: 'counter' })
  ritual.do({ type: 'putDown', itemId: 'cup1', spot: cupOnTheCounter })
  ritual.do({ type: 'pickUp', itemId: 'kettle' })

  ritual.pour('kettle', 'cup1', 2, undefined, 0.5)

  assert.deepEqual(ritual.state.puddles['counter']?.spilledAround, cupOnTheCounter)
})

test('spill_ofAStreamThatMissesTheCup_liesWhereTheStreamFalls', () => {
  const ritual = new TestRitual(testHouseCatalog(), 'testHouse')
  const whereTheStreamFalls = { placeId: 'counter', x: 3, y: 0, z: 0.5 }
  ritual.do({ type: 'standAt', placeId: 'shelf' })
  ritual.do({ type: 'pickUp', itemId: 'cup1' })
  ritual.do({ type: 'standAt', placeId: 'counter' })
  ritual.do({ type: 'putDown', itemId: 'cup1', spot: cupOnTheCounter })
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'cup1' })

  ritual.do({ type: 'adjustPour', tiltDegrees: 30, streamOnTargetFraction: 0, missedStreamLandsAt: whereTheStreamFalls })
  ritual.wait(1)

  assert.deepEqual(ritual.state.puddles['counter']?.spilledAround, whereTheStreamFalls)
  assert.equal(ritual.vessel('cup1').liquid.volumeMl, 0)
})

test('overflow_ofWaterPouredOnABowlFullOfTea_leavesAPuddleOfTheMixtureThatRanOver', () => {
  const ritual = new TestRitual()
  ritual.do({ type: 'openVesselLid', vesselId: 'thermos' })
  ritual.pour('kettle', 'thermos', 10)
  ritual.heatKettleTo(80)
  ritual.addLeavesToKettle(5)
  ritual.wait(60)
  ritual.pour('kettle', 'cup1', 9)
  const strengthOfTheTea = ritual.vessel('cup1').liquid.strength

  ritual.pour('thermos', 'cup1', 5)

  const puddleStrength = ritual.state.puddles['table']?.strength ?? 0
  assert.ok(puddleStrength > ritual.vessel('cup1').liquid.strength, `the puddle has strength ${puddleStrength}, the bowl ${ritual.vessel('cup1').liquid.strength}`)
  assert.ok(puddleStrength < strengthOfTheTea, `the puddle has strength ${puddleStrength}, the tea had ${strengthOfTheTea}`)
})
