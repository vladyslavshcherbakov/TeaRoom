import type { Command, DeepReadonly, TeaEvent, SessionState, WouldBeRefused } from '../../../Shared/GameLogic/GameLogic.ts'

export type SessionPort = {
  readonly state: DeepReadonly<SessionState>
  dispatch(command: Command): readonly TeaEvent[]
  wouldRefuse(commands: readonly Command[]): WouldBeRefused | null
  lidsThatClosePour(sourceId: string, targetId: string | null): readonly string[]
  isACaddy(vesselId: string): boolean
}
