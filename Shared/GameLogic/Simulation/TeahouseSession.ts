import type { SessionLog } from '../../Engine/Log.ts'
import { levelOpening, type LevelOpening, type WhenALevelCannotOpen } from '../../Engine/Opening.ts'
import { Session, type GameRules } from '../../Engine/Session.ts'
import type { TeahouseCatalog } from '../Definitions/TeahouseCatalog.ts'
import { newTeahouse } from '../State/NewTeahouse.ts'
import type { TeahouseState } from '../State/TeahouseState.ts'
import { catalogProblems } from './CatalogProblems.ts'
import { teahouseCommandBook } from './CommandBook.ts'
import { teahouseSchedule } from './Systems.ts'
import type { TeahouseCommand } from './TeahouseCommands.ts'
import type { TeahouseEvent } from './TeahouseEvents.ts'

export type TeahouseSession = Session<TeahouseState, TeahouseCatalog, TeahouseEvent, TeahouseCommand>

const stepsEachSecond = 30
const secondsBetweenReports = 60
const noTimeIsLivedWhileAway = 0

const teahouseRules: GameRules<TeahouseState, TeahouseCatalog, TeahouseEvent, TeahouseCommand> = {
  commandBook: teahouseCommandBook,
  afterEachCommand: () => {},
  schedule: teahouseSchedule,
  stepSeconds: 1 / stepsEachSecond,
  absenceStepSeconds: 1,
  longestLivedAbsenceSeconds: noTimeIsLivedWhileAway,
  clockOf: (state) => state.seconds,
  report: {
    everySeconds: secondsBetweenReports,
    secondsAhead: 0,
    heading: 'teahouse',
    headingAfterAbsence: 'teahouse after an absence',
    stillLine: 'nothing changes by itself',
    reporters: [(draft) => [`day ${draft.state.day}, visit ${draft.state.visitId}, phase ${draft.state.phase.kind}`]],
  },
}

export function openNewTeahouse(catalog: TeahouseCatalog, textProblems: readonly string[], whenItCannot: WhenALevelCannotOpen, log: SessionLog): LevelOpening<TeahouseSession> {
  return levelOpening([...catalogProblems(catalog), ...textProblems], () => new Session(teahouseRules, catalog, newTeahouse(catalog), log, whenItCannot.isDevelopmentBuild), whenItCannot, log)
}
