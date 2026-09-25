import assert from 'node:assert/strict'
import test from 'node:test'
import { daylightAt, daylightFor } from '../../../Apps/Game/Room/Sky/DaylightCycle.ts'

test('sun_atSunrise_standsLowInTheEast', () => {
  const daylight = daylightAt(0)

  assert.ok(daylight.sunPosition.x > 7, `x ${daylight.sunPosition.x}`)
  assert.ok(daylight.sunPosition.y < 1, `y ${daylight.sunPosition.y}`)
  assert.equal(daylight.warmth, 1)
})

test('sun_atNoon_standsHighestAndLeastOrange', () => {
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

test('daylight_atDawn_comesLowFromTheEastAndWarm', () => {
  const daylight = daylightFor('dawn')

  assert.ok(daylight.sunPosition.x > 7, `x ${daylight.sunPosition.x}`)
  assert.ok(daylight.warmth > 0.7, `warmth ${daylight.warmth}`)
})

test('daylight_byDay_comesFromHighAboveAndAlmostWhite', () => {
  const daylight = daylightFor('day')

  assert.ok(daylight.sunPosition.y > 7.5, `y ${daylight.sunPosition.y}`)
  assert.ok(daylight.warmth < 0.05, `warmth ${daylight.warmth}`)
})

test('daylight_atSunset_comesLowFromTheWestAndWarm', () => {
  const daylight = daylightFor('sunset')

  assert.ok(daylight.sunPosition.x < -7, `x ${daylight.sunPosition.x}`)
  assert.ok(daylight.warmth > 0.7, `warmth ${daylight.warmth}`)
})
