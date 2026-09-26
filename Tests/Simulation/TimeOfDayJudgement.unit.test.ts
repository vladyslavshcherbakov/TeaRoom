import assert from 'node:assert/strict'
import test from 'node:test'
import { hoursSinceSunriseOf } from '../../Shared/Simulation/Judgement/TimeOfDayJudgement.ts'

test('dawn_atTheEndsOfItsWindow_standsBetweenPointEightAndTwoPointTwoHoursAfterSunrise', () => {
  assert.equal(hoursSinceSunriseOf({ timeOfDay: 'dawn', shareThroughTheTimeOfDay: 0, weather: 'clear' }), 0.8)
  assert.equal(hoursSinceSunriseOf({ timeOfDay: 'dawn', shareThroughTheTimeOfDay: 1, weather: 'clear' }), 2.2)
})

test('day_atTheEndsOfItsWindow_standsBetweenThreeAndEightHoursAfterSunrise', () => {
  assert.equal(hoursSinceSunriseOf({ timeOfDay: 'day', shareThroughTheTimeOfDay: 0, weather: 'clear' }), 3)
  assert.equal(hoursSinceSunriseOf({ timeOfDay: 'day', shareThroughTheTimeOfDay: 1, weather: 'clear' }), 8)
})

test('sunset_atTheEndsOfItsWindow_standsBetweenTenAndElevenPointFourHoursAfterSunrise', () => {
  assert.equal(hoursSinceSunriseOf({ timeOfDay: 'sunset', shareThroughTheTimeOfDay: 0, weather: 'clear' }), 10)
  assert.equal(hoursSinceSunriseOf({ timeOfDay: 'sunset', shareThroughTheTimeOfDay: 1, weather: 'clear' }), 11.4)
})
