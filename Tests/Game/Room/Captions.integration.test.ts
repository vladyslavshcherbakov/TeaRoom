import assert from 'node:assert/strict'
import test from 'node:test'
import type { TeaEvent } from '../../../Shared/GameLogic/GameLogic.ts'
import type { AppLog } from '../../../Apps/Engine/AppLog.ts'
import { PlayerBarks, type HeardFact } from '../../../Apps/Game/Room/PlayerBarks.ts'
import { RoomTexts } from '../../../Apps/Game/Room/RoomTexts.ts'
import { englishPhrases } from '../../../Apps/Game/Texts/EnglishTexts.ts'
import { phraseVariantsOf, type PhraseKey } from '../../../Apps/Game/Texts/Texts.ts'

const heaterItemsBeforeTheTesterJoke = 3
const aTapOnTheSill: HeardFact = { kind: 'figurineTapped', figurineId: 'dragon' }

test('caption_ofABurntClothWashedBackToNew_marvelsAtTheWorld', () => {
  const lines = player().linesFor([{ type: 'burntClothWashedBackToNew', clothId: 'cloth' }], 0)

  assert.equal(lines.length, 1)
  assert.ok(linesOf('burntClothWashed').includes(lines[0] ?? ''), lines.join(' / '))
})

test('caption_ofTakingAThermosTooHotToHold_warnsOfItsGlow', () => {
  const lines = player().linesFor([{ type: 'actionRefused', command: 'pickUp', reason: 'tooHotToHold' }], 0)

  assert.equal(lines.length, 1)
  assert.ok(linesOf('tooHotToHold').includes(lines[0] ?? ''), lines.join(' / '))
})

test('caption_ofASmoulderingClothTakenOffTheHeater_jokesAboutTheHouse', () => {
  const lines = player().linesFor([{ type: 'clothTakenOffTheHeater', clothId: 'cloth', charring: 0.5 }], 0)

  assert.equal(lines.length, 1)
  assert.ok(linesOf('smoulderingClothTaken').includes(lines[0] ?? ''), lines.join(' / '))
})

test('caption_ofAClothTakenOffTheHeaterBeforeItSmoulders_staysSilent', () => {
  assert.deepEqual(player().linesFor([{ type: 'clothTakenOffTheHeater', clothId: 'cloth', charring: 0.49 }], 0), [])
})

test('caption_ofAnEvent_isLoggedWithTheBarkItEarns', () => {
  const logLines: string[] = []

  player((line) => logLines.push(line)).linesFor([{ type: 'spoonCrumbled', gramsLost: 2 }], 0)

  assert.deepEqual(logLines, [`the event spoonCrumbled earns the bark spoonCrumbled, made 1 times this visit, at most ${phraseVariantsOf('spoonCrumbled')}`])
})

test('caption_ofASpoonThatCrumbled_answersInOneLine', () => {
  const lines = player().linesFor([{ type: 'spoonCrumbled', gramsLost: 2 }], 0)

  assert.equal(lines.length, 1)
  assert.ok(linesOf('spoonCrumbled').includes(lines[0] ?? ''), lines.join(' / '))
})

test('caption_ofTheCaddyWashedClean_mournsTheTea', () => {
  const lines = player().linesFor([{ type: 'lastLeavesWashedOut', vesselId: 'caddy', isACaddy: true }], 0)

  assert.equal(lines.length, 1)
  assert.ok(linesOf('caddyWashedOut').includes(lines[0] ?? ''), lines.join(' / '))
})

test('caption_ofLeavesWashedOutOfTheKettle_staysSilent', () => {
  assert.deepEqual(player().linesFor([{ type: 'lastLeavesWashedOut', vesselId: 'kettle', isACaddy: false }], 0), [])
})

test('caption_ofAnOrdinaryRefusal_staysSilent', () => {
  assert.deepEqual(player().linesFor([{ type: 'actionRefused', command: 'pickUp', reason: 'handsFull' }], 0), [])
})

test('caption_ofATapTurnedOffAfterTwoMinutes_namesTheLitresThatWentDownTheDrain', () => {
  const lines = player().linesFor([{ type: 'tapTurnedOff', openSeconds: 120, drainedMl: 4460, hasRunOntoAnItem: false }], 0)

  const drainLines = linesOf('tapRanLong').map((line) => line.replace('{litres}', '4.5'))
  assert.equal(lines.length, 1)
  assert.ok(drainLines.includes(lines[0] ?? ''), lines.join(' / '))
})

test('caption_ofATapTurnedOffBeforeTwoMinutes_staysSilent', () => {
  assert.deepEqual(player().linesFor([{ type: 'tapTurnedOff', openSeconds: 119, drainedMl: 4460, hasRunOntoAnItem: false }], 0), [])
})

test('caption_ofAHeaterSwitchedOffAfterWastingTwoMinutes_barksOnTheWastedEnergy', () => {
  const lines = player().linesFor([{ type: 'heaterSwitchedOff', onSeconds: 300, kilowattHoursUsed: 0.1667, wastedSeconds: 120, kilowattHoursWasted: 0.0667, secondsHeatedByItemId: {} }], 0)

  const energyLines = linesOf('heaterRanLong').map((line) => line.replace('{kilowattHours}', '0.07'))
  assert.equal(lines.length, 1)
  assert.ok(energyLines.includes(lines[0] ?? ''), lines.join(' / '))
})

