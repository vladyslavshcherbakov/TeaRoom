import type { SessionLog } from './Log.ts'

export type LevelOpening<Opened> = { readonly kind: 'opened'; readonly session: Opened } | { readonly kind: 'unavailable'; readonly problems: readonly string[] }

export type WhenALevelCannotOpen = {
  readonly levelName: string
  readonly whatShowsInstead: string
  readonly isDevelopmentBuild: boolean
}

export class BrokenContentError extends Error {
  constructor(levelName: string, problems: readonly string[]) {
    super(`${levelName} cannot open:\n${problems.join('\n')}`)
    this.name = 'BrokenContentError'
  }
}

export function levelOpening<Opened>(contentProblems: readonly string[], open: () => Opened, whenItCannot: WhenALevelCannotOpen, log: SessionLog): LevelOpening<Opened> {
  if (contentProblems.length === 0) return { kind: 'opened', session: open() }
  if (whenItCannot.isDevelopmentBuild) throw new BrokenContentError(whenItCannot.levelName, contentProblems)
  for (const problem of contentProblems) log.write({ level: 'error', message: `content problem: ${problem}` })
  log.write({ level: 'error', message: `${whenItCannot.levelName} is unavailable, showing ${whenItCannot.whatShowsInstead}` })
  return { kind: 'unavailable', problems: contentProblems }
}
