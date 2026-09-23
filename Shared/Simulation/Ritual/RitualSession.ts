import type { Catalog } from '../Definitions/Catalog.ts'
import type { DeepReadonly } from '../State/DeepReadonly.ts'
import { initialSessionState } from '../State/InitialState.ts'
import type { SessionState } from '../State/SessionState.ts'
import { applyCommand } from './ApplyCommand.ts'
import type { Command } from './Command.ts'
import type { RitualEvent } from './RitualEvent.ts'
import { simulateStep } from './SimulationStep.ts'

export class RitualSession {
  private static readonly roundingToleranceSeconds = 1e-9

  private readonly catalog: Catalog
  private currentState: SessionState
  private secondsNotYetSimulated = 0

  static readonly simulationStepSeconds = 0.05

  constructor(catalog: Catalog, roomId: string) {
    this.catalog = catalog
    this.currentState = initialSessionState(catalog, roomId)
  }

  get state(): DeepReadonly<SessionState> {
    return this.currentState
  }

  dispatch(command: Command): readonly RitualEvent[] {
    const outcome = applyCommand(this.currentState, command, this.catalog)
    this.currentState = outcome.state
    return outcome.events
  }

  advance(seconds: number): readonly RitualEvent[] {
    const events: RitualEvent[] = []
    this.secondsNotYetSimulated += seconds
    while (this.secondsNotYetSimulated >= RitualSession.simulationStepSeconds - RitualSession.roundingToleranceSeconds) {
      const outcome = simulateStep(this.currentState, RitualSession.simulationStepSeconds, this.catalog)
      this.currentState = outcome.state
      events.push(...outcome.events)
      this.secondsNotYetSimulated -= RitualSession.simulationStepSeconds
    }
    return events
  }
}
