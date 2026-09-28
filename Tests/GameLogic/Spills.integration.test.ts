import assert from 'node:assert/strict'
import test from 'node:test'
import { testHouseCatalog } from '../Support/TestCatalog.ts'
import { assertNear } from '../Support/Assertions.ts'
import { fullFlowTiltDegrees, sessionWithSpillOnTheTable, TestTeaSession } from '../Support/TestTeaSession.ts'
import { wetMlAt, wetMlOnEveryPlace } from '../../Shared/GameLogic/Simulation/Puddles.ts'
import type { Spot } from '../../Shared/GameLogic/Definitions/RoomDefinition.ts'

const cupOnTheCounter = { placeId: 'counter', x: 5, y: 0, z: 0 }

test('puddle_whenWaterFallsWhereNoPuddleLies_startsThere', () => {
  const session = new TestTeaSession()
  spillWholeStreamAt(session, onTheTableAt(-2), 1)

  spillWholeStreamAt(session, onTheTableAt(-5), 1)

  assert.deepEqual(Object.values(session.state.puddles).map((puddle) => puddle.centre.x), [-2, -5])
})

test('puddle_whenWaterFallsInsideIt_takesTheWaterAndMovesTowardsIt', () => {
  const session = new TestTeaSession()
  spillWholeStreamAt(session, onTheTableAt(-2), 1)

  spillWholeStreamAt(session, onTheTableAt(-2.2), 1)

  const [puddle, ...otherPuddles] = Object.values(session.state.puddles)
  assertNear(puddle?.centre.x ?? Infinity, -2.1, 0.01)
  assert.deepEqual(otherPuddles, [])
})

test('puddles_whenOneGrowsUntilTheyTouch_runIntoOne', () => {
  const session = new TestTeaSession()
  spillWholeStreamAt(session, onTheTableAt(-2), 1)
  spillWholeStreamAt(session, onTheTableAt(-2.5), 1)
  const wetMlOfBoth = wetMlOnEveryPlace(session.state)

  spillWholeStreamAt(session, onTheTableAt(-2.5), 2)

  assert.equal(Object.keys(session.state.puddles).length, 1)
  assert.ok(wetMlOnEveryPlace(session.state) > wetMlOfBoth, `${wetMlOnEveryPlace(session.state)} ml after ${wetMlOfBoth} ml`)
})

test('cloth_soakingAPuddleThatRunsIntoAnother_soaksThePuddleItRanInto', () => {
  const session = new TestTeaSession()
  spillWholeStreamAt(session, onTheTableAt(-2), 2)
  spillWholeStreamAt(session, onTheTableAt(-2.6), 1)
  session.do({ type: 'soakUpThePuddle', clothId: 'cloth', puddleId: 'puddle2', coveredFraction: 0 })

  spillWholeStreamAt(session, onTheTableAt(-2.3), 1)

  assert.deepEqual([session.cloth().soakingPuddleId, Object.keys(session.state.puddles)], ['puddle1', ['puddle1']])
})

test('pour_whenTheWholeStreamFallsWhereNoTopIs_losesTheWaterWithoutAPuddle', () => {
  const session = new TestTeaSession()
  const kettleMlBeforeThePour = session.state.vessels['kettle']?.liquid.volumeMl ?? 0
  session.doWithoutARefusal({ type: 'startPouring', sourceId: 'kettle', targetId: null })
  session.doWithoutARefusal({ type: 'adjustPour', tiltDegrees: fullFlowTiltDegrees, streamOnTargetFraction: 0, missedStreamLandsAt: null })

  session.wait(2)

  assert.deepEqual(session.state.puddles, {})
  assert.ok((session.state.vessels['kettle']?.liquid.volumeMl ?? 0) < kettleMlBeforeThePour, 'the kettle poured nothing')
})

test('table_whenLeftAlone_driesByItself', () => {
  const session = sessionWithSpillOnTheTable()

  session.wait(600)

  assert.equal(wetMlOnEveryPlace(session.state), 0)
})

