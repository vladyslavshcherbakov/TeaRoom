import { carryOutCommand, type Command, type CommandBook } from './Commands.ts'
import type { DeepReadonly } from './DeepReadonly.ts'
import type { Draft } from './Draft.ts'
import type { LogLevel, SessionLog } from './Log.ts'
import { numbersThatAreNotFinite } from './FiniteNumbers.ts'
import { reportTheWorld, type WorldReport } from './Report.ts'

type Refusal = { readonly type: 'actionRefused' }

export type System<SomeDraft> = (draft: SomeDraft, seconds: number) => void

export type Schedule<SomeDraft> = readonly System<SomeDraft>[]

export type LivedAbsence = {
  readonly awaySeconds: number
  readonly livedSteps: number
  readonly stepSeconds: number
  readonly longestLivedSeconds: number
  readonly eventTypesWhileAway: readonly string[]
}

export type AbsenceChanges<SomeDraft> = {
  readonly beforeLiving: (draft: SomeDraft) => void
  readonly afterLiving: (draft: SomeDraft, absence: LivedAbsence) => void
}

export type GameRules<State, Catalog, Event extends { readonly type: string }, SomeCommand extends Command> = {
  readonly commandBook: CommandBook<Draft<State, Catalog, Event>, SomeCommand>
  readonly afterEachCommand: (draft: Draft<State, Catalog, Event>) => void
  readonly schedule: Schedule<Draft<State, Catalog, Event>>
  readonly stepSeconds: number
  readonly absenceStepSeconds: number
  readonly longestLivedAbsenceSeconds: number
  readonly clockOf: (state: State) => number
  readonly report: WorldReport<State, Catalog, Event>
}

export class Session<State, Catalog, Event extends { readonly type: string }, SomeCommand extends Command> {
  private static readonly roundingToleranceSeconds = 1e-9

  private readonly rules: GameRules<State, Catalog, Event, SomeCommand>
  private readonly catalog: Catalog
  private readonly log: SessionLog
  private readonly world: State
  private readonly checksTheWorldsNumbers: boolean
  private readonly numbersReportedAsNotFinite = new Set<string>()
  private secondsNotYetStepped = 0

  constructor(rules: GameRules<State, Catalog, Event, SomeCommand>, catalog: Catalog, world: State, log: SessionLog, checksTheWorldsNumbers: boolean) {
    this.rules = rules
    this.catalog = catalog
    this.log = log
    this.world = world
    this.checksTheWorldsNumbers = checksTheWorldsNumbers
  }

  get state(): DeepReadonly<State> {
    return this.world as DeepReadonly<State>
  }

  write(level: LogLevel, message: string): void {
    this.log.write({ level, message: `t=${this.rules.clockOf(this.world).toFixed(3)}s ${message}` })
  }

  dispatch(command: SomeCommand): readonly Event[] {
    const draft = this.draftOverTheWorld()
    carryOutCommand(draft, command, this.rules.commandBook)
    this.rules.afterEachCommand(draft)
    this.writeTheLinesOf(draft)
    this.reportNumbersThatAreNotFinite(`the command ${command.type}`)
    return draft.events
  }

  wouldRefuse(commands: readonly SomeCommand[]): Extract<Event, Refusal> | null {
    const draft: Draft<State, Catalog, Event> = { state: structuredClone(this.world), catalog: this.catalog, events: [], logLines: [] }
    for (const command of commands) {
      carryOutCommand(draft, command, this.rules.commandBook)
      this.rules.afterEachCommand(draft)
      const refusal = draft.events.find((event): event is Extract<Event, Refusal> => event.type === 'actionRefused')
      if (refusal !== undefined) return refusal
    }
    return null
  }

  ask<Answer>(question: (draft: Draft<State, Catalog, Event>) => Answer): Answer {
    return question(this.draftOverTheWorld())
  }

  advance(seconds: number): readonly Event[] {
    this.secondsNotYetStepped += seconds
    const draft = this.draftOverTheWorld()
    while (this.hasAStepToTake()) {
      const secondsBefore = this.rules.clockOf(this.world)
      runTheSchedule(this.rules.schedule, draft, this.rules.stepSeconds)
      this.writeTheLinesOf(draft)
      if (this.isTimeToReportTheWorld(secondsBefore)) this.report(draft, this.rules.report.heading)
      this.writeTheLinesOf(draft)
      this.reportNumbersThatAreNotFinite('a step of the world')
      this.secondsNotYetStepped -= this.rules.stepSeconds
    }
    return draft.events
  }

  returnAfter(awaySeconds: number, changes: AbsenceChanges<Draft<State, Catalog, Event>>): readonly Event[] {
    this.secondsNotYetStepped = 0
    const draft = this.draftOverTheWorld()
    changes.beforeLiving(draft)
    changes.afterLiving(draft, this.liveThroughTheAbsence(draft, awaySeconds))
    this.report(draft, this.rules.report.headingAfterAbsence)
    this.writeTheLinesOf(draft)
    this.reportNumbersThatAreNotFinite('an absence')
    return draft.events
  }

  private draftOverTheWorld(): Draft<State, Catalog, Event> {
    return { state: this.world, catalog: this.catalog, events: [], logLines: [] }
  }

  private liveThroughTheAbsence(draft: Draft<State, Catalog, Event>, awaySeconds: number): LivedAbsence {
    const { absenceStepSeconds, longestLivedAbsenceSeconds } = this.rules
    const livedSeconds = Math.min(Math.max(awaySeconds, 0), longestLivedAbsenceSeconds)
    const livedSteps = Math.floor(livedSeconds / absenceStepSeconds)
    const eventsBeforeTheAbsence = draft.events.length
    for (let step = 0; step < livedSteps; step += 1) runTheSchedule(this.rules.schedule, draft, absenceStepSeconds)
    const eventsWhileAway = draft.events.splice(eventsBeforeTheAbsence)
    return { awaySeconds, livedSteps, stepSeconds: absenceStepSeconds, longestLivedSeconds: longestLivedAbsenceSeconds, eventTypesWhileAway: eventsWhileAway.map((event) => event.type) }
  }

  private report(draft: Draft<State, Catalog, Event>, heading: string): void {
    reportTheWorld(draft, heading, this.rules.report, (aheadDraft, seconds) => runTheSchedule(this.rules.schedule, aheadDraft, seconds))
  }

  private reportNumbersThatAreNotFinite(after: string): void {
    if (!this.checksTheWorldsNumbers) return
    for (const number of numbersThatAreNotFinite(this.world, 'world')) {
      if (this.numbersReportedAsNotFinite.has(number)) continue
      this.numbersReportedAsNotFinite.add(number)
      this.write('error', `${number} after ${after}`)
    }
  }

  private hasAStepToTake(): boolean {
    return this.secondsNotYetStepped >= this.rules.stepSeconds - Session.roundingToleranceSeconds
  }

  private isTimeToReportTheWorld(secondsBefore: number): boolean {
    const { everySeconds } = this.rules.report
    return Math.floor(secondsBefore / everySeconds) !== Math.floor(this.rules.clockOf(this.world) / everySeconds)
  }

  private writeTheLinesOf(draft: Draft<State, Catalog, Event>): void {
    for (const line of draft.logLines.splice(0)) this.write(line.level, line.message)
  }
}

export function runTheSchedule<SomeDraft>(schedule: Schedule<SomeDraft>, draft: SomeDraft, seconds: number): void {
  for (const system of schedule) system(draft, seconds)
}
