export type TableViewState = {
  readonly vessels: Readonly<Record<string, TableViewState.Vessel>>
  readonly isHeaterOn: boolean
  readonly caddy: TableViewState.Caddy
  readonly spoonFillShare: number
  readonly cloths: Readonly<Record<string, TableViewState.Cloth>>
  readonly charringByItem: Readonly<Record<string, TableViewState.Charring>>
  readonly puddles: readonly TableViewState.Puddle[]
}

export declare namespace TableViewState {
  type SteamLevel = 'none' | 'wisps' | 'visible' | 'billowing'
  type SurfaceMotion = 'still' | 'shimmering' | 'simmering' | 'boiling'
  type Heating = 'none' | 'steaming' | 'warming' | 'smoking' | 'scorching' | 'smouldering' | 'burning'
  type BrewStage = 'water' | 'pale' | 'good' | 'rich' | 'heavy' | 'overbrewed' | 'tar'

  type Charring = {
    readonly charring: number
    readonly heating: Heating
  }

  type Cloth = {
    readonly wetShare: number
    readonly teaStain: number
  }

  type Puddle = {
    readonly placeId: string
    readonly spilledAround: { readonly x: number; readonly y: number; readonly z: number } | null
    readonly share: number
  }

  type Vessel = {
    readonly id: string
    readonly fillShare: number
    readonly liquorColour: string
    readonly liquorOpacity: number
    readonly steam: SteamLevel
    readonly surfaceMotion: SurfaceMotion
    readonly brewStage: BrewStage
    readonly isLidOpen: boolean | null
    readonly soakedLeaves: SoakedLeaves | null
    readonly shellGlow: number
  }

  type SoakedLeaves = {
    readonly teaId: string
    readonly count: number
  }

  type Caddy = {
    readonly isOpen: boolean
    readonly fillShare: number
  }
}
