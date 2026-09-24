import type { GodsRemark } from '../../../Shared/Simulation/Judgement/GodsMood.ts'
import type { TasteVerdict } from '../../../Shared/Simulation/Judgement/TasteJudgement.ts'
import { phraseVariantFor, text } from '../Texts/Texts.ts'

type SipFeeling = 'noTea' | 'tooHot' | 'overbrewed' | 'bitter' | 'tooStrong' | 'cold' | 'weak' | 'rich' | 'coolingButGood' | 'justRight'

export function remarkText(remark: GodsRemark): string {
  return text(`gods.${remark}`)
}

export function sipText(verdict: TasteVerdict, voiceSeed: number): string {
  const feeling = sipFeeling(verdict)
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
      return verdict.bitterness === 'high' ? 'bitter' : 'tooStrong'
    case 'shrug':
      return verdict.temperature === 'cold' ? 'cold' : 'weak'
    case 'contentSigh':
      if (verdict.strength === 'rich') return 'rich'
      return verdict.temperature === 'lukewarm' ? 'coolingButGood' : 'justRight'
  }
}
