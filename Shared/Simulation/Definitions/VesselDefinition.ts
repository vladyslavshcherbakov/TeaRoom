export type LidDefinition = {
  readonly mustBeOpenToPour: boolean
  readonly mustBeOpenToFill: boolean
  readonly coolingMultiplierWhenOpen: number
}

export type VesselDefinition = {
  readonly id: string
  readonly capacityMl: number
  readonly maxPourMlPerSecond: number
  readonly coolingPerSecond: number
  readonly lid: LidDefinition | null
  readonly canSitOnHeater: boolean
  readonly hasAMetalShell: boolean
  readonly canHoldLeaves: boolean
  readonly isDrinkable: boolean
}
