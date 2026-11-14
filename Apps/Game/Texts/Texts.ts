import { Texts } from '../../Engine/Texts.ts'
import { unknownCuesIn } from '../Presentation/SpokenLines.ts'

export type GameTexts = Texts<string, never>

export function gameTexts(lines: Readonly<Record<string, string>>): GameTexts {
  return new Texts<string, never>(lines, {} as Readonly<Record<never, readonly [string, ...string[]]>>)
}

export function linesWithUnknownCues(lines: Readonly<Record<string, string>>): readonly string[] {
  return Object.entries(lines).flatMap(([key, line]) => unknownCuesIn(line).map((verb) => `the line "${key}" has the unknown cue [${verb}]`))
}

export function missingLines(lines: Readonly<Record<string, string>>, needed: readonly string[]): readonly string[] {
  return needed.filter((key) => lines[key] === undefined).map((key) => `the texts have no line "${key}"`)
}
