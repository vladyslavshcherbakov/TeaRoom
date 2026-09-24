import type { OfferingResponse } from '../../../Shared/Simulation/Judgement/OfferingJudgement.ts'

const itemNames: Readonly<Record<string, string>> = {
  kettle: 'Kettle',
  thermos: 'Thermos',
  caddy: 'Tea caddy',
  bowl1: 'Tea bowl',
  bowl2: 'Tea bowl',
  bowl3: 'Tea bowl',
}

const figurineNames: Readonly<Record<string, string>> = {
  dragon: 'The dragon',
  toad: 'The toad',
}

const offeringResponseTexts: Readonly<Record<OfferingResponse, string>> = {
  glow: 'glows softly.',
  subtle: 'seems pleased.',
  barely: 'barely notices.',
}

export const emptyHandText = 'Empty hand'
export const sipText = 'Sip'

export function itemName(itemId: string): string {
  return itemNames[itemId] ?? itemId
}

export function offeringResponseText(figurineId: string, response: OfferingResponse): string {
  return `${figurineNames[figurineId] ?? figurineId} ${offeringResponseTexts[response]}`
}
