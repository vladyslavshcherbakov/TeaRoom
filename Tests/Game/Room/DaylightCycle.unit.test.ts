import assert from 'node:assert/strict'
import test from 'node:test'
import { daylightAt, hoursSinceSunriseFor } from '../../../Apps/Game/Room/Sky/DaylightCycle.ts'

test('sun_atSunrise_standsLowInTheEastBehindTheWindow', () => {
  const daylight = daylightAt(0)

  assert.ok(daylight.sunPosition.x > 6, `x ${daylight.sunPosition.x}`)
  assert.ok(daylight.sunPosition.z < -4, `z ${daylight.sunPosition.z}`)
  assert.ok(daylight.sunPosition.y < 1, `y ${daylight.sunPosition.y}`)
  assert.equal(daylight.warmth, 1)
})

test('sun_atNoon_standsHighestBehindTheWindowAndLeastOrange', () => {
  const daylight = daylightAt(6)

  assert.ok(Math.abs(daylight.sunPosition.x) < 1e-9, `x ${daylight.sunPosition.x}`)
  assert.equal(daylight.sunPosition.z, -8)
  assert.equal(daylight.sunPosition.y, 8)
  assert.equal(daylight.warmth, 0)
})

test('sun_atSunset_standsLowOnTheOpenSideOfTheHouse', () => {
  const daylight = daylightAt(11.99)

  assert.ok(daylight.sunPosition.z > 7, `z ${daylight.sunPosition.z}`)
  assert.ok(daylight.sunPosition.x < 0, `x ${daylight.sunPosition.x}`)
  assert.ok(daylight.warmth > 0.99, `warmth ${daylight.warmth}`)
})

test('dawn_atTheEndsOfItsWindow_standsBetweenPointEightAndTwoPointTwoHoursAfterSunrise', () => {
  assert.equal(hoursSinceSunriseFor('dawn', 0), 0.8)
  assert.equal(hoursSinceSunriseFor('dawn', 1), 2.2)
})

test('day_inTheMiddleOfItsWindow_comesFromHighAboveAndAlmostWhite', () => {
  const daylight = daylightAt(hoursSinceSunriseFor('day', 0.5))

  assert.ok(daylight.sunPosition.y > 7.5, `y ${daylight.sunPosition.y}`)
  assert.ok(daylight.warmth < 0.05, `warmth ${daylight.warmth}`)
})

test('sunset_atEitherEndOfItsWindow_comesWarmFromTheOpenSide', () => {
  for (const share of [0, 1]) {
    const daylight = daylightAt(hoursSinceSunriseFor('sunset', share))

    assert.ok(daylight.sunPosition.z > 7, `z ${daylight.sunPosition.z} at ${share}`)
    assert.ok(daylight.warmth > 0.45, `warmth ${daylight.warmth} at ${share}`)
  }
})
