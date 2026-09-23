import type { FigurineDefinition } from '../Simulation/Definitions/FigurineDefinition.ts'

export const dragon: FigurineDefinition = {
  id: 'dragon',
  affinityByTeaId: { oolong: 3, sencha: 1 },
  preferredStrength: { lowest: 50, highest: 80 },
}

export const toad: FigurineDefinition = {
  id: 'toad',
  affinityByTeaId: { shouPuerh: 2, sencha: 1, oolong: -1 },
  preferredStrength: { lowest: 35, highest: 65 },
}
