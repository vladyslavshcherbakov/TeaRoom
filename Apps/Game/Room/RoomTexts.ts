import type { OfferingResponse } from '../../../Shared/Simulation/Judgement/OfferingJudgement.ts'
import { textOrFallback, textWith } from '../Texts/Texts.ts'

export function offeringResponseText(figurineId: string, response: OfferingResponse): string {
  return textWith(`offering.${response}`, { figurine: textOrFallback(`figurine.${figurineId}`, figurineId) })
}
