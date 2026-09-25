import { englishTexts } from './EnglishTexts.ts'

export type TextKey = keyof typeof englishTexts

export type PhraseVariant = 1 | 2 | 3 | 4

const phraseVariants = 4

export function text(key: TextKey): string {
  return englishTexts[key]
}

export function textWith(key: TextKey, values: Readonly<Record<string, string>>): string {
  return text(key).replace(/\{(\w+)\}/g, (placeholder, name: string) => values[name] ?? placeholder)
}

export function textOrFallback(key: string, fallback: string): string {
  return isTextKey(key) ? text(key) : fallback
}

export function phraseVariantFor(phrase: string, voiceSeed: number): PhraseVariant {
  return phraseVariantAmong(phrase, voiceSeed, phraseVariants) as PhraseVariant
}

export function phraseVariantsOf(phrase: string): number {
  let variants = 0
  while (isTextKey(`${phrase}.${variants + 1}`)) variants += 1
  return variants
}

export function phraseLineAtTurn(phrase: string, voiceSeed: number, turn: number, values: Readonly<Record<string, string>> = {}): string {
  const variants = phraseVariantsOf(phrase)
  const variant = ((phraseVariantAmong(phrase, voiceSeed, variants) - 1 + turn - 1) % variants) + 1
  return textWith(`${phrase}.${variant}` as TextKey, values)
}

function phraseVariantAmong(phrase: string, voiceSeed: number, variantCount: number): number {
  let hash = 2166136261 ^ voiceSeed
  for (const character of phrase) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  return ((hash >>> 0) % variantCount) + 1
}

function isTextKey(key: string): key is TextKey {
  return key in englishTexts
}
