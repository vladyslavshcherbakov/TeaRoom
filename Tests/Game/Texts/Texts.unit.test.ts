import assert from 'node:assert/strict'
import test from 'node:test'
import { englishPhrases } from '../../../Apps/Game/Texts/EnglishTexts.ts'
import { phraseLineAtTurn, type PhraseKey } from '../../../Apps/Game/Texts/Texts.ts'

const voicesTried = 50

test('phraseLine_ofEveryPhraseInEveryVoiceAndTurn_isOneOfItsLines', () => {
  const phrases = Object.keys(englishPhrases) as PhraseKey[]

  const linesNotInTheirPhrase = phrases.flatMap((phrase) => {
    const lines: readonly string[] = englishPhrases[phrase]
    return Array.from({ length: voicesTried }, (_, voice) => lines.map((_line, turn) => phraseLineAtTurn(phrase, voice + 1, turn + 1)))
      .flat()
      .filter((line) => !lines.includes(line))
      .map((line) => `${phrase}: ${String(line)}`)
  })

  assert.deepEqual(linesNotInTheirPhrase, [])
})
