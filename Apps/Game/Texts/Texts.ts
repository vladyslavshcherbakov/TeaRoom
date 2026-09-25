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

export function phraseVariantAmong(phrase: string, voiceSeed: number, variantCount: number): number {
  let hash = 2166136261 ^ voiceSeed
  for (const character of phrase) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  return ((hash >>> 0) % variantCount) + 1
}

export function phraseVariantAtTurn(phrase: string, voiceSeed: number, turn: number): PhraseVariant {
  return ((((phraseVariantFor(phrase, voiceSeed) - 1 + turn - 1) % phraseVariants) + 1) as PhraseVariant)
}

function isTextKey(key: string): key is TextKey {
  return key in englishTexts
}
