import type { LogLine, SessionLog } from '../../Shared/Engine/Log.ts'

export class RecordingLog implements SessionLog {
  readonly lines: LogLine[] = []

  readonly write = (line: LogLine): void => {
    this.lines.push(line)
  }

  messagesAt(level: LogLine['level']): string[] {
    return this.lines.filter((line) => line.level === level).map((line) => line.message)
  }
}
