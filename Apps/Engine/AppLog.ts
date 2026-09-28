export type AppLogLevel = 'info' | 'error'

export type AppLog = (message: string, level?: AppLogLevel) => void
