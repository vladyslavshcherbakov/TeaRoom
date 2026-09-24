import type { LogLine, RitualLog } from '../../Shared/Simulation/Ritual/RitualLog.ts'

export class ConsoleLog implements RitualLog {
  readonly write = (line: LogLine): void => {
    const text = `${new Date().toISOString()} ${line.level.toUpperCase()} [ritual] ${line.message}`
    if (line.level === 'error') console.error(text)
    else if (line.level === 'debug') console.debug(text)
    else console.info(text)
  }
}
