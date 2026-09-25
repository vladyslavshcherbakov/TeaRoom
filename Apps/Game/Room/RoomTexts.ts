import type { OfferingResponse } from '../../../Shared/Simulation/Judgement/OfferingJudgement.ts'
import { caddyItemId } from '../../../Shared/Simulation/Ritual/Reach.ts'
import type { RitualEvent } from '../../../Shared/Simulation/Ritual/RitualEvent.ts'
import { smoulderingFromCharring } from '../Table/TablePresenter.ts'
import { sipText } from '../Table/TableTexts.ts'
import { phraseLineAtTurn, phraseVariantsOf, textOrFallback, textWith } from '../Texts/Texts.ts'
import type { RoomLog } from './RoomNavigator.ts'
import type { RoomRemark } from './RoomPlay.ts'

const spillTheKeeperRemarksOnMl = 5
const spillRemarksApartSeconds = 120
const tapRanLongFromSeconds = 120
const heaterRanLongFromSeconds = 120
const millilitresInALitre = 1000
const onceAVisit = 1

export class RoomTexts {
  private readonly voiceSeed: number
  private readonly log: RoomLog
  private readonly timesSaid = new Map<string, number>()
  private spillsRemarkedOn = 0
  private lastSpillRemarkedOnAtSeconds: number | null = null

  constructor(voiceSeed: number, log: RoomLog) {
    this.voiceSeed = voiceSeed
    this.log = log
  }

  captionLinesFor(events: readonly RitualEvent[], elapsedSeconds: number): readonly string[] {
    return events.flatMap((event) => this.captionLinesOf(event, elapsedSeconds))
  }

  remarkLines(remark: RoomRemark): readonly string[] {
    return this.linesOnTurn(remark.kind, remark.timesTapped, phraseVariantsOf(remark.kind), {})
  }

  lastWordsLine(): string {
    return phraseLineAtTurn('lastWords', this.voiceSeed, 1)
  }

  obituaryLine(): string {
    return phraseLineAtTurn('obituary', this.voiceSeed, 1)
  }

  private captionLinesOf(event: RitualEvent, elapsedSeconds: number): readonly string[] {
    switch (event.type) {
      case 'teaTasted':
        return [sipText(event.verdict, event.cupHeldLeaves, this.voiceSeed)]
      case 'pourFinished':
        return event.spilledMl >= spillTheKeeperRemarksOnMl ? this.spillLines(elapsedSeconds) : []
      case 'actionRefused':
        return event.reason === 'tooHotToHold' ? this.joke('tooHotToHold') : []
      case 'heaterSwitchedOff':
        return event.onSeconds >= heaterRanLongFromSeconds ? this.joke('heaterRanLong', { kilowattHours: kilowattHoursText(event.kilowattHoursUsed) }) : []
      case 'tapTurnedOff':
        return event.openSeconds >= tapRanLongFromSeconds ? this.joke('tapRanLong', { litres: litresText(event.drainedMl) }) : []
      case 'clothTakenOffTheHeater':
        return event.charring >= smoulderingFromCharring ? this.saidUpTo('smoulderingClothTaken', onceAVisit) : []
      case 'spoonCrumbled':
        return this.joke('spoonCrumbled')
      case 'lastLeavesWashedOut':
        return event.vesselId === caddyItemId ? this.joke('caddyWashedOut') : []
      case 'burntClothWashedBackToNew':
        return this.saidUpTo('burntClothWashed', onceAVisit)
      case 'houseRestocked':
        return this.restockLines(event.spoonReturned, event.caddyWasEmpty)
      case 'figurineAcceptedTea':
        return [offeringResponseText(event.figurineId, event.response)]
      default:
        return []
    }
  }

  private restockLines(spoonReturned: boolean, caddyWasEmpty: boolean): readonly string[] {
    if (spoonReturned && caddyWasEmpty) return [phraseLineAtTurn('spoonAndCaddyReturned', this.voiceSeed, 1)]
    if (spoonReturned) return [phraseLineAtTurn('spoonReturned', this.voiceSeed, 1)]
    if (caddyWasEmpty) return [phraseLineAtTurn('emptyCaddyRefilled', this.voiceSeed, 1)]
    return []
  }

  private joke(phrase: string, values: Readonly<Record<string, string>> = {}): readonly string[] {
    return this.saidUpTo(phrase, phraseVariantsOf(phrase), values)
  }

  private saidUpTo(phrase: string, timesAVisit: number, values: Readonly<Record<string, string>> = {}): readonly string[] {
    const turn = (this.timesSaid.get(phrase) ?? 0) + 1
    const lines = this.linesOnTurn(phrase, turn, timesAVisit, values)
    if (lines.length > 0) this.timesSaid.set(phrase, turn)
    return lines
  }

  private linesOnTurn(phrase: string, turn: number, timesAVisit: number, values: Readonly<Record<string, string>>): readonly string[] {
    if (turn > timesAVisit) {
      this.log(`the keeper keeps quiet about ${phrase}: said ${timesAVisit} times this visit already, and a joke is never told twice`)
      return []
    }
    return [phraseLineAtTurn(phrase, this.voiceSeed, turn, values)]
  }

  private spillLines(elapsedSeconds: number): readonly string[] {
    const lastAtSeconds = this.lastSpillRemarkedOnAtSeconds
    if (lastAtSeconds !== null && elapsedSeconds - lastAtSeconds < spillRemarksApartSeconds) {
      this.log(`the keeper keeps quiet about a spill: the last one was remarked on ${Math.round(elapsedSeconds - lastAtSeconds)} s ago, less than ${spillRemarksApartSeconds} s`)
      return []
    }
    this.lastSpillRemarkedOnAtSeconds = elapsedSeconds
    this.spillsRemarkedOn += 1
    return [phraseLineAtTurn('spill', this.voiceSeed, this.spillsRemarkedOn)]
  }
}

function litresText(drainedMl: number): string {
  return String(Number((drainedMl / millilitresInALitre).toFixed(1)))
}

function kilowattHoursText(kilowattHoursUsed: number): string {
  return String(Number(kilowattHoursUsed.toFixed(2)))
}

function offeringResponseText(figurineId: string, response: OfferingResponse): string {
  return textWith(`offering.${response}`, { figurine: textOrFallback(`figurine.${figurineId}`, figurineId) })
}
