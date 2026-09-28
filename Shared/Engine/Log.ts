export type LogLevel = 'debug' | 'info' | 'error'

export type LogLine = {
  readonly level: LogLevel
  readonly message: string
}

export type SessionLog = {
  readonly write: (line: LogLine) => void
}
