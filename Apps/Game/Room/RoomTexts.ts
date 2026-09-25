import type { OfferingResponse } from '../../../Shared/Simulation/Judgement/OfferingJudgement.ts'
import type { RitualEvent } from '../../../Shared/Simulation/Ritual/RitualEvent.ts'
import { sipText } from '../Table/TableTexts.ts'
import { phraseVariantAtTurn, phraseVariantFor, text, textOrFallback, textWith } from '../Texts/Texts.ts'
import type { RoomRemark } from './RoomPlay.ts'

const spillTheKeeperRemarksOnMl = 5
const tapRanLongFromSeconds = 120
const millilitresInALitre = 1000

export function captionLinesFor(events: readonly RitualEvent[], voiceSeed: number): readonly string[] {
  return events.flatMap((event) => captionLinesOf(event, voiceSeed))
}

export function roomRemarkLine(remark: RoomRemark, voiceSeed: number): string {
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
    case 'tapTurnedOff':
      return event.openSeconds >= tapRanLongFromSeconds ? [drainedLitresLine(event.drainedMl, voiceSeed)] : []
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

function offeringResponseText(figurineId: string, response: OfferingResponse): string {
  return textWith(`offering.${response}`, { figurine: textOrFallback(`figurine.${figurineId}`, figurineId) })
}
