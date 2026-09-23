import type { Catalog } from '../Definitions/Catalog.ts'
import type { DeepReadonly } from '../State/DeepReadonly.ts'
import { initialSessionState } from '../State/InitialState.ts'
import type { SessionState } from '../State/SessionState.ts'
import { applyCommand } from './ApplyCommand.ts'
import type { Command } from './Command.ts'
import type { Outcome } from './Draft.ts'
import type { RitualEvent } from './RitualEvent.ts'
import type { LogLevel, RitualLog } from './RitualLog.ts'
import { simulateStep } from './SimulationStep.ts'

export class RitualSession {
  private static readonly roundingToleranceSeconds = 1e-9

  private readonly catalog: Catalog
  private readonly log: RitualLog
  private currentState: SessionState
  private secondsNotYetSimulated = 0

  static readonly simulationStepSeconds = 0.05

  constructor(catalog: Catalog, roomId: string, log: RitualLog) {
    this.catalog = catalog
    this.log = log
    this.currentState = initialSessionState(catalog, roomId)
    const vesselIds = Object.keys(this.currentState.vessels).join(', ')
    this.write('info', `session opened in ${roomId} with ${vesselIds}, gods at ${this.currentState.godsSatisfaction}`)
  }

  get state(): DeepReadonly<SessionState> {
    return this.currentState
  }

  dispatch(command: Command): readonly RitualEvent[] {
    return this.accept(applyCommand(this.currentState, command, this.catalog))
  }

  advance(seconds: number): readonly RitualEvent[] {
    const events: RitualEvent[] = []
    this.secondsNotYetSimulated += seconds
    while (this.secondsNotYetSimulated >= RitualSession.simulationStepSeconds - RitualSession.roundingToleranceSeconds) {
      events.push(...this.accept(simulateStep(this.currentState, RitualSession.simulationStepSeconds, this.catalog)))
      this.secondsNotYetSimulated -= RitualSession.simulationStepSeconds
    }
    return events
  }

  private accept(outcome: Outcome): readonly RitualEvent[] {
    this.currentState = outcome.state
    for (const line of outcome.logLines) this.write(line.level, line.message)
    return outcome.events
  }

  private write(level: LogLevel, message: string): void {
    this.log.write({ level, message: `t=${this.currentState.elapsedSeconds.toFixed(3)}s ${message}` })
  }
}
