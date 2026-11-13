import { Texts } from '../../Engine/Texts.ts'

export type GameTexts = Texts<string, never>

export function gameTexts(lines: Readonly<Record<string, string>>): GameTexts {
  return new Texts<string, never>(lines, {} as Readonly<Record<never, readonly [string, ...string[]]>>)
}

export function missingLines(lines: Readonly<Record<string, string>>, needed: readonly string[]): readonly string[] {
  return needed.filter((key) => lines[key] === undefined).map((key) => `the texts have no line "${key}"`)
}
