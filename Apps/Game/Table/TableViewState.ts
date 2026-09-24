export type TableViewState = {
  readonly vessels: Readonly<Record<string, TableViewState.Vessel>>
  readonly isHeaterOn: boolean
  readonly caddy: TableViewState.Caddy
  readonly spoonFillShare: number
  readonly clothWetShare: number
  readonly puddleShare: number
}

export declare namespace TableViewState {
  type SteamLevel = 'none' | 'wisps' | 'visible' | 'billowing'
  type SurfaceMotion = 'still' | 'shimmering' | 'simmering' | 'boiling'
  type BrewStage = 'water' | 'pale' | 'good' | 'rich' | 'heavy' | 'overbrewed'

  type Vessel = {
    readonly id: string
    readonly fillShare: number
    readonly liquorColour: string
    readonly steam: SteamLevel
    readonly surfaceMotion: SurfaceMotion
    readonly brewStage: BrewStage
    readonly isLidOpen: boolean | null
  }

  type Caddy = {
    readonly isOpen: boolean
    readonly fillShare: number
  }
}
