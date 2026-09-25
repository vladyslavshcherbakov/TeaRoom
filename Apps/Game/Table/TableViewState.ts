export type TableViewState = {
  readonly vessels: Readonly<Record<string, TableViewState.Vessel>>
  readonly isHeaterOn: boolean
  readonly caddy: TableViewState.Caddy
  readonly spoonFillShare: number
  readonly clothWetShare: number
  readonly clothTeaStain: number
  readonly clothCharring: number
  readonly clothHeating: TableViewState.ClothHeating
  readonly puddles: readonly TableViewState.Puddle[]
}

export declare namespace TableViewState {
  type SteamLevel = 'none' | 'wisps' | 'visible' | 'billowing'
  type SurfaceMotion = 'still' | 'shimmering' | 'simmering' | 'boiling'
  type ClothHeating = 'none' | 'steaming' | 'warming' | 'smoking' | 'scorching' | 'smouldering' | 'burning'
  type BrewStage = 'water' | 'pale' | 'good' | 'rich' | 'heavy' | 'overbrewed'

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
    readonly floatingLeaves: FloatingLeaves | null
  }

  type FloatingLeaves = {
    readonly teaId: string
    readonly count: number
  }

  type Caddy = {
    readonly isOpen: boolean
    readonly fillShare: number
  }
}
