import assert from 'node:assert/strict'
import test from 'node:test'
import { degreesShownIn, targetOneDegreeAway } from '../../../Apps/Game/Room/Temperatures.ts'

const range = { lowestC: 40, highestC: 100 }

test('degrees_ofBoilingWaterInFahrenheit_areTwoHundredAndTwelve', () => {
  assert.equal(degreesShownIn('fahrenheit', 100), 212)
})

test('degrees_ofWaterAtEightySevenAndAHalfCelsius_roundToEightyEight', () => {
  assert.equal(degreesShownIn('celsius', 87.5), 88)
})

test('target_oneDegreeDownFromAHundredCelsius_isNinetyNineCelsius', () => {
  assert.equal(targetOneDegreeAway(100, -1, 'celsius', range), 99)
})

test('target_oneDegreeDownFromAHundredCelsiusInFahrenheit_isTwoHundredAndElevenFahrenheit', () => {
  const targetC = targetOneDegreeAway(100, -1, 'fahrenheit', range) ?? 0

  assert.equal(degreesShownIn('fahrenheit', targetC), 211)
})

test('target_oneDegreeUpFromTheHighest_isNone', () => {
  assert.equal(targetOneDegreeAway(100, 1, 'celsius', range), null)
})

test('target_oneDegreeDownFromTheLowestInFahrenheit_isNone', () => {
  assert.equal(targetOneDegreeAway(40, -1, 'fahrenheit', range), null)
})

test('target_setInFahrenheitAndSteppedInCelsius_movesFromTheShownWholeDegree', () => {
  const targetC = targetOneDegreeAway(100, -1, 'fahrenheit', range) ?? 0

  assert.equal(targetOneDegreeAway(targetC, -1, 'celsius', range), 98)
})
