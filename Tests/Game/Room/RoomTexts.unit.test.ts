import assert from 'node:assert/strict'
import test from 'node:test'
import { RoomTexts, startOverNote } from '../../../Apps/Game/Room/RoomTexts.ts'
import { englishPhrases, englishTexts } from '../../../Apps/Game/Texts/EnglishTexts.ts'
import type { PhraseKey } from '../../../Apps/Game/Texts/Texts.ts'

test('startOverNote_whenAchievementsAreShown_promisesToKeepThem', () => {
  assert.equal(startOverNote(true), 'Your achievements will most likely stay, and the rest are still yours to earn. The world you know may change a little.')
})

test('startOverNote_whenAchievementsAreHidden_saysNothingOfThem', () => {
  assert.equal(startOverNote(false), 'The world you know may change a little.')
})

test('caption_ofAnOffering_namesTheFigurine', () => {
  const lines = new RoomTexts(7, () => {}).captionLinesFor([{ type: 'figurineAcceptedTea', figurineId: 'dragon', response: 'glow' }], 0)

  assert.deepEqual(lines, ['The dragon glows softly.'])
})

test('caption_ofAnOfferingToAFigurineTheRoomDoesNotHave_isNotShownWithItsId', () => {
  const lines = new RoomTexts(7, () => {}).captionLinesFor([{ type: 'figurineAcceptedTea', figurineId: 'crane', response: 'glow' }], 0)

  assert.deepEqual(lines, [])
})

test('caption_ofABurntClothWashedBackToNew_marvelsAtTheWorld', () => {
  const lines = new RoomTexts(7, () => {}).captionLinesFor([{ type: 'burntClothWashedBackToNew', clothId: 'cloth' }], 0)

  assert.equal(lines.length, 1)
  assert.ok(burntClothLines.includes(lines[0] ?? ''), lines.join(' / '))
})

test('caption_ofTakingAThermosTooHotToHold_warnsOfItsGlow', () => {
  const lines = new RoomTexts(7, () => {}).captionLinesFor([{ type: 'actionRefused', command: 'pickUp', reason: 'tooHotToHold' }], 0)

  assert.equal(lines.length, 1)
  assert.ok(linesOf('tooHotToHold').includes(lines[0] ?? ''), lines.join(' / '))
})

test('caption_ofASmoulderingClothTakenOffTheHeater_jokesAboutTheHouse', () => {
  const lines = new RoomTexts(7, () => {}).captionLinesFor([{ type: 'clothTakenOffTheHeater', clothId: 'cloth', charring: 0.5 }], 0)

  assert.equal(lines.length, 1)
  assert.ok(linesOf('smoulderingClothTaken').includes(lines[0] ?? ''), lines.join(' / '))
})

test('caption_ofAClothTakenOffTheHeaterBeforeItSmoulders_staysSilent', () => {
  assert.deepEqual(new RoomTexts(7, () => {}).captionLinesFor([{ type: 'clothTakenOffTheHeater', clothId: 'cloth', charring: 0.49 }], 0), [])
})

test('caption_ofASpoonThatCrumbled_answersInOneLine', () => {
  const lines = new RoomTexts(7, () => {}).captionLinesFor([{ type: 'spoonCrumbled', gramsLost: 2 }], 0)

  assert.equal(lines.length, 1)
  assert.ok(linesOf('spoonCrumbled').includes(lines[0] ?? ''), lines.join(' / '))
})

test('caption_ofTheCaddyWashedClean_mournsTheTea', () => {
  const lines = new RoomTexts(7, () => {}).captionLinesFor([{ type: 'lastLeavesWashedOut', vesselId: 'caddy', isACaddy: true }], 0)

  assert.equal(lines.length, 1)
  assert.ok(linesOf('caddyWashedOut').includes(lines[0] ?? ''), lines.join(' / '))
})

test('caption_ofLeavesWashedOutOfTheKettle_staysSilent', () => {
  assert.deepEqual(new RoomTexts(7, () => {}).captionLinesFor([{ type: 'lastLeavesWashedOut', vesselId: 'kettle', isACaddy: false }], 0), [])
})

test('heaterTesterLine_acrossTheKeepersVoices_isEveryOneOfItsSixLines', () => {
  const heaterTesterLines = linesOf('heaterTester')

  const linesHeard = new Set(Array.from({ length: 1000 }, (_, index) => new RoomTexts(index + 1, () => {}).remarkLines({ kind: 'heaterTester', timesTapped: 1 })[0]))

  assert.equal(heaterTesterLines.length, 6)
  assert.deepEqual([...linesHeard].sort(), [...heaterTesterLines].sort())
})

