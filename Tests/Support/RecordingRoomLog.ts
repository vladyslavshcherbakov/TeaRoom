import type { AppLog, AppLogLevel } from '../../Apps/Engine/AppLog.ts'

type RoomLogLine = {
  readonly message: string
  readonly level: AppLogLevel
}

export class RecordingRoomLog {
  readonly lines: RoomLogLine[] = []

  readonly write: AppLog = (message, level = 'info') => {
    this.lines.push({ message, level })
  }

  messagesAt(level: AppLogLevel): string[] {
    return this.lines.filter((line) => line.level === level).map((line) => line.message)
  }
}
