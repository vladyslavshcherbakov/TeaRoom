import type { OfferingResponse } from '../../../Shared/Simulation/Judgement/OfferingJudgement.ts'
import type { RitualEvent } from '../../../Shared/Simulation/Ritual/RitualEvent.ts'
import { remarkText, tasteCardLines } from '../Table/TableTexts.ts'
import { textOrFallback, textWith } from '../Texts/Texts.ts'

export function captionLinesFor(events: readonly RitualEvent[]): readonly string[] {
  const isAnOffering = events.some((event) => event.type === 'figurineAcceptedTea')
  return events.flatMap((event) => (event.type === 'godsMoodChanged' && !isAnOffering ? [] : captionLinesOf(event)))
}

function captionLinesOf(event: RitualEvent): readonly string[] {
  switch (event.type) {
    case 'teaTasted':
      return tasteCardLines(event.verdict)
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
