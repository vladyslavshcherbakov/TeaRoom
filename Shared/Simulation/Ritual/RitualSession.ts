import type { Catalog } from '../Definitions/Catalog.ts'
import { problemsOpeningRoom } from '../Definitions/CatalogProblems.ts'
import type { DeepReadonly } from '../State/DeepReadonly.ts'
import { fittedSavedState } from '../State/FittedSavedState.ts'
import { initialSessionState } from '../State/InitialState.ts'
import type { SessionState } from '../State/SessionState.ts'
import { applyCommand } from './ApplyCommand.ts'
import type { Command } from './Command.ts'
import { startDraft, type Draft, type Outcome } from './Draft.ts'
import type { RitualEvent } from './RitualEvent.ts'
import type { LogLevel, RitualLog } from './RitualLog.ts'
import { returnAfterAbsence } from './ReturnAfterAbsence.ts'
import { stepTheWorld } from './SimulationStep.ts'
import { isTimeToReportTheWorld, reportTheWorld } from './WorldReport.ts'

export type RoomOpening =
  | { readonly kind: 'opened'; readonly session: RitualSession }
  | { readonly kind: 'unavailable'; readonly problems: readonly string[] }

export type RoomResuming = RoomOpening | { readonly kind: 'savedStateDoesNotFit'; readonly problems: readonly string[] }

export class BrokenContentError extends Error {
  constructor(roomId: string, problems: readonly string[]) {
    super(`room "${roomId}" cannot open:\n${problems.join('\n')}`)
    this.name = 'BrokenContentError'
  }
}

export class RitualSession {
  private static readonly roundingToleranceSeconds = 1e-9

  private readonly catalog: Catalog
  private readonly log: RitualLog
  private currentState: SessionState
  private secondsNotYetSimulated = 0

  static readonly simulationStepSeconds = 0.05

  private constructor(catalog: Catalog, state: SessionState, log: RitualLog, how: string) {
    this.catalog = catalog
    this.log = log
    this.currentState = state
    const vesselIds = Object.keys(this.currentState.vessels).join(', ')
    this.write('info', `session ${how} in ${state.roomId} with ${vesselIds}`)
  }

  static open(catalog: Catalog, roomId: string, log: RitualLog, isDevelopmentBuild: boolean): RoomOpening {
    const problems = problemsOpeningRoom(catalog, roomId)
    if (problems.length === 0) return { kind: 'opened', session: new RitualSession(catalog, initialSessionState(catalog, roomId), log, 'opened') }
    return RitualSession.unavailable(roomId, problems, log, isDevelopmentBuild)
  }

  static resume(catalog: Catalog, savedState: unknown, savedVersion: number, log: RitualLog, isDevelopmentBuild: boolean): RoomResuming {
    const fitted = fittedSavedState(catalog, savedState, savedVersion)
    if (fitted.kind === 'doesNotFit') {
      for (const problem of fitted.problems) log.write({ level: 'info', message: `the saved state does not fit: ${problem}` })
      return { kind: 'savedStateDoesNotFit', problems: fitted.problems }
    }
    const problems = problemsOpeningRoom(catalog, fitted.state.roomId)
    if (problems.length > 0) return RitualSession.unavailable(fitted.state.roomId, problems, log, isDevelopmentBuild)
    for (const change of fitted.changes) log.write({ level: 'info', message: `the saved state is fitted to the room: ${change}` })
    return { kind: 'opened', session: new RitualSession(catalog, fitted.state, log, 'resumed') }
  }

  private static unavailable(roomId: string, problems: readonly string[], log: RitualLog, isDevelopmentBuild: boolean): RoomOpening {
    if (isDevelopmentBuild) throw new BrokenContentError(roomId, problems)
    for (const problem of problems) log.write({ level: 'error', message: `content problem: ${problem}` })
    log.write({ level: 'error', message: `room "${roomId}" is unavailable, showing the quiet screen instead of the ritual` })
    return { kind: 'unavailable', problems }
  }

  get state(): DeepReadonly<SessionState> {
    return this.currentState
  }

  dispatch(command: Command): readonly RitualEvent[] {
    return this.accept(applyCommand(this.currentState, command, this.catalog))
  }

  returnAfter(awaySeconds: number, shareThroughTheNextTimeOfDay: number): readonly RitualEvent[] {
    this.secondsNotYetSimulated = 0
    return this.accept(returnAfterAbsence(this.currentState, awaySeconds, shareThroughTheNextTimeOfDay, this.catalog))
  }

  advance(seconds: number): readonly RitualEvent[] {
    this.secondsNotYetSimulated += seconds
    if (!this.hasAStepToSimulate()) return []
    const draft = startDraft(this.currentState, this.catalog)
    while (this.hasAStepToSimulate()) {
      const secondsBefore = draft.state.elapsedSeconds
      stepTheWorld(draft, RitualSession.simulationStepSeconds)
      this.writeTheLinesOf(draft)
      if (isTimeToReportTheWorld(secondsBefore, draft.state.elapsedSeconds)) reportTheWorld(draft, 'the room')
      this.writeTheLinesOf(draft)
      this.secondsNotYetSimulated -= RitualSession.simulationStepSeconds
    }
    this.currentState = draft.state
    return draft.events
  }

  private hasAStepToSimulate(): boolean {
    return this.secondsNotYetSimulated >= RitualSession.simulationStepSeconds - RitualSession.roundingToleranceSeconds
  }

  private writeTheLinesOf(draft: Draft): void {
    for (const line of draft.logLines.splice(0)) this.writeAt(draft.state.elapsedSeconds, line.level, line.message)
  }

  private accept(outcome: Outcome): readonly RitualEvent[] {
    this.currentState = outcome.state
    for (const line of outcome.logLines) this.write(line.level, line.message)
    return outcome.events
  }

  private write(level: LogLevel, message: string): void {
    this.writeAt(this.currentState.elapsedSeconds, level, message)
  }

  private writeAt(elapsedSeconds: number, level: LogLevel, message: string): void {
    this.log.write({ level, message: `t=${elapsedSeconds.toFixed(3)}s ${message}` })
  }
}
