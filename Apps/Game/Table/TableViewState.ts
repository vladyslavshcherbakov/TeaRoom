export type TableViewState = {
  readonly vessels: Readonly<Record<string, VesselView>>
  readonly isHeaterOn: boolean
  readonly thermostat: ThermostatView
  readonly caddy: CaddyView
  readonly spoonFillShare: number
  readonly cloths: Readonly<Record<string, ClothView>>
  readonly charringByItem: Readonly<Record<string, CharringView>>
  readonly puddles: readonly PuddleView[]
}

export type SteamLevel = 'none' | 'wisps' | 'visible' | 'billowing'

export type SurfaceMotion = 'still' | 'shimmering' | 'simmering' | 'boiling'

export type Heating = 'none' | 'steaming' | 'warming' | 'smoking' | 'scorching' | 'smouldering' | 'burning'

export type BrewStage = 'water' | 'pale' | 'good' | 'rich' | 'heavy' | 'overbrewed' | 'tar'

export type ThermostatView = {
  readonly targetC: number
  readonly isOn: boolean
}

export type CharringView = {
  readonly charring: number
  readonly heating: Heating
}

export type ClothView = {
  readonly wetShare: number
  readonly teaStain: number
}

export type PuddleView = {
  readonly placeId: string
  readonly spilledAround: { readonly x: number; readonly y: number; readonly z: number } | null
  readonly share: number
}

export type VesselView = {
  readonly id: string
  readonly fillShare: number
  readonly liquorColour: string
  readonly liquorOpacity: number
  readonly steam: SteamLevel
  readonly surfaceMotion: SurfaceMotion
  readonly brewStage: BrewStage
  readonly isLidOpen: boolean | null
  readonly soakedLeaves: SoakedLeavesView | null
  readonly shellGlow: number
  readonly waterTemperatureC: number | null
}

export type SoakedLeavesView = {
  readonly teaId: string
  readonly count: number
}

export type CaddyView = {
  readonly isOpen: boolean
  readonly fillShare: number
}
