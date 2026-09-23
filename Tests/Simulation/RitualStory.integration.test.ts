import assert from 'node:assert/strict'
import test from 'node:test'
import { initialGodsSatisfaction } from '../../Shared/Simulation/State/InitialState.ts'
import type { RitualEvent } from '../../Shared/Simulation/Ritual/RitualEvent.ts'
import { testCatalog } from '../Support/TestCatalog.ts'
import { eventsOfType, TestRitual } from '../Support/TestRitual.ts'

test('clumsyRitual_overheatedThenWaitedThenOversteeped_stillEndsWithTheGodsNoLessContent', () => {
  const ritual = TestRitual.begun(testCatalog({ kettle: 0.003, thermos: 0.0004, cup: 0.02 }))
  const events: RitualEvent[] = []

  events.push(...ritual.heatKettleTo(100))
  events.push(...ritual.do({ type: 'openVesselLid', vesselId: 'thermos' }))
  events.push(...ritual.pour('kettle', 'thermos', 50))
  events.push(...ritual.do({ type: 'closeVesselLid', vesselId: 'thermos' }))
  events.push(...ritual.wait(600))
  events.push(...ritual.addLeavesToKettle(3))
  events.push(...ritual.do({ type: 'openVesselLid', vesselId: 'thermos' }))
  events.push(...ritual.do({ type: 'openVesselLid', vesselId: 'kettle' }))
  events.push(...ritual.pour('thermos', 'kettle', 30))
  events.push(...ritual.wait(300))
  events.push(...ritual.pour('kettle', 'cup1', 9))
  events.push(...ritual.pour('kettle', 'cup2', 9))
  events.push(...ritual.waitUntilCupCoolsTo('cup1', 60))
  events.push(...ritual.do({ type: 'tasteCup', cupId: 'cup1' }))
  events.push(...ritual.do({ type: 'offerCup', cupId: 'cup2', figurineId: 'toad' }))

  assert.equal(eventsOfType(events, 'heaterSwitchedOff')[0]?.waterJudgement, 'tooHot')
  assert.ok(['grimace', 'strongGrimace'].includes(eventsOfType(events, 'teaTasted')[0]?.verdict.reaction ?? 'none'))
  assert.equal(eventsOfType(events, 'figurineAcceptedTea').length, 1)
  assert.deepEqual(eventsOfType(events, 'actionRefused'), [])
  assert.ok(
    ritual.state.godsSatisfaction >= initialGodsSatisfaction,
    `the gods fell to ${ritual.state.godsSatisfaction} from ${initialGodsSatisfaction}`,
  )
})
