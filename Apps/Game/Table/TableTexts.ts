import type { GodsRemark } from '../../../Shared/Simulation/Judgement/GodsMood.ts'
import type { TasteVerdict } from '../../../Shared/Simulation/Judgement/TasteJudgement.ts'
import { text, textWith } from '../Texts/Texts.ts'

export function remarkText(remark: GodsRemark): string {
  return text(`gods.${remark}`)
}

export function tasteCardLines(verdict: TasteVerdict): readonly string[] {
  return [
    textWith('taste.temperature', { value: text(`taste.temperature.${verdict.temperature}`) }),
    textWith('taste.strength', { value: text(`taste.strength.${verdict.strength}`) }),
    textWith('taste.bitterness', { value: text(`taste.bitterness.${verdict.bitterness}`) }),
  ]
}
