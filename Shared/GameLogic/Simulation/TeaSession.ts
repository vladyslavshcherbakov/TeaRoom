import type { Catalog } from '../Definitions/Catalog.ts'
import { problemsOpeningRoom } from '../Definitions/CatalogProblems.ts'
import type { DeepReadonly } from '../../Engine/DeepReadonly.ts'
import { fittedSavedState } from '../State/FittedSavedState.ts'
import { initialSessionState } from '../State/InitialState.ts'
import type { SessionState } from '../State/SessionState.ts'
import { teaCommandBook } from './CommandBook.ts'
import type { Command } from './Command.ts'
import { lidsClosedAgainstAPour } from './PouringCommands.ts'
import { teaStockIn } from './Reach.ts'
import { definitionIn } from '../../Engine/Catalog.ts'
import type { RefusalReason, TeaEvent } from './TeaEvent.ts'
import type { SessionLog } from '../../Engine/Log.ts'
import { Session, type GameRules } from '../../Engine/Session.ts'
import { levelOpening, type LevelOpening, type WhenALevelCannotOpen } from '../../Engine/Opening.ts'
import { startOrEndBrews } from './Brews.ts'
import { absenceStepSeconds, longestLivedAbsenceSeconds, whatTheAbsenceChanges } from './ReturnAfterAbsence.ts'
import { teaSchedule } from './Systems.ts'
import { teaReport } from './WorldReport.ts'

export type RoomOpening = LevelOpening<TeaSession>

export type WouldBeRefused = { readonly command: Command['type']; readonly reason: RefusalReason }

export type RoomResuming = RoomOpening | { readonly kind: 'savedStateDoesNotFit'; readonly problems: readonly string[] }

export class TeaSession {
  private readonly catalog: Catalog
  private readonly world: Session<SessionState, Catalog, TeaEvent, Command>

  static readonly worldStepSeconds = 0.05

  private constructor(catalog: Catalog, state: SessionState, log: SessionLog, how: string, isDevelopmentBuild: boolean) {
    this.catalog = catalog
    this.world = new Session(teaRules, catalog, state, log, isDevelopmentBuild)
    const vesselIds = Object.keys(state.vessels).join(', ')
    this.world.write('info', `session ${how} in ${state.roomId} with ${vesselIds}`)
  }

  get state(): DeepReadonly<SessionState> {
    return this.world.state
  }

  static open(catalog: Catalog, roomId: string, log: SessionLog, isDevelopmentBuild: boolean): RoomOpening {
    return levelOpening(problemsOpeningRoom(catalog, roomId), () => new TeaSession(catalog, initialSessionState(catalog, roomId), log, 'opened', isDevelopmentBuild), whenTheRoomCannotOpen(roomId, isDevelopmentBuild), log)
  }

  static resume(catalog: Catalog, savedState: unknown, savedVersion: number, log: SessionLog, isDevelopmentBuild: boolean): RoomResuming {
    const fitted = fittedSavedState(catalog, savedState, savedVersion)
    if (fitted.kind === 'doesNotFit') {
      for (const problem of fitted.problems) log.write({ level: 'info', message: `the saved state does not fit: ${problem}` })
      return { kind: 'savedStateDoesNotFit', problems: fitted.problems }
    }
    const roomId = fitted.state.roomId
    return levelOpening(problemsOpeningRoom(catalog, roomId), () => new TeaSession(catalog, fitted.state, log, 'resumed', isDevelopmentBuild), whenTheRoomCannotOpen(roomId, isDevelopmentBuild), log)
  }

  dispatch(command: Command): readonly TeaEvent[] {
    return this.world.dispatch(command)
  }

  wouldRefuse(commands: readonly Command[]): WouldBeRefused | null {
    const refusal = this.world.wouldRefuse(commands)
    return refusal === null ? null : { command: refusal.command, reason: refusal.reason }
  }

  lidsThatClosePour(sourceId: string, targetId: string | null): readonly string[] {
    return this.world.ask((draft) => lidsClosedAgainstAPour(draft, sourceId, targetId))
  }

  isACaddy(vesselId: string): boolean {
    return teaStockIn(this.catalog, this.world.state, vesselId) !== null
  }

  isForDrinking(vesselId: string): boolean {
    const vessel = this.world.state.vessels[vesselId]
    return vessel !== undefined && definitionIn(this.catalog, 'vessels', vessel.definitionId).isDrinkable
  }

  returnAfter(awaySeconds: number, shareThroughTheNextTimeOfDay: number): readonly TeaEvent[] {
    return this.world.returnAfter(awaySeconds, whatTheAbsenceChanges(shareThroughTheNextTimeOfDay))
  }

  advance(seconds: number): readonly TeaEvent[] {
    return this.world.advance(seconds)
  }
}

const teaRules: GameRules<SessionState, Catalog, TeaEvent, Command> = {
  commandBook: teaCommandBook,
  afterEachCommand: startOrEndBrews,
  schedule: teaSchedule,
  stepSeconds: TeaSession.worldStepSeconds,
  absenceStepSeconds,
  longestLivedAbsenceSeconds,
  clockOf: (state) => state.elapsedSeconds,
  report: teaReport,
}

function whenTheRoomCannotOpen(roomId: string, isDevelopmentBuild: boolean): WhenALevelCannotOpen {
  return { levelName: `room "${roomId}"`, whatShowsInstead: 'the quiet screen instead of the ritual', isDevelopmentBuild }
}
