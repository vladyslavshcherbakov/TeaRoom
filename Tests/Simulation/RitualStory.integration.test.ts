import assert from 'node:assert/strict'
import test from 'node:test'
import { testCatalog } from '../Support/TestCatalog.ts'
import { eventsOfType, TestRitual } from '../Support/TestRitual.ts'

test('clumsyRitual_overheatedThenWaitedThenOversteeped_isTastedWithAGrimace', () => {
  const ritual = clumsyRitual()

  const events = ritual.do({ type: 'tasteCup', cupId: 'cup1' })

  assert.ok(['grimace', 'strongGrimace'].includes(eventsOfType(events, 'teaTasted')[0]?.verdict.reaction ?? 'none'), JSON.stringify(events))
})

test('clumsyRitual_overheatedThenWaitedThenOversteeped_isAcceptedAsAnOffering', () => {
  const ritual = clumsyRitual()

  const events = ritual.do({ type: 'offerCup', cupId: 'cup2', figurineId: 'toad' })

  assert.equal(eventsOfType(events, 'figurineAcceptedTea').length, 1, JSON.stringify(events))
})

function clumsyRitual(): TestRitual {
  const ritual = new TestRitual(testCatalog({ kettle: 0.003, thermos: 0.0004, cup: 0.02 }))
  ritual.heatKettleTo(100)
  ritual.do({ type: 'openVesselLid', vesselId: 'thermos' })
  ritual.pour('kettle', 'thermos', 50)
  ritual.do({ type: 'closeVesselLid', vesselId: 'thermos' })
  ritual.wait(600)
  ritual.addLeavesToKettle(3)
  ritual.do({ type: 'openVesselLid', vesselId: 'thermos' })
  ritual.do({ type: 'openVesselLid', vesselId: 'kettle' })
  ritual.pour('thermos', 'kettle', 30)
  ritual.do({ type: 'closeVesselLid', vesselId: 'kettle' })
  ritual.wait(300)
  ritual.pour('kettle', 'cup1', 9)
  ritual.pour('kettle', 'cup2', 9)
  ritual.waitUntilCupCoolsTo('cup1', 60)
  return ritual
}
