import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultCatalog } from '../../Shared/Content/DefaultCatalog.ts'
import { eventsOfType, TestRitual } from '../Support/TestRitual.ts'

const longestSecondsToBoilDry = 105

test('fullKettleOfTapWater_onTheWorkingPlate_boilsDryWithinOneMinuteFortyFive', () => {
  const ritual = TestRitual.begun(defaultCatalog, 'sencha', 'quietRoom')
  ritual.do({ type: 'standAt', placeId: 'counter' })
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.do({ type: 'openVesselLid', vesselId: 'kettle' })
  ritual.fillInTheSink('kettle', 20)
  ritual.do({ type: 'placeOnHeater', itemId: 'kettle' })
  ritual.do({ type: 'switchHeaterOn' })

  const events = ritual.wait(longestSecondsToBoilDry)

  assert.deepEqual(eventsOfType(events, 'boiledDry'), [{ type: 'boiledDry', vesselId: 'kettle', wasFullAndOnlyBoiledDown: true }])
})
