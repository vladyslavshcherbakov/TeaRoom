export type LidDefinition = {
  readonly mustBeOpenToPour: boolean
  readonly mustBeOpenToFill: boolean
  readonly coolingMultiplierWhenOpen: number
  readonly heatingMultiplierWhenOpen: number
}

export type VesselDefinition = {
  readonly id: string
  readonly capacityMl: number
  readonly maxPourMlPerSecond: number
  readonly takesAStreamOfUpToMlPerSecond: number
  readonly coolingPerSecond: number
  readonly lid: LidDefinition | null
  readonly canSitOnHeater: boolean
  readonly isMadeForTheHeater: boolean
  readonly hasAMetalShell: boolean
  readonly canHoldLeaves: boolean
  readonly isDrinkable: boolean
}
