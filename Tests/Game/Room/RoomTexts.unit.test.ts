import assert from 'node:assert/strict'
import test from 'node:test'
import { captionLinesFor, roomRemarkLine } from '../../../Apps/Game/Room/RoomTexts.ts'
import { englishTexts } from '../../../Apps/Game/Texts/EnglishTexts.ts'

test('caption_ofAnOffering_namesTheFigurine', () => {
  const lines = captionLinesFor([{ type: 'figurineAcceptedTea', figurineId: 'dragon', response: 'glow' }], 7)

  assert.deepEqual(lines, ['The dragon glows softly.'])
})

test('caption_ofABurntClothWashedBackToNew_marvelsAtTheWorld', () => {
  const lines = captionLinesFor([{ type: 'burntClothWashedBackToNew' }], 7)

  assert.equal(lines.length, 1)
  assert.ok(burntClothLines.includes(lines[0] ?? ''), lines.join(' / '))
})

test('caption_ofTakingAThermosTooHotToHold_warnsOfItsGlow', () => {
  const lines = captionLinesFor([{ type: 'actionRefused', command: 'pickUp', reason: 'tooHotToHold' }], 7)

  assert.equal(lines.length, 1)
  assert.ok(Object.entries(englishTexts).some(([key, line]) => key.startsWith('tooHotToHold.') && line === lines[0]), lines.join(' / '))
})

test('caption_ofASmoulderingClothTakenOffTheHeater_jokesAboutTheHouse', () => {
  const lines = captionLinesFor([{ type: 'clothTakenOffTheHeater', charring: 0.5 }], 7)

  assert.equal(lines.length, 1)
  assert.ok(Object.entries(englishTexts).some(([key, line]) => key.startsWith('smoulderingClothTaken.') && line === lines[0]), lines.join(' / '))
})

test('caption_ofAClothTakenOffTheHeaterBeforeItSmoulders_staysSilent', () => {
  assert.deepEqual(captionLinesFor([{ type: 'clothTakenOffTheHeater', charring: 0.49 }], 7), [])
})

test('caption_ofASpoonThatCrumbled_answersInOneLine', () => {
  const lines = captionLinesFor([{ type: 'spoonCrumbled', gramsLost: 2 }], 7)

  assert.equal(lines.length, 1)
  assert.ok(Object.entries(englishTexts).some(([key, line]) => key.startsWith('spoonCrumbled.') && line === lines[0]), lines.join(' / '))
})

test('caption_ofTheCaddyWashedClean_mournsTheTea', () => {
  const lines = captionLinesFor([{ type: 'lastLeavesWashedOut', vesselId: 'caddy' }], 7)

  assert.equal(lines.length, 1)
  assert.ok(Object.entries(englishTexts).some(([key, line]) => key.startsWith('caddyWashedOut.') && line === lines[0]), lines.join(' / '))
})

test('caption_ofLeavesWashedOutOfTheKettle_staysSilent', () => {
  assert.deepEqual(captionLinesFor([{ type: 'lastLeavesWashedOut', vesselId: 'kettle' }], 7), [])
})

test('heaterTesterLine_acrossTheKeepersVoices_isEveryOneOfItsSevenLines', () => {
  const heaterTesterLines = Object.entries(englishTexts).filter(([key]) => key.startsWith('heaterTester.')).map(([, line]) => line)

  const linesHeard = new Set(Array.from({ length: 1000 }, (_, index) => roomRemarkLine({ kind: 'heaterTester', timesTapped: 1 }, index + 1)))

  assert.equal(heaterTesterLines.length, 7)
  assert.deepEqual([...linesHeard].sort(), [...heaterTesterLines].sort())
})

test('caption_ofAnOrdinaryRefusal_staysSilent', () => {
  assert.deepEqual(captionLinesFor([{ type: 'actionRefused', command: 'pickUp', reason: 'handsFull' }], 7), [])
})

test('caption_ofATapTurnedOffAfterTwoMinutes_namesTheLitresThatWentDownTheDrain', () => {
  const lines = captionLinesFor([{ type: 'tapTurnedOff', openSeconds: 120, drainedMl: 4460 }], 7)

  assert.equal(lines.length, 1)
  assert.ok(lines[0]?.includes('4.5 litres'), lines.join(' / '))
})

test('caption_ofATapTurnedOffBeforeTwoMinutes_staysSilent', () => {
  assert.deepEqual(captionLinesFor([{ type: 'tapTurnedOff', openSeconds: 119, drainedMl: 4460 }], 7), [])
})

test('caption_ofAHeaterSwitchedOffAfterTwoMinutes_remarksOnTheEnergy', () => {
  const lines = captionLinesFor([{ type: 'heaterSwitchedOff', waterJudgement: null, onSeconds: 120, kilowattHoursUsed: 0.0667 }], 7)

  const energyLines = Object.entries(englishTexts).filter(([key]) => key.startsWith('heaterRanLong.')).map(([, line]) => line.replace('{kilowattHours}', '0.07'))
  assert.equal(lines.length, 1)
  assert.ok(energyLines.includes(lines[0] ?? ''), lines.join(' / '))
})

test('caption_ofAHeaterSwitchedOffBeforeTwoMinutes_staysSilent', () => {
  assert.deepEqual(captionLinesFor([{ type: 'heaterSwitchedOff', waterJudgement: 'ideal', onSeconds: 119, kilowattHoursUsed: 0.066 }], 7), [])
})

test('remark_ofTheSillTappedTwice_changesItsLine', () => {
  const firstLine = roomRemarkLine({ kind: 'sillIsTheRoomsOwn', timesTapped: 1 }, 7)

  const secondLine = roomRemarkLine({ kind: 'sillIsTheRoomsOwn', timesTapped: 2 }, 7)

  assert.notEqual(secondLine, firstLine)
})

test('remark_ofABowlKeptOffTheHeaterAgain_changesItsLine', () => {
  const firstLine = roomRemarkLine({ kind: 'bowlKeptOffTheHeater', timesTapped: 1 }, 7)

  const secondLine = roomRemarkLine({ kind: 'bowlKeptOffTheHeater', timesTapped: 2 }, 7)

  assert.notEqual(secondLine, firstLine)
})

const burntClothLines = [
  "Amazing. A burnt cloth washes back to new. I think I'll stay in this world.",
  'Not a trace of the fire. This world forgives things. I could live here.',
  "Magic sink! The burn is gone. I'm never leaving.",
  'Burnt, rinsed, reborn. What a kind little world.',
]
