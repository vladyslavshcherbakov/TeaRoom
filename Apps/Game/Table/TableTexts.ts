import type { TasteVerdict } from '../../../Shared/Simulation/Judgement/TasteJudgement.ts'
import { phraseVariantFor, text } from '../Texts/Texts.ts'

type SipFeeling = 'noTea' | 'tooHot' | 'amongLeaves' | 'overbrewed' | 'extremelyStrong' | 'bitter' | 'tooStrong' | 'cold' | 'weak' | 'rich' | 'coolingButGood' | 'justRight'

export function sipText(verdict: TasteVerdict, cupHeldLeaves: boolean, voiceSeed: number): string {
  const feeling = verdict.reaction !== 'waitsForItToCool' && cupHeldLeaves ? 'amongLeaves' : sipFeeling(verdict)
  return text(`sip.${feeling}.${phraseVariantFor(feeling, voiceSeed)}`)
}

function sipFeeling(verdict: TasteVerdict): SipFeeling {
  if (verdict.strength === 'none') return 'noTea'
  switch (verdict.reaction) {
    case 'waitsForItToCool':
      return 'tooHot'
    case 'strongGrimace':
      return 'overbrewed'
    case 'grimace':
      if (verdict.strength === 'extreme') return 'extremelyStrong'
      return verdict.bitterness === 'high' ? 'bitter' : 'tooStrong'
    case 'shrug':
      return verdict.temperature === 'cold' ? 'cold' : 'weak'
    case 'contentSigh':
      if (verdict.strength === 'rich') return 'rich'
      return verdict.temperature === 'lukewarm' ? 'coolingButGood' : 'justRight'
  }
}
