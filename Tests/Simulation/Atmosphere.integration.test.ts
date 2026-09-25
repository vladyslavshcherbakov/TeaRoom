import assert from 'node:assert/strict'
import test from 'node:test'
import { TestRitual } from '../Support/TestRitual.ts'

test('atmosphere_whenOfferedByTheRoom_changesTimeAndWeather', () => {
  const ritual = new TestRitual()

  ritual.do({ type: 'chooseAtmosphere', timeOfDay: 'night', shareThroughTheTimeOfDay: 0.5, weather: 'rain' })

  assert.deepEqual(ritual.state.atmosphere, { timeOfDay: 'night', shareThroughTheTimeOfDay: 0.5, weather: 'rain' })
})

test('atmosphere_whenNotOfferedByTheRoom_isRefused', () => {
  const ritual = new TestRitual()

  const events = ritual.do({ type: 'chooseAtmosphere', timeOfDay: 'night', shareThroughTheTimeOfDay: 0.5, weather: 'snow' })

  assert.deepEqual(events, [{ type: 'actionRefused', command: 'chooseAtmosphere', reason: 'notAvailableInThisRoom' }])
  assert.deepEqual(ritual.state.atmosphere, { timeOfDay: 'sunset', shareThroughTheTimeOfDay: 0, weather: 'rain' })
})
