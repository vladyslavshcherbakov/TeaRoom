export type TemperatureRange = {
  readonly lowestC: number
  readonly highestC: number
}

export type StrengthRange = {
  readonly lowest: number
  readonly highest: number
}

export type TeaDefinition = {
  readonly id: string
  readonly water: {
    readonly idealC: number
    readonly good: TemperatureRange
    readonly acceptable: TemperatureRange
  }
  readonly steeping: {
    readonly idealSeconds: number
    readonly idealGramsPer100Ml: number
  }
  readonly extraction: {
    readonly strengthRatePerSecond: number
    readonly bitternessPerSecond: number
    readonly bitternessMultiplierAfterIdealTime: number
    readonly bitternessGainPerDegreeAboveGood: number
  }
  readonly balancedStrength: StrengthRange
}
