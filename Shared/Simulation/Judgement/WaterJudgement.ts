import type { TeaDefinition } from '../Definitions/TeaDefinition.ts'

export type WaterJudgement = 'tooCool' | 'slightlyCool' | 'ideal' | 'slightlyHot' | 'tooHot'

export function judgeWater(temperatureC: number, tea: TeaDefinition): WaterJudgement {
  const { good, acceptable } = tea.water
  if (temperatureC < acceptable.lowestC) return 'tooCool'
  if (temperatureC < good.lowestC) return 'slightlyCool'
  if (temperatureC <= good.highestC) return 'ideal'
  if (temperatureC <= acceptable.highestC) return 'slightlyHot'
  return 'tooHot'
}
