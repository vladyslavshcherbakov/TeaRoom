import type { VesselDefinition } from '../Simulation/Definitions/VesselDefinition.ts'

export const clayKettle: VesselDefinition = {
  id: 'clayKettle',
  capacityMl: 800,
  maxPourMlPerSecond: 25,
  coolingPerSecond: 0.003,
  lid: { mustBeOpenToPour: false, mustBeOpenToFill: true, coolingMultiplierWhenOpen: 1.5 },
  canSitOnHeater: true,
  canHoldLeaves: true,
  isDrinkable: false,
}

export const thermos: VesselDefinition = {
  id: 'thermos',
  capacityMl: 500,
  maxPourMlPerSecond: 20,
  coolingPerSecond: 0.0004,
  lid: { mustBeOpenToPour: true, mustBeOpenToFill: true, coolingMultiplierWhenOpen: 8 },
  canSitOnHeater: false,
  canHoldLeaves: false,
  isDrinkable: false,
}

export const teaBowl: VesselDefinition = {
  id: 'teaBowl',
  capacityMl: 120,
  maxPourMlPerSecond: 15,
  coolingPerSecond: 0.01,
  lid: null,
  canSitOnHeater: false,
  canHoldLeaves: false,
  isDrinkable: true,
}
