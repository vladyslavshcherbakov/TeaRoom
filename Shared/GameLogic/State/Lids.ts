import type { DeepReadonly } from '../../Engine/DeepReadonly.ts'
import type { VesselDefinition } from '../Definitions/VesselDefinition.ts'
import type { VesselState } from './SessionState.ts'

export function isClosedAgainstPouring(vessel: DeepReadonly<VesselState>, definition: VesselDefinition): boolean {
  return definition.lid?.mustBeOpenToPour === true && !vessel.isLidOpen
}

export function isClosedAgainstFilling(vessel: DeepReadonly<VesselState>, definition: VesselDefinition): boolean {
  return definition.lid?.mustBeOpenToFill === true && !vessel.isLidOpen
}
