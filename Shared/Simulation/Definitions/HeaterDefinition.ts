export type ThermostatDefinition = {
  readonly lowestC: number
  readonly highestC: number
  readonly startsAtC: number
  readonly heatsAgainBelowTheTargetByC: number
}

export type HeaterDefinition = {
  readonly id: string
  readonly degreesPerSecondPerLitre: number
  readonly powerWatts: number
  readonly boilingAwayMlPerSecond: number
  readonly thermostat: ThermostatDefinition
}
