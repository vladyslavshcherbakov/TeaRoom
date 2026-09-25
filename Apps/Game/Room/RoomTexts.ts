import type { OfferingResponse } from '../../../Shared/Simulation/Judgement/OfferingJudgement.ts'
import { caddyItemId } from '../../../Shared/Simulation/Ritual/Reach.ts'
import type { RitualEvent } from '../../../Shared/Simulation/Ritual/RitualEvent.ts'
import { smoulderingFromCharring } from '../Table/TablePresenter.ts'
import { sipText } from '../Table/TableTexts.ts'
import { phraseVariantAmong, phraseVariantAtTurn, phraseVariantFor, text, textOrFallback, textWith } from '../Texts/Texts.ts'
import type { RoomRemark } from './RoomPlay.ts'

const spillTheKeeperRemarksOnMl = 5
const tapRanLongFromSeconds = 120
const heaterRanLongFromSeconds = 120
const millilitresInALitre = 1000
const heaterTesterVariants = 6

type HeaterTesterVariant = 1 | 2 | 3 | 4 | 5 | 6

export function captionLinesFor(events: readonly RitualEvent[], voiceSeed: number): readonly string[] {
  return events.flatMap((event) => captionLinesOf(event, voiceSeed))
}

export function obituaryLine(voiceSeed: number): string {
  return text(`obituary.${phraseVariantFor('obituary', voiceSeed)}`)
}

export function roomRemarkLine(remark: RoomRemark, voiceSeed: number): string {
  if (remark.kind === 'heaterTester') return text(`heaterTester.${phraseVariantAmong('heaterTester', voiceSeed, heaterTesterVariants) as HeaterTesterVariant}`)
  return text(`${remark.kind}.${phraseVariantAtTurn(remark.kind, voiceSeed, remark.timesTapped)}`)
}

function captionLinesOf(event: RitualEvent, voiceSeed: number): readonly string[] {
  switch (event.type) {
    case 'teaTasted':
      return [sipText(event.verdict, event.cupHeldLeaves, voiceSeed)]
    case 'pourFinished':
      return event.spilledMl >= spillTheKeeperRemarksOnMl ? [text(`spill.${phraseVariantFor('spill', voiceSeed)}`)] : []
    case 'actionRefused':
      return event.reason === 'tooHotToHold' ? [text(`tooHotToHold.${phraseVariantFor('tooHotToHold', voiceSeed)}`)] : []
    case 'heaterSwitchedOff':
      return event.onSeconds >= heaterRanLongFromSeconds ? [heaterEnergyLine(event.kilowattHoursUsed, voiceSeed)] : []
    case 'tapTurnedOff':
      return event.openSeconds >= tapRanLongFromSeconds ? [drainedLitresLine(event.drainedMl, voiceSeed)] : []
    case 'clothTakenOffTheHeater':
      return event.charring >= smoulderingFromCharring ? [text(`smoulderingClothTaken.${phraseVariantFor('smoulderingClothTaken', voiceSeed)}`)] : []
    case 'spoonCrumbled':
      return [text(`spoonCrumbled.${phraseVariantFor('spoonCrumbled', voiceSeed)}`)]
    case 'lastLeavesWashedOut':
      return event.vesselId === caddyItemId ? [text(`caddyWashedOut.${phraseVariantFor('caddyWashedOut', voiceSeed)}`)] : []
    case 'burntClothWashedBackToNew':
      return [text(`burntClothWashed.${phraseVariantFor('burntClothWashed', voiceSeed)}`)]
    case 'figurineAcceptedTea':
      return [offeringResponseText(event.figurineId, event.response)]
    default:
      return []
  }
}

function drainedLitresLine(drainedMl: number, voiceSeed: number): string {
  const litres = String(Number((drainedMl / millilitresInALitre).toFixed(1)))
  return textWith(`tapRanLong.${phraseVariantFor('tapRanLong', voiceSeed)}`, { litres })
}

function heaterEnergyLine(kilowattHoursUsed: number, voiceSeed: number): string {
  const kilowattHours = String(Number(kilowattHoursUsed.toFixed(2)))
  return textWith(`heaterRanLong.${phraseVariantFor('heaterRanLong', voiceSeed)}`, { kilowattHours })
}

function offeringResponseText(figurineId: string, response: OfferingResponse): string {
  return textWith(`offering.${response}`, { figurine: textOrFallback(`figurine.${figurineId}`, figurineId) })
}
