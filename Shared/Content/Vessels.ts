import type { VesselDefinition } from '../Simulation/Definitions/VesselDefinition.ts'

export const clayKettle: VesselDefinition = {
  id: 'clayKettle',
  capacityMl: 800,
  maxPourMlPerSecond: 45,
  takesAStreamOfUpToMlPerSecond: 40,
  coolingPerSecond: 0.003,
  lid: { mustBeOpenToPour: false, mustBeOpenToFill: true, coolingMultiplierWhenOpen: 1.5 },
  canSitOnHeater: true,
  hasAMetalShell: false,
  canHoldLeaves: true,
  isDrinkable: false,
}

export const thermos: VesselDefinition = {
  id: 'thermos',
  capacityMl: 500,
  maxPourMlPerSecond: 20,
  takesAStreamOfUpToMlPerSecond: 20,
  coolingPerSecond: 0.0004,
  lid: { mustBeOpenToPour: true, mustBeOpenToFill: true, coolingMultiplierWhenOpen: 8 },
  canSitOnHeater: true,
  hasAMetalShell: true,
  canHoldLeaves: false,
  isDrinkable: false,
}

export const teaBowl: VesselDefinition = {
  id: 'teaBowl',
  capacityMl: 120,
  maxPourMlPerSecond: 15,
  takesAStreamOfUpToMlPerSecond: 20,
  coolingPerSecond: 0.01,
  lid: null,
  canSitOnHeater: false,
  hasAMetalShell: false,
  canHoldLeaves: true,
  isDrinkable: true,
}

export const teaCaddy: VesselDefinition = {
  id: 'teaCaddy',
  capacityMl: 450,
  maxPourMlPerSecond: 30,
  takesAStreamOfUpToMlPerSecond: 60,
  coolingPerSecond: 0.006,
  lid: { mustBeOpenToPour: true, mustBeOpenToFill: true, coolingMultiplierWhenOpen: 2 },
  canSitOnHeater: false,
  hasAMetalShell: false,
  canHoldLeaves: true,
  isDrinkable: true,
}
