import assert from 'node:assert/strict'
import test from 'node:test'
import { hoursSinceSunriseOf } from '../../Shared/Simulation/Judgement/TimeOfDayJudgement.ts'

test('dawn_atTheEndsOfItsWindow_standsBetweenPointEightAndTwoPointTwoHoursAfterSunrise', () => {
  assert.equal(hoursSinceSunriseOf({ timeOfDay: 'dawn', shareThroughTheTimeOfDay: 0, weather: 'clear' }), 0.8)
  assert.equal(hoursSinceSunriseOf({ timeOfDay: 'dawn', shareThroughTheTimeOfDay: 1, weather: 'clear' }), 2.2)
})
