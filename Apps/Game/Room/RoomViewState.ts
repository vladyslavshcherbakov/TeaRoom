export type RoomViewState = {
  readonly vessels: Readonly<Record<string, RoomViewState.Vessel>>
  readonly heater: RoomViewState.Heater
  readonly caddy: RoomViewState.Caddy
  readonly spoonFillShare: number
  readonly puddleShare: number
  readonly godsPlaque: RoomViewState.GodsPlaque
}

export declare namespace RoomViewState {
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
