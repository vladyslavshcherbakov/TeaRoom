import type { OfferingJudgement } from './OfferingJudgement.ts'
import type { TasteVerdict } from './TasteJudgement.ts'
import type { WaterJudgement } from './WaterJudgement.ts'

export type GodsRemark =
  | 'temperatureIsPerfect'
  | 'pretendNotToNotice'
  | 'understandProbably'
  | 'pleasedWithTheTea'
  | 'veryOverbrewed'
  | 'weWillTellNoOne'
  | 'acceptTheOffering'
  | 'appreciateTheCalm'

export type GodsVerdict = {
  readonly delta: number
  readonly remark: GodsRemark
}

export const largestGodsLossAtOnce = 3
const spillTheGodsNoticeMl = 5

export function godsSatisfactionAfter(satisfaction: number, verdict: GodsVerdict): number {
  const softenedDelta = Math.max(verdict.delta, -largestGodsLossAtOnce)
  return Math.min(100, Math.max(0, satisfaction + softenedDelta))
}

export function godsVerdictOnBrewingWater(judgement: WaterJudgement): GodsVerdict {
  switch (judgement) {
    case 'ideal':
      return { delta: 3, remark: 'temperatureIsPerfect' }
    case 'slightlyCool':
    case 'slightlyHot':
      return { delta: 0, remark: 'pretendNotToNotice' }
    case 'tooCool':
    case 'tooHot':
      return { delta: -1, remark: 'understandProbably' }
  }
}

export function godsVerdictOnFirstSip(reaction: TasteVerdict['reaction']): GodsVerdict | null {
  switch (reaction) {
    case 'waitsForItToCool':
      return null
    case 'contentSigh':
      return { delta: 4, remark: 'pleasedWithTheTea' }
    case 'shrug':
      return { delta: 0, remark: 'pretendNotToNotice' }
    case 'grimace':
      return { delta: -1, remark: 'understandProbably' }
    case 'strongGrimace':
      return { delta: -2, remark: 'veryOverbrewed' }
  }
}

export function godsVerdictOnSpill(spilledMl: number): GodsVerdict | null {
  if (spilledMl < spillTheGodsNoticeMl) return null
  return { delta: -1, remark: 'weWillTellNoOne' }
}

export function godsVerdictOnOffering(offering: OfferingJudgement): GodsVerdict {
  if (offering.satisfactionDelta <= 0) return { delta: 0, remark: 'understandProbably' }
  return { delta: Math.ceil(offering.satisfactionDelta / 2), remark: 'acceptTheOffering' }
}

export function godsVerdictOnFinishing(isTableTidy: boolean): GodsVerdict | null {
  return isTableTidy ? { delta: 2, remark: 'appreciateTheCalm' } : null
}
