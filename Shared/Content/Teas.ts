import type { TeaDefinition } from '../Simulation/Definitions/TeaDefinition.ts'

export const sencha: TeaDefinition = {
  id: 'sencha',
  water: { idealC: 78, good: { lowestC: 75, highestC: 81 }, acceptable: { lowestC: 72, highestC: 84 } },
  steeping: { idealSeconds: 60, idealGramsPer100Ml: 1 },
  extraction: {
    strengthRatePerSecond: 0.016,
    bitternessPerSecond: 0.1,
    bitternessMultiplierAfterIdealTime: 4,
    bitternessGainPerDegreeAboveGood: 0.06,
  },
  balancedStrength: { lowest: 40, highest: 70 },
}

export const oolong: TeaDefinition = {
  id: 'oolong',
  water: { idealC: 90, good: { lowestC: 87, highestC: 93 }, acceptable: { lowestC: 83, highestC: 96 } },
  steeping: { idealSeconds: 90, idealGramsPer100Ml: 1.2 },
  extraction: {
    strengthRatePerSecond: 0.012,
    bitternessPerSecond: 0.06,
    bitternessMultiplierAfterIdealTime: 3,
    bitternessGainPerDegreeAboveGood: 0.03,
  },
  balancedStrength: { lowest: 40, highest: 75 },
}

export const shouPuerh: TeaDefinition = {
  id: 'shouPuerh',
  water: { idealC: 95, good: { lowestC: 92, highestC: 100 }, acceptable: { lowestC: 88, highestC: 100 } },
  steeping: { idealSeconds: 45, idealGramsPer100Ml: 1.5 },
  extraction: {
    strengthRatePerSecond: 0.025,
    bitternessPerSecond: 0.08,
    bitternessMultiplierAfterIdealTime: 2.5,
    bitternessGainPerDegreeAboveGood: 0.02,
  },
  balancedStrength: { lowest: 45, highest: 80 },
}
