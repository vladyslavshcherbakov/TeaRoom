import assert from 'node:assert/strict'
import test from 'node:test'
import { testCatalog } from '../Support/TestCatalog.ts'
import { eventsOfType, TestTeaSession } from '../Support/TestTeaSession.ts'

test('clumsyRitual_overheatedThenWaitedThenOversteeped_isTastedWithAGrimace', () => {
  const session = clumsySession()

  const events = session.do({ type: 'tasteCup', cupId: 'cup1' })

  assert.ok(['grimace', 'strongGrimace'].includes(eventsOfType(events, 'teaTasted')[0]?.verdict.reaction ?? 'none'), JSON.stringify(events))
})

function clumsySession(): TestTeaSession {
  const session = new TestTeaSession(testCatalog({ kettle: 0.003, thermos: 0.0004, cup: 0.02 }))
  session.heatKettleTo(100)
  session.do({ type: 'openVesselLid', vesselId: 'thermos' })
  session.pour('kettle', 'thermos', 50)
  session.do({ type: 'closeVesselLid', vesselId: 'thermos' })
  session.wait(600)
  session.addLeavesToKettle(3)
  session.do({ type: 'openVesselLid', vesselId: 'thermos' })
  session.do({ type: 'openVesselLid', vesselId: 'kettle' })
  session.pour('thermos', 'kettle', 30)
  session.do({ type: 'closeVesselLid', vesselId: 'kettle' })
  session.wait(300)
  session.pour('kettle', 'cup1', 9)
  session.pour('kettle', 'cup2', 9)
  session.waitUntilCupCoolsTo('cup1', 60)
  return session
}
