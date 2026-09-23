import type { StrengthRange } from './TeaDefinition.ts'

export type FigurineDefinition = {
  readonly id: string
  readonly affinityByTeaId: Readonly<Record<string, number>>
  readonly preferredStrength: StrengthRange
}