test('obituary_ofTheKeeper_isOneOfTheFourObituaries', () => {
  const obituaries = linesOf('obituary')

  const line = new RoomTexts(7, () => {}).obituaryLine()

  assert.equal(obituaries.length, 4)
  assert.ok(obituaries.includes(line), line)
})

test('lastWords_ofTheKeeperWhoDied_areOneOfTheThreeLinesForDying', () => {
  const lastWords = linesOf('lastWords')

  const line = new RoomTexts(7, () => {}).lastWordsLine()

  assert.equal(lastWords.length, 3)
  assert.ok(lastWords.includes(line), line)
})

test('playerTexts_nameTheKeeperNowhere', () => {
  const linesNamingTheKeeper = [...Object.values(englishTexts), ...Object.values(englishPhrases).flat()].filter((line) => /keeper/i.test(line))

  assert.deepEqual(linesNamingTheKeeper, [])
})

test('caption_ofAnOrdinaryRefusal_staysSilent', () => {
  assert.deepEqual(new RoomTexts(7, () => {}).captionLinesFor([{ type: 'actionRefused', command: 'pickUp', reason: 'handsFull' }], 0), [])
})

test('caption_ofATapTurnedOffAfterTwoMinutes_namesTheLitresThatWentDownTheDrain', () => {
  const lines = new RoomTexts(7, () => {}).captionLinesFor([{ type: 'tapTurnedOff', openSeconds: 120, drainedMl: 4460, hasRunOntoAnItem: false }], 0)

  assert.equal(lines.length, 1)
  assert.ok(lines[0]?.includes('4.5 litres'), lines.join(' / '))
})

test('caption_ofATapTurnedOffBeforeTwoMinutes_staysSilent', () => {
  assert.deepEqual(new RoomTexts(7, () => {}).captionLinesFor([{ type: 'tapTurnedOff', openSeconds: 119, drainedMl: 4460, hasRunOntoAnItem: false }], 0), [])
})

test('caption_ofAHeaterSwitchedOffAfterWastingTwoMinutes_remarksOnTheWastedEnergy', () => {
  const lines = new RoomTexts(7, () => {}).captionLinesFor([{ type: 'heaterSwitchedOff', onSeconds: 300, kilowattHoursUsed: 0.1667, wastedSeconds: 120, kilowattHoursWasted: 0.0667, secondsHeatedByItemId: {} }], 0)

  const energyLines = linesOf('heaterRanLong').map((line) => line.replace('{kilowattHours}', '0.07'))
  assert.equal(lines.length, 1)
  assert.ok(energyLines.includes(lines[0] ?? ''), lines.join(' / '))
})

test('caption_ofAHeaterSwitchedOffAfterWastingLessThanTwoMinutes_staysSilent', () => {
  assert.deepEqual(new RoomTexts(7, () => {}).captionLinesFor([{ type: 'heaterSwitchedOff', onSeconds: 600, kilowattHoursUsed: 0.3333, wastedSeconds: 119, kilowattHoursWasted: 0.066, secondsHeatedByItemId: { kettle: 481 } }], 0), [])
})

test('remark_ofTheSillTappedTwice_changesItsLine', () => {
  const texts = new RoomTexts(7, () => {})
  const firstLines = texts.remarkLines({ kind: 'sillIsTheRoomsOwn', timesTapped: 1 })

  const secondLines = texts.remarkLines({ kind: 'sillIsTheRoomsOwn', timesTapped: 2 })

  assert.notDeepEqual(secondLines, firstLines)
})

test('remark_ofABowlKeptOffTheHeaterAgain_changesItsLine', () => {
  const texts = new RoomTexts(7, () => {})
  const firstLines = texts.remarkLines({ kind: 'bowlKeptOffTheHeater', timesTapped: 1 })

  const secondLines = texts.remarkLines({ kind: 'bowlKeptOffTheHeater', timesTapped: 2 })

  assert.notDeepEqual(secondLines, firstLines)
})

test('remark_ofTheSillTappedAfterEveryLineWasSaid_staysSilent', () => {
  const texts = new RoomTexts(7, () => {})
  const linesSaid = [1, 2, 3, 4].flatMap((timesTapped) => texts.remarkLines({ kind: 'sillIsTheRoomsOwn', timesTapped }))

  const fifthLines = texts.remarkLines({ kind: 'sillIsTheRoomsOwn', timesTapped: 5 })

  assert.equal(new Set(linesSaid).size, 4)
  assert.deepEqual(fifthLines, [])
})

