import { noteDetail, type Draft } from './Draft.ts'

export type Reporter<SomeDraft, State> = (draft: SomeDraft, ahead: State) => readonly string[]

export type WorldReport<State, Catalog, Event> = {
  readonly everySeconds: number
  readonly secondsAhead: number
  readonly heading: string
  readonly headingAfterAbsence: string
  readonly stillLine: string
  readonly reporters: readonly Reporter<Draft<State, Catalog, Event>, State>[]
}

export function reportTheWorld<State, Catalog, Event>(draft: Draft<State, Catalog, Event>, heading: string, report: WorldReport<State, Catalog, Event>, stepAhead: (aheadDraft: Draft<State, Catalog, Event>, seconds: number) => void): void {
  const aheadDraft: Draft<State, Catalog, Event> = { state: structuredClone(draft.state), catalog: draft.catalog, events: [], logLines: [] }
  stepAhead(aheadDraft, report.secondsAhead)
  const lines = report.reporters.flatMap((reporter) => reporter(draft, aheadDraft.state))
  if (lines.length === 0) return noteDetail(draft, `${heading}: ${report.stillLine}`)
  for (const line of lines) noteDetail(draft, `${heading}: ${line}`)
}
