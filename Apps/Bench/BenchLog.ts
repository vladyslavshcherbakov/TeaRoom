import type { LogLevel, LogLine, RitualLog } from '../../Shared/Simulation/Ritual/RitualLog.ts'

const levelOrder: Readonly<Record<LogLevel, number>> = { debug: 0, info: 1, error: 2 }

export class BenchLog implements RitualLog {
  private readonly visibleLineCount: number
  private readonly linesNewestFirst: string[] = []
  private lowestLevel: LogLevel = 'info'

  constructor(visibleLineCount: number) {
    this.visibleLineCount = visibleLineCount
  }

  get newestFirst(): readonly string[] {
    return this.linesNewestFirst
  }

  readonly write = (line: LogLine): void => {
    if (levelOrder[line.level] < levelOrder[this.lowestLevel]) return
    const text = `${new Date().toISOString().slice(11, 23)} ${line.level.toUpperCase()} ${line.message}`
    if (line.level === 'error') console.error(text)
    else if (line.level === 'debug') console.debug(text)
    else console.info(text)
    this.linesNewestFirst.unshift(text)
    this.linesNewestFirst.length = Math.min(this.linesNewestFirst.length, this.visibleLineCount)
  }

  showLevelsFrom(level: LogLevel): void {
    this.lowestLevel = level
  }

  clear(): void {
    this.linesNewestFirst.length = 0
  }
}
