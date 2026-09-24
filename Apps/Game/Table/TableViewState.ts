export type TableViewState = {
  readonly vessels: Readonly<Record<string, TableViewState.Vessel>>
  readonly heater: TableViewState.Heater
  readonly caddy: TableViewState.Caddy
  readonly spoonFillShare: number
  readonly clothWetShare: number
  readonly puddleShare: number
  readonly godsPlaque: TableViewState.GodsPlaque
}

export declare namespace TableViewState {
  type SteamLevel = 'none' | 'wisps' | 'visible' | 'billowing'
  type BrewStage = 'water' | 'pale' | 'good' | 'rich' | 'heavy' | 'overbrewed'

  type Vessel = {
    readonly id: string
    readonly fillShare: number
    readonly liquorColour: string
    readonly steam: SteamLevel
    readonly brewStage: BrewStage
    readonly isLidOpen: boolean | null
    readonly leavesShare: number
  }

  type Heater = {
    readonly isOn: boolean
    readonly vesselIdOnTop: string | null
    readonly hum: 'silent' | 'quiet' | 'rising' | 'active' | 'rumbling'
  }

  type Caddy = {
    readonly isOpen: boolean
    readonly fillShare: number
  }

  type GodsPlaque = {
    readonly litMarks: number
    readonly totalMarks: number
  }
}
