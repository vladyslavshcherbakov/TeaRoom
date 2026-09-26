import { englishPhrases, englishTexts } from './EnglishTexts.ts'

export type TextKey = keyof typeof englishTexts

export type PhraseKey = keyof typeof englishPhrases

export function text(key: TextKey): string {
  return englishTexts[key]
}

export function textWith(key: TextKey, values: Readonly<Record<string, string>>): string {
  return lineFilledWith(text(key), values)
}

export function phraseVariantsOf(phrase: PhraseKey): number {
  return englishPhrases[phrase].length
}

export function phraseLineAtTurn(phrase: PhraseKey, voiceSeed: number, turn: number, values: Readonly<Record<string, string>> = {}): string {
  const lines: readonly [string, ...string[]] = englishPhrases[phrase]
  const lineIndex = (phraseVariantAmong(phrase, voiceSeed, lines.length) - 1 + turn - 1) % lines.length
  return lineFilledWith(lines[lineIndex] ?? lines[0], values)
}

function lineFilledWith(line: string, values: Readonly<Record<string, string>>): string {
  return line.replace(/\{(\w+)\}/g, (placeholder, name: string) => values[name] ?? placeholder)
}

function phraseVariantAmong(phrase: string, voiceSeed: number, variantCount: number): number {
  let hash = 2166136261 ^ voiceSeed
  for (const character of phrase) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  return ((hash >>> 0) % variantCount) + 1
}
