export const temperatureUnits = ['celsius', 'fahrenheit'] as const

const roundingMarginC = 1e-9

export type TemperatureUnit = (typeof temperatureUnits)[number]

export type TargetRange = { readonly lowestC: number; readonly highestC: number }

export function degreesShownIn(unit: TemperatureUnit, celsius: number): number {
  return Math.round(unit === 'celsius' ? celsius : fahrenheitOf(celsius))
}

export function targetOneDegreeAway(targetC: number, step: 1 | -1, unit: TemperatureUnit, range: TargetRange): number | null {
  const nextShown = degreesShownIn(unit, targetC) + step
  const nextC = unit === 'celsius' ? nextShown : celsiusOf(nextShown)
  if (nextC < range.lowestC - roundingMarginC) return null
  if (nextC > range.highestC + roundingMarginC) return null
  return Math.min(range.highestC, Math.max(range.lowestC, nextC))
}

function fahrenheitOf(celsius: number): number {
  return (celsius * 9) / 5 + 32
}

function celsiusOf(fahrenheit: number): number {
  return ((fahrenheit - 32) * 5) / 9
}