test('caption_ofTheTapTurnedOffAfterEveryLineWasSaid_staysSilent', () => {
  const texts = new RoomTexts(7, () => {})
  const linesSaid = [0, 300].flatMap((elapsedSeconds) => texts.captionLinesFor([tapRanForTwoMinutes], elapsedSeconds))

  const thirdLines = texts.captionLinesFor([tapRanForTwoMinutes], 600)

  assert.equal(new Set(linesSaid).size, 2)
  assert.deepEqual(thirdLines, [])
})

test('caption_ofASecondSmoulderingClothTakenOffTheHeater_staysSilent', () => {
  const texts = new RoomTexts(7, () => {})
  texts.captionLinesFor([{ type: 'clothTakenOffTheHeater', clothId: 'cloth', charring: 0.5 }], 0)

  const secondLines = texts.captionLinesFor([{ type: 'clothTakenOffTheHeater', clothId: 'cloth', charring: 0.9 }], 300)

  assert.deepEqual(secondLines, [])
})

test('caption_ofASecondBurntClothWashedBackToNew_staysSilent', () => {
  const texts = new RoomTexts(7, () => {})
  texts.captionLinesFor([{ type: 'burntClothWashedBackToNew', clothId: 'cloth' }], 0)

  const secondLines = texts.captionLinesFor([{ type: 'burntClothWashedBackToNew', clothId: 'cloth' }], 300)

  assert.deepEqual(secondLines, [])
})

test('caption_ofTheOtherClothTakenOffTheHeaterSmouldering_staysSilentAfterTheFirstClothsJoke', () => {
  const texts = new RoomTexts(7, () => {})
  texts.captionLinesFor([{ type: 'clothTakenOffTheHeater', clothId: 'cloth', charring: 0.5 }], 0)

  const otherClothLines = texts.captionLinesFor([{ type: 'clothTakenOffTheHeater', clothId: 'cloth2', charring: 0.5 }], 300)

  assert.deepEqual(otherClothLines, [])
})

test('caption_ofTheOtherBurntClothWashedBackToNew_staysSilentAfterTheFirstClothsJoke', () => {
  const texts = new RoomTexts(7, () => {})
  texts.captionLinesFor([{ type: 'burntClothWashedBackToNew', clothId: 'cloth' }], 0)

  const otherClothLines = texts.captionLinesFor([{ type: 'burntClothWashedBackToNew', clothId: 'cloth2' }], 300)

  assert.deepEqual(otherClothLines, [])
})

test('caption_ofASpillWithinTwoMinutesOfTheLastRemarkedSpill_staysSilent', () => {
  const texts = new RoomTexts(7, () => {})
  texts.captionLinesFor([spillOf10Ml], 0)

  const laterLines = texts.captionLinesFor([spillOf10Ml], 119)

  assert.deepEqual(laterLines, [])
})

test('caption_ofASpillTwoMinutesAfterTheLastRemarkedSpill_remarksInAnotherLine', () => {
  const texts = new RoomTexts(7, () => {})
  const firstLines = texts.captionLinesFor([spillOf10Ml], 0)

  const laterLines = texts.captionLinesFor([spillOf10Ml], 120)

  assert.equal(laterLines.length, 1)
  assert.notDeepEqual(laterLines, firstLines)
})

test('caption_ofAReturnWithTheSpoonBackAndTheCaddyRefilledFromEmpty_isOneLineAboutBoth', () => {
  const lines = new RoomTexts(7, () => {}).captionLinesFor([{ type: 'houseRestocked', spoonReturned: true, wasACaddyRefilled: true, wasACaddyEmpty: true }], 0)

  assert.equal(lines.length, 1)
  assert.ok(linesOf('spoonAndCaddyReturned').includes(lines[0] ?? ''), lines.join(' / '))
})

test('caption_ofAReturnWithOnlyTheCaddyToppedUp_staysSilent', () => {
  assert.deepEqual(new RoomTexts(7, () => {}).captionLinesFor([{ type: 'houseRestocked', spoonReturned: false, wasACaddyRefilled: true, wasACaddyEmpty: false }], 0), [])
})

const tapRanForTwoMinutes = { type: 'tapTurnedOff', openSeconds: 120, drainedMl: 4460, hasRunOntoAnItem: false } as const

const spillOf10Ml = { type: 'pourFinished', sourceId: 'kettle', targetId: 'bowl', pouredMl: 100, spilledMl: 10 } as const

const burntClothLines = [
  "Amazing. A burnt cloth washes back to new. I think I'll stay in this world.",
  'Not a trace of the fire. This world forgives things. I could live here.',
  "Magic sink! The burn is gone. I'm never leaving.",
  'Burnt, rinsed, reborn. What a kind little world.',
]

function linesOf(phrase: PhraseKey): readonly string[] {
  return englishPhrases[phrase]
}
