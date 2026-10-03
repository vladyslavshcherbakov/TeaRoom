import type { FigurineDefinition } from '../GameLogic/Definitions/FigurineDefinition.ts'

export const dragon: FigurineDefinition = {
  id: 'dragon',
  affinityByTeaId: { oolong: 3, sencha: 1 },
}

export const toad: FigurineDefinition = {
  id: 'toad',
  affinityByTeaId: { shouPuerh: 2, sencha: 1, oolong: -1 },
}