test('caption_ofAHeaterSwitchedOffAfterWastingLessThanTwoMinutes_staysSilent', () => {
  assert.deepEqual(player().linesFor([{ type: 'heaterSwitchedOff', onSeconds: 600, kilowattHoursUsed: 0.3333, wastedSeconds: 119, kilowattHoursWasted: 0.066, secondsHeatedByItemId: { kettle: 481 } }], 0), [])
})

test('bark_ofTheSillTappedAfterEveryLineWasSaid_staysSilent', () => {
  const playerSays = player()
  const linesSaid = [1, 2, 3, 4].flatMap(() => playerSays.linesForAFact(aTapOnTheSill))

  const fifthLines = playerSays.linesForAFact(aTapOnTheSill)

  assert.equal(new Set(linesSaid).size, 4)
  assert.deepEqual(fifthLines, [])
})

test('caption_ofTheTapTurnedOffAfterEveryLineWasSaid_staysSilent', () => {
  const playerSays = player()
  const linesSaid = [0, 300].flatMap((elapsedSeconds) => playerSays.linesFor([tapRanForTwoMinutes], elapsedSeconds))

  const thirdLines = playerSays.linesFor([tapRanForTwoMinutes], 600)

  assert.equal(new Set(linesSaid).size, 2)
  assert.deepEqual(thirdLines, [])
})

test('caption_ofASecondSmoulderingClothTakenOffTheHeater_staysSilent', () => {
  const playerSays = player()
  playerSays.linesFor([{ type: 'clothTakenOffTheHeater', clothId: 'cloth', charring: 0.5 }], 0)

  const secondLines = playerSays.linesFor([{ type: 'clothTakenOffTheHeater', clothId: 'cloth', charring: 0.9 }], 300)

  assert.deepEqual(secondLines, [])
})

test('caption_ofASecondBurntClothWashedBackToNew_staysSilent', () => {
  const playerSays = player()
  playerSays.linesFor([{ type: 'burntClothWashedBackToNew', clothId: 'cloth' }], 0)

  const secondLines = playerSays.linesFor([{ type: 'burntClothWashedBackToNew', clothId: 'cloth' }], 300)

  assert.deepEqual(secondLines, [])
})

test('caption_ofTheOtherClothTakenOffTheHeaterSmouldering_staysSilentAfterTheFirstClothsJoke', () => {
  const playerSays = player()
  playerSays.linesFor([{ type: 'clothTakenOffTheHeater', clothId: 'cloth', charring: 0.5 }], 0)

  const otherClothLines = playerSays.linesFor([{ type: 'clothTakenOffTheHeater', clothId: 'cloth2', charring: 0.5 }], 300)

  assert.deepEqual(otherClothLines, [])
})

test('caption_ofTheOtherBurntClothWashedBackToNew_staysSilentAfterTheFirstClothsJoke', () => {
  const playerSays = player()
  playerSays.linesFor([{ type: 'burntClothWashedBackToNew', clothId: 'cloth' }], 0)

  const otherClothLines = playerSays.linesFor([{ type: 'burntClothWashedBackToNew', clothId: 'cloth2' }], 300)

  assert.deepEqual(otherClothLines, [])
})

test('caption_ofASpillWithinTwoMinutesOfTheLastBarkedSpill_staysSilent', () => {
  const playerSays = player()
  playerSays.linesFor([spillOf10Ml], 0)

  const laterLines = playerSays.linesFor([spillOf10Ml], 119)

  assert.deepEqual(laterLines, [])
})

test('caption_ofASpillTwoMinutesAfterTheLastBarkedSpill_barksInAnotherLine', () => {
  const playerSays = player()
  const firstLines = playerSays.linesFor([spillOf10Ml], 0)

  const laterLines = playerSays.linesFor([spillOf10Ml], 120)

  assert.equal(laterLines.length, 1)
  assert.notDeepEqual(laterLines, firstLines)
})

test('caption_ofAReturnWithTheSpoonBackAndTheCaddyRefilledFromEmpty_isOneLineAboutBoth', () => {
  const lines = player().linesFor([{ type: 'houseRestocked', spoonReturned: true, wasACaddyRefilled: true, wasACaddyEmpty: true }], 0)

  assert.equal(lines.length, 1)
  assert.ok(linesOf('spoonAndCaddyReturned').includes(lines[0] ?? ''), lines.join(' / '))
})

test('caption_ofAReturnWithOnlyTheCaddyToppedUp_staysSilent', () => {
  assert.deepEqual(player().linesFor([{ type: 'houseRestocked', spoonReturned: false, wasACaddyRefilled: true, wasACaddyEmpty: false }], 0), [])
})

const tapRanForTwoMinutes = { type: 'tapTurnedOff', openSeconds: 120, drainedMl: 4460, hasRunOntoAnItem: false } as const

const spillOf10Ml = { type: 'pourFinished', sourceId: 'kettle', targetId: 'bowl', pouredMl: 100, spilledMl: 10 } as const

function linesOf(phrase: PhraseKey): readonly string[] {
  return englishPhrases[phrase]
}

type Player = {
  readonly linesFor: (events: readonly TeaEvent[], elapsedSeconds: number) => readonly string[]
  readonly linesForAFact: (fact: HeardFact) => readonly string[]
}

function player(log: AppLog = () => {}): Player {
  const barks = new PlayerBarks(heaterItemsBeforeTheTesterJoke, log)
  const texts = new RoomTexts(7)
  return {
    linesFor: (events, elapsedSeconds) => texts.linesOf(barks.heard(events.map((event) => ({ kind: 'teaEvent', event, elapsedSeconds })))),
    linesForAFact: (fact) => texts.linesOf(barks.heard([fact])),
  }
}
