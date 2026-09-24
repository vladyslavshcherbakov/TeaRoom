import type { OfferingResponse } from '../../../Shared/Simulation/Judgement/OfferingJudgement.ts'

const figurineNames: Readonly<Record<string, string>> = {
  dragon: 'The dragon',
  toad: 'The toad',
}

const offeringResponseTexts: Readonly<Record<OfferingResponse, string>> = {
  glow: 'glows softly.',
  subtle: 'seems pleased.',
  barely: 'barely notices.',
}

export const sipText = 'Sip'

export function offeringResponseText(figurineId: string, response: OfferingResponse): string {
  return `${figurineNames[figurineId] ?? figurineId} ${offeringResponseTexts[response]}`
}
