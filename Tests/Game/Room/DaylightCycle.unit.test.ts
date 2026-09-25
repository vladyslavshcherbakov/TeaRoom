import assert from 'node:assert/strict'
import test from 'node:test'
import { daylightAt, hoursAfter } from '../../../Apps/Game/Room/Sky/DaylightCycle.ts'

test('sun_atSunrise_standsLowInTheEast', () => {
  const daylight = daylightAt(0)

  assert.ok(daylight.sunPosition.x > 7, `x ${daylight.sunPosition.x}`)
  assert.ok(daylight.sunPosition.y < 1, `y ${daylight.sunPosition.y}`)
  assert.equal(daylight.warmth, 1)
})

test('sun_atNoon_standsHighestAndWhitest', () => {
  const daylight = daylightAt(6)

  assert.ok(Math.abs(daylight.sunPosition.x) < 1e-9, `x ${daylight.sunPosition.x}`)
  assert.equal(daylight.sunPosition.y, 8)
  assert.equal(daylight.warmth, 0)
})

test('sun_atSunset_standsLowInTheWest', () => {
  const daylight = daylightAt(11.99)

  assert.ok(daylight.sunPosition.x < -7, `x ${daylight.sunPosition.x}`)
  assert.ok(daylight.warmth > 0.99, `warmth ${daylight.warmth}`)
})

test('daylightHour_passesInTwoRealMinutes', () => {
  assert.equal(hoursAfter(1, 120), 2)
})

test('daylight_afterSunset_beginsAgainAtSunrise', () => {
  assert.equal(hoursAfter(11.5, 120), 0.5)
})
