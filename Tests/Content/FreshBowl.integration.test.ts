import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultCatalog } from '../../Shared/Content/DefaultCatalog.ts'
import { TestTeaSession } from '../Support/TestTeaSession.ts'

const tooHotAboveC = 93

test('teaBowl_fourSecondsAfterItWasFilledFromTheBoilingKettle_isStillTooHotToSip', () => {
  const session = bowlJustFilledFromTheBoilingKettle()

  session.wait(4)

  assert.ok(session.vessel('bowl1').liquid.temperatureC > tooHotAboveC)
})

test('teaBowl_eightSecondsAfterItWasFilledFromTheBoilingKettle_canBeSipped', () => {
  const session = bowlJustFilledFromTheBoilingKettle()

  session.wait(8)

  assert.ok(session.vessel('bowl1').liquid.temperatureC <= tooHotAboveC)
})

function bowlJustFilledFromTheBoilingKettle(): TestTeaSession {
  const session = new TestTeaSession(defaultCatalog, 'quietRoom')
  session.doWithoutARefusal({ type: 'standAt', placeId: 'counter' })
  session.doWithoutARefusal({ type: 'pickUp', itemId: 'kettle' })
  session.doWithoutARefusal({ type: 'openVesselLid', vesselId: 'kettle' })
  session.fillInTheSink('kettle', 20)
  session.heatKettleTo(100)
  session.doWithoutARefusal({ type: 'standAt', placeId: 'shelf' })
  session.pour('kettle', 'bowl1', 6, 45)
  return session
}
