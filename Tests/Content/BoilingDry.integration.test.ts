import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultCatalog } from '../../Shared/Content/DefaultCatalog.ts'
import { eventsOfType, TestTeaSession } from '../Support/TestTeaSession.ts'

const longestSecondsToBoilDry = 105

test('fullKettleOfTapWater_onTheWorkingPlate_boilsDryWithinOneMinuteFortyFive', () => {
  const session = new TestTeaSession(defaultCatalog, 'quietRoom')
  session.do({ type: 'standAt', placeId: 'counter' })
  session.do({ type: 'pickUp', itemId: 'kettle' })
  session.do({ type: 'openVesselLid', vesselId: 'kettle' })
  session.fillInTheSink('kettle', 20)
  session.do({ type: 'placeOnHeater', itemId: 'kettle' })
  session.do({ type: 'switchHeaterOn' })

  const events = session.wait(longestSecondsToBoilDry)

  assert.deepEqual(eventsOfType(events, 'boiledDry'), [{ type: 'boiledDry', vesselId: 'kettle', wasFullAndOnlyBoiledDown: true }])
})
