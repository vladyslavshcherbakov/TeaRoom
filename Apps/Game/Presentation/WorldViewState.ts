export type WorldViewState = {
  readonly vessels: Readonly<Record<string, VesselView>>
  readonly isHeaterOn: boolean
  readonly thermostat: ThermostatView
  readonly looseLeavesByItem: Readonly<Record<string, LooseLeavesView>>
  readonly cloths: Readonly<Record<string, ClothView>>
  readonly charringByItem: Readonly<Record<string, CharringView>>
  readonly puddles: readonly PuddleView[]
  readonly pourStream: PourStreamView | null
  readonly tapStream: TapStreamView | null
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
  readonly charredShare: number
  readonly heating: Heating
}

export type PourStreamView = {
  readonly sourceId: string
  readonly targetId: string | null
  readonly colour: string
  readonly onTargetShare: number
  readonly landing: PourLanding
  readonly warmth: number
  readonly isOverflowingItsTarget: boolean
}

export type PourLanding = { readonly kind: 'onTheTarget' } | { readonly kind: 'atAHeight'; readonly heightMetres: number } | { readonly kind: 'onTheFloor' }

export type TapStreamView = {
  readonly itemIdUnderIt: string | null
  readonly landing: TapLanding
  readonly isOverflowingTheItem: boolean
}

export type TapLanding = 'onTheLid' | 'intoTheItem' | 'onTheSinkFloor'

export type ClothView = {
  readonly wetShare: number
  readonly teaStain: number
}

export type PuddleView = {
  readonly puddleId: string
  readonly placeId: string
  readonly centre: { readonly x: number; readonly y: number; readonly z: number }
  readonly radiusMetres: number
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
  readonly leavesSeepShare: number
  readonly shellGlow: number
  readonly waterTemperatureC: number | null
  readonly isWhistling: boolean
}

export type SoakedLeavesView = {
  readonly teaId: string
  readonly count: number
}

export type LooseLeavesView = {
  readonly teaId: string | null
  readonly fillShare: number
}
