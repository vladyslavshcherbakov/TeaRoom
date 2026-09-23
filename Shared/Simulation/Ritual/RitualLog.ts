export type LogLevel = 'debug' | 'info'

export type LogLine = {
  readonly level: LogLevel
  readonly message: string
}

export type RitualLog = {
  readonly write: (line: LogLine) => void
}
