import type { LogLine } from './Log.ts'

export type Draft<State, Catalog, Event> = {
  readonly state: State
  readonly catalog: Catalog
  readonly events: Event[]
  readonly logLines: LogLine[]
}

type LoggingDraft = { readonly logLines: LogLine[] }

export function note(draft: LoggingDraft, message: string): void {
  draft.logLines.push({ level: 'info', message })
}

export function noteDetail(draft: LoggingDraft, message: string): void {
  draft.logLines.push({ level: 'debug', message })
}
