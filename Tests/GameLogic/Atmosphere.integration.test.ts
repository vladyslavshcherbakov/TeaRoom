import assert from 'node:assert/strict'
import test from 'node:test'
import { TestTeaSession } from '../Support/TestTeaSession.ts'

test('atmosphere_whenOfferedByTheRoom_changesTimeAndWeather', () => {
  const session = new TestTeaSession()

  session.do({ type: 'chooseAtmosphere', timeOfDay: 'night', shareThroughTheTimeOfDay: 0.5, weather: 'rain' })

  assert.deepEqual(session.state.atmosphere, { timeOfDay: 'night', shareThroughTheTimeOfDay: 0.5, weather: 'rain' })
})

test('atmosphere_whenNotOfferedByTheRoom_isRefused', () => {
  const session = new TestTeaSession()

  const events = session.do({ type: 'chooseAtmosphere', timeOfDay: 'night', shareThroughTheTimeOfDay: 0.5, weather: 'snow' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'chooseAtmosphere', reason: 'notAvailableInThisRoom' }])
  assert.deepEqual(session.state.atmosphere, { timeOfDay: 'sunset', shareThroughTheTimeOfDay: 0, weather: 'rain' })
})
