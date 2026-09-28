import { Texts } from '../../Engine/Texts.ts'
import { englishPhrases, englishTexts } from './EnglishTexts.ts'

export type TextKey = keyof typeof englishTexts

export type PhraseKey = keyof typeof englishPhrases

const englishLines = new Texts<TextKey, PhraseKey>(englishTexts, englishPhrases)

export function text(key: TextKey): string {
  return englishLines.text(key)
}

export function textWith(key: TextKey, values: Readonly<Record<string, string>>): string {
  return englishLines.textWith(key, values)
}

export function phraseVariantsOf(phrase: PhraseKey): number {
  return englishLines.phraseVariantsOf(phrase)
}

export function phraseLineAtTurn(phrase: PhraseKey, voiceSeed: number, turn: number, values: Readonly<Record<string, string>> = {}): string {
  return englishLines.phraseLineAtTurn(phrase, voiceSeed, turn, values)
}
