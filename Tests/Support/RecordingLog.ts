import type { LogLine, RitualLog } from '../../Shared/Simulation/Ritual/RitualLog.ts'

export class RecordingLog implements RitualLog {
  readonly lines: LogLine[] = []

  readonly write = (line: LogLine): void => {
    this.lines.push(line)
  }

  messagesAt(level: LogLine['level']): string[] {
    return this.lines.filter((line) => line.level === level).map((line) => line.message)
  }
}
