import type { OfferingResponse } from '../../../Shared/Simulation/Judgement/OfferingJudgement.ts'
import type { RitualEvent } from '../../../Shared/Simulation/Ritual/RitualEvent.ts'
import { remarkText, sipText } from '../Table/TableTexts.ts'
import { phraseVariantAtTurn, phraseVariantFor, text, textOrFallback, textWith } from '../Texts/Texts.ts'
import type { RoomRemark } from './RoomPlay.ts'

const spillTheKeeperRemarksOnMl = 5

export function captionLinesFor(events: readonly RitualEvent[], voiceSeed: number): readonly string[] {
  const isAnOffering = events.some((event) => event.type === 'figurineAcceptedTea')
  return events.flatMap((event) => (event.type === 'godsMoodChanged' && !isAnOffering ? [] : captionLinesOf(event, voiceSeed)))
}

export function roomRemarkLine(remark: RoomRemark, voiceSeed: number): string {
  return text(`${remark.kind}.${phraseVariantAtTurn(remark.kind, voiceSeed, remark.timesTapped)}`)
}

function captionLinesOf(event: RitualEvent, voiceSeed: number): readonly string[] {
  switch (event.type) {
    case 'teaTasted':
      return [sipText(event.verdict, voiceSeed)]
    case 'pourFinished':
      return event.spilledMl >= spillTheKeeperRemarksOnMl ? [text(`spill.${phraseVariantFor('spill', voiceSeed)}`)] : []
    case 'actionRefused':
      return event.reason === 'tooHotToHold' ? [text(`tooHotToHold.${phraseVariantFor('tooHotToHold', voiceSeed)}`)] : []
    case 'burntClothWashedBackToNew':
      return [text(`burntClothWashed.${phraseVariantFor('burntClothWashed', voiceSeed)}`)]
    case 'figurineAcceptedTea':
      return [offeringResponseText(event.figurineId, event.response)]
    case 'godsMoodChanged':
      return [remarkText(event.remark)]
    default:
      return []
  }
}

function offeringResponseText(figurineId: string, response: OfferingResponse): string {
  return textWith(`offering.${response}`, { figurine: textOrFallback(`figurine.${figurineId}`, figurineId) })
}
