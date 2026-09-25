import type { HeaterDefinition } from '../Simulation/Definitions/HeaterDefinition.ts'

export const electricPlate: HeaterDefinition = {
  id: 'electricPlate',
  degreesPerSecondPerLitre: 1.5,
  powerWatts: 2000,
  boilingAwayMlPerSecond: 8,
}
