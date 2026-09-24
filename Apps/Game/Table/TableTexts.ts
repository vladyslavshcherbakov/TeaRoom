import type { TimeOfDay } from '../../../Shared/Simulation/Definitions/Atmosphere.ts'
import type { GodsRemark } from '../../../Shared/Simulation/Judgement/GodsMood.ts'
import type { TasteVerdict } from '../../../Shared/Simulation/Judgement/TasteJudgement.ts'
import { text, textOrFallback, textWith } from '../Texts/Texts.ts'

export function teaName(teaId: string): string {
  return textOrFallback(`tea.${teaId}`, teaId)
}

export function timeOfDayName(timeOfDay: TimeOfDay): string {
  return text(`timeOfDay.${timeOfDay}`)
}

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
