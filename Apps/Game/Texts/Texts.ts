import { englishTexts } from './EnglishTexts.ts'

export type TextKey = keyof typeof englishTexts

export function text(key: TextKey): string {
  return englishTexts[key]
}

export function textWith(key: TextKey, values: Readonly<Record<string, string>>): string {
  return text(key).replace(/\{(\w+)\}/g, (placeholder, name: string) => values[name] ?? placeholder)
}

export function textOrFallback(key: string, fallback: string): string {
  return isTextKey(key) ? text(key) : fallback
}

function isTextKey(key: string): key is TextKey {
  return key in englishTexts
}