test('spill_whilePouringAtTheCounter_wetsTheCounterAndNotTheTeaTable', () => {
  const session = new TestTeaSession(testHouseCatalog(), 'testHouse')
  session.do({ type: 'standAt', placeId: 'counter' })
  session.do({ type: 'pickUp', itemId: 'kettle' })

  session.pour('kettle', null, 2.5)

  assert.ok(wetMlAt(session.state, 'counter') > 0, JSON.stringify(session.state.puddles))
  assert.equal(wetMlAt(session.state, 'table'), 0)
})

test('overflow_ofACupOnTheCounter_liesAroundThatCup', () => {
  const session = new TestTeaSession(testHouseCatalog(), 'testHouse')
  session.do({ type: 'standAt', placeId: 'shelf' })
  session.do({ type: 'pickUp', itemId: 'cup1' })
  session.do({ type: 'standAt', placeId: 'counter' })
  session.do({ type: 'putDown', itemId: 'cup1', spot: cupOnTheCounter })
  session.do({ type: 'pickUp', itemId: 'kettle' })

  session.pour('kettle', 'cup1', 10, fullFlowTiltDegrees)

  assert.deepEqual(Object.values(session.state.puddles).map((puddle) => puddle.centre), [cupOnTheCounter])
})

test('spill_ofAStreamThatMissesTheCup_liesWhereTheStreamFalls', () => {
  const session = new TestTeaSession(testHouseCatalog(), 'testHouse')
  const whereTheStreamFalls = { placeId: 'counter', x: 3, y: 0, z: 0.5 }
  session.do({ type: 'standAt', placeId: 'shelf' })
  session.do({ type: 'pickUp', itemId: 'cup1' })
  session.do({ type: 'standAt', placeId: 'counter' })
  session.do({ type: 'putDown', itemId: 'cup1', spot: cupOnTheCounter })
  session.do({ type: 'pickUp', itemId: 'kettle' })
  session.do({ type: 'startPouring', sourceId: 'kettle', targetId: 'cup1' })

  session.do({ type: 'adjustPour', tiltDegrees: 30, streamOnTargetFraction: 0, missedStreamLandsAt: whereTheStreamFalls })
  session.wait(1)

  const [puddle, ...otherPuddles] = Object.values(session.state.puddles)
  assertNear(puddle?.centre.x ?? Infinity, whereTheStreamFalls.x)
  assertNear(puddle?.centre.z ?? Infinity, whereTheStreamFalls.z)
  assert.deepEqual(otherPuddles, [])
  assert.equal(session.vessel('cup1').liquid.volumeMl, 0)
})

test('overflow_ofWaterPouredOnABowlFullOfTea_leavesAPuddleOfTheMixtureThatRanOver', () => {
  const session = new TestTeaSession()
  session.do({ type: 'openVesselLid', vesselId: 'thermos' })
  session.pour('kettle', 'thermos', 10)
  session.heatKettleTo(80)
  session.addLeavesToKettle(5)
  session.wait(60)
  session.pour('kettle', 'cup1', 9)
  const strengthOfTheTea = session.vessel('cup1').liquid.strength

  session.pour('thermos', 'cup1', 5)

  const puddleStrength = Object.values(session.state.puddles).find((puddle) => puddle.centre.placeId === 'table')?.strength ?? 0
  assert.ok(puddleStrength > session.vessel('cup1').liquid.strength, `the puddle has strength ${puddleStrength}, the bowl ${session.vessel('cup1').liquid.strength}`)
  assert.ok(puddleStrength < strengthOfTheTea, `the puddle has strength ${puddleStrength}, the tea had ${strengthOfTheTea}`)
})

function spillWholeStreamAt(session: TestTeaSession, spot: Spot, seconds: number): void {
  session.doWithoutARefusal({ type: 'startPouring', sourceId: 'kettle', targetId: null })
  session.doWithoutARefusal({ type: 'adjustPour', tiltDegrees: fullFlowTiltDegrees, streamOnTargetFraction: 0, missedStreamLandsAt: spot })
  session.wait(seconds)
  session.doWithoutARefusal({ type: 'stopPouring' })
}

function onTheTableAt(x: number): Spot {
  return { placeId: 'table', x, y: 0, z: 0 }
}
