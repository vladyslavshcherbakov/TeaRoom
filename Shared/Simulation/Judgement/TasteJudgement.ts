import { definitionIn, type Catalog } from '../Definitions/Catalog.ts'
import type { StrengthRange, TeaDefinition } from '../Definitions/TeaDefinition.ts'
import { isPlainWater, shareOfTheStrengthByTeaId, type Liquid } from '../Physics/Liquid.ts'

export type TasteVerdict = {
  readonly temperature: 'tooHot' | 'pleasant' | 'lukewarm' | 'cold'
  readonly strength: 'none' | 'weak' | 'balanced' | 'rich' | 'heavy' | 'extreme'
  readonly bitterness: 'soft' | 'noticeable' | 'high' | 'overbrewed'
  readonly reaction: 'contentSigh' | 'waitsForItToCool' | 'shrug' | 'grimace' | 'strongGrimace'
}

export type TeaInABlend = {
  readonly tea: TeaDefinition
  readonly share: number
}

const tooHotToDrinkAboveC = 93
const lukewarmBelowC = 45
const coldBelowC = 30
const richStrengthMargin = 15
const extremeStrengthFrom = 98
const noticeableBitternessFrom = 25
const highBitternessFrom = 45
const overbrewedBitternessFrom = 70
const strengthsThatKillStraightFromTheCaddy: ReadonlySet<TasteVerdict['strength']> = new Set(['heavy', 'extreme'])

export function isFatalStraightFromTheCaddy(verdict: TasteVerdict): boolean {
  return strengthsThatKillStraightFromTheCaddy.has(verdict.strength)
}

export function blendOf(liquid: Liquid, catalog: Catalog): readonly TeaInABlend[] {
  return Object.entries(shareOfTheStrengthByTeaId(liquid)).map(([teaId, share]) => ({ tea: definitionIn(catalog, 'teas', teaId), share }))
}

export function balancedStrengthOf(blend: readonly TeaInABlend[]): StrengthRange {
  return {
    lowest: blend.reduce((lowest, { tea, share }) => lowest + tea.balancedStrength.lowest * share, 0),
    highest: blend.reduce((highest, { tea, share }) => highest + tea.balancedStrength.highest * share, 0),
  }
}

export function judgeTaste(sip: Liquid, blend: readonly TeaInABlend[]): TasteVerdict {
  const temperature = temperatureOf(sip)
  const strength = strengthOf(sip, blend)
  const bitterness = bitternessOf(sip)
  return { temperature, strength, bitterness, reaction: reactionTo(temperature, strength, bitterness) }
}

function temperatureOf(sip: Liquid): TasteVerdict['temperature'] {
  if (sip.temperatureC > tooHotToDrinkAboveC) return 'tooHot'
  if (sip.temperatureC < coldBelowC) return 'cold'
  if (sip.temperatureC < lukewarmBelowC) return 'lukewarm'
  return 'pleasant'
}

function strengthOf(sip: Liquid, blend: readonly TeaInABlend[]): TasteVerdict['strength'] {
  if (blend.length === 0 || isPlainWater(sip)) return 'none'
  const balancedStrength = balancedStrengthOf(blend)
  if (sip.strength < balancedStrength.lowest) return 'weak'
  if (sip.strength <= balancedStrength.highest) return 'balanced'
  if (sip.strength >= extremeStrengthFrom) return 'extreme'
  if (sip.strength <= balancedStrength.highest + richStrengthMargin) return 'rich'
  return 'heavy'
}

function bitternessOf(sip: Liquid): TasteVerdict['bitterness'] {
  if (sip.bitterness >= overbrewedBitternessFrom) return 'overbrewed'
  if (sip.bitterness >= highBitternessFrom) return 'high'
  if (sip.bitterness >= noticeableBitternessFrom) return 'noticeable'
  return 'soft'
}

function reactionTo(
  temperature: TasteVerdict['temperature'],
  strength: TasteVerdict['strength'],
  bitterness: TasteVerdict['bitterness'],
): TasteVerdict['reaction'] {
  if (temperature === 'tooHot') return 'waitsForItToCool'
  if (bitterness === 'overbrewed') return 'strongGrimace'
  if (bitterness === 'high' || strength === 'heavy' || strength === 'extreme') return 'grimace'
  if (strength === 'none' || strength === 'weak' || temperature === 'cold') return 'shrug'
  return 'contentSigh'
}
