import { interfaceLines } from './Russian/InterfaceLines.ts'
import { nextDayLines } from './Russian/NextDayLines.ts'
import { wifeLines } from './Russian/WifeLines.ts'

export const russianLines: Readonly<Record<string, string>> = { ...interfaceLines, ...wifeLines, ...nextDayLines }
