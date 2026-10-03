import assert from 'node:assert/strict'
import test from 'node:test'
import type { PlayerBark, PlayerBarkKind } from '../../../../Apps/Game/Room/Reactions/PlayerBarks.ts'
import { RoomTexts, startOverNote } from '../../../../Apps/Game/Room/Reactions/RoomTexts.ts'
import { englishPhrases, englishTexts } from '../../../../Apps/Game/Texts/EnglishTexts.ts'
import { text, type PhraseKey } from '../../../../Apps/Game/Texts/Texts.ts'

test('startOverNote_whenAchievementsAreShown_promisesToKeepThem', () => {
  assert.equal(startOverNote(true), text('visit.startOverNote'))
})

test('startOverNote_whenAchievementsAreHidden_saysNothingOfThem', () => {
  assert.equal(startOverNote(false), text('visit.startOverNoteWithoutAchievements'))
})

test('heaterTesterLine_acrossThePlayersVoices_isEveryOneOfItsSixLines', () => {
  const heaterTesterLines = linesOf('heaterTester')

  const linesHeard = new Set(Array.from({ length: 1000 }, (_, index) => new RoomTexts(index + 1).linesOf([aBark('heaterTester', 1)])[0]))

  assert.equal(heaterTesterLines.length, 6)
  assert.deepEqual([...linesHeard].sort(), [...heaterTesterLines].sort())
})

test('obituary_ofThePlayer_isOneOfTheFourObituaries', () => {
  const obituaries = linesOf('obituary')

  const line = new RoomTexts(7).obituaryLine()

  assert.equal(obituaries.length, 4)
  assert.ok(obituaries.includes(line), line)
})

test('lastWords_ofThePlayerWhoDied_areOneOfTheThreeLinesForDying', () => {
  const lastWords = linesOf('lastWords')

  const line = new RoomTexts(7).lastWordsLine()

  assert.equal(lastWords.length, 3)
  assert.ok(lastWords.includes(line), line)
})

test('playerTexts_nameTheKeeperNowhere', () => {
  const linesNamingTheKeeper = [...Object.values(englishTexts), ...Object.values(englishPhrases).flat()].filter((line) => /keeper/i.test(line))

  assert.deepEqual(linesNamingTheKeeper, [])
})

test('bark_ofTheSillTappedTwice_changesItsLine', () => {
  const texts = new RoomTexts(7)
  const firstLines = texts.linesOf([aBark('sillIsTheRoomsOwn', 1)])

  const secondLines = texts.linesOf([aBark('sillIsTheRoomsOwn', 2)])

  assert.notDeepEqual(secondLines, firstLines)
})

test('bark_ofABowlKeptOffTheHeaterAgain_changesItsLine', () => {
  const texts = new RoomTexts(7)
  const firstLines = texts.linesOf([aBark('bowlKeptOffTheHeater', 1)])

  const secondLines = texts.linesOf([aBark('bowlKeptOffTheHeater', 2)])

  assert.notDeepEqual(secondLines, firstLines)
})

function linesOf(phrase: PhraseKey): readonly string[] {
  return englishPhrases[phrase]
}

function aBark(kind: PlayerBarkKind, timesMade: number): PlayerBark {
  return { kind, timesMade, fact: { kind: 'figurineTapped', figurineId: 'dragon' } }
}
