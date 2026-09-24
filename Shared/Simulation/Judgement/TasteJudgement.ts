import type { TeaDefinition } from '../Definitions/TeaDefinition.ts'
import { isPlainWater, type Liquid } from '../Physics/Liquid.ts'

export type TasteVerdict = {
  readonly temperature: 'tooHot' | 'pleasant' | 'lukewarm' | 'cold'
  readonly strength: 'none' | 'weak' | 'balanced' | 'rich' | 'heavy'
  readonly bitterness: 'soft' | 'noticeable' | 'high' | 'overbrewed'
  readonly reaction: 'contentSigh' | 'waitsForItToCool' | 'shrug' | 'grimace' | 'strongGrimace'
}

const tooHotToDrinkAboveC = 70
const lukewarmBelowC = 45
const coldBelowC = 30
const richStrengthMargin = 15
const noticeableBitternessFrom = 25
const highBitternessFrom = 45
const overbrewedBitternessFrom = 70

export function judgeTaste(sip: Liquid, tea: TeaDefinition): TasteVerdict {
  const temperature = temperatureOf(sip)
  const strength = strengthOf(sip, tea)
  const bitterness = bitternessOf(sip)
  return { temperature, strength, bitterness, reaction: reactionTo(temperature, strength, bitterness) }
}

function temperatureOf(sip: Liquid): TasteVerdict['temperature'] {
  if (sip.temperatureC > tooHotToDrinkAboveC) return 'tooHot'
  if (sip.temperatureC < coldBelowC) return 'cold'
  if (sip.temperatureC < lukewarmBelowC) return 'lukewarm'
  return 'pleasant'
}

function strengthOf(sip: Liquid, tea: TeaDefinition): TasteVerdict['strength'] {
  if (isPlainWater(sip)) return 'none'
  if (sip.strength < tea.balancedStrength.lowest) return 'weak'
  if (sip.strength <= tea.balancedStrength.highest) return 'balanced'
  if (sip.strength <= tea.balancedStrength.highest + richStrengthMargin) return 'rich'
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
  if (bitterness === 'high' || strength === 'heavy') return 'grimace'
  if (strength === 'none' || strength === 'weak' || temperature === 'cold') return 'shrug'
  return 'contentSigh'
}
