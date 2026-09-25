import type { CameraPose, FloorPoint } from '../RoomLayout.ts'
import { walkingSpeedMetresPerSecond } from '../Walking/Walk.ts'

export type FirstPersonLook = {
  readonly headingRadians: number
  readonly pitchRadians: number
}

export type StickDeflection = {
  readonly right: number
  readonly up: number
}

export const firstPersonFieldOfViewDegrees = 70

const eyeHeightMetres = 1
const fastestTurnRadiansPerSecond = 2.1
const fastestTiltRadiansPerSecond = 1.1
const steepestPitchRadians = 1
const turnSettleSeconds = 0.3

export function lookTurnedBy(look: FirstPersonLook, stick: StickDeflection, seconds: number): FirstPersonLook {
  const pitchRadians = look.pitchRadians + stick.up * fastestTiltRadiansPerSecond * seconds
  return {
    headingRadians: look.headingRadians - stick.right * fastestTurnRadiansPerSecond * seconds,
    pitchRadians: Math.min(steepestPitchRadians, Math.max(-steepestPitchRadians, pitchRadians)),
  }
}

export function lookTurnedTowards(look: FirstPersonLook, headingRadians: number, seconds: number): FirstPersonLook {
  const difference = Math.atan2(Math.sin(headingRadians - look.headingRadians), Math.cos(headingRadians - look.headingRadians))
  const share = 1 - Math.exp(-seconds / turnSettleSeconds)
  return { ...look, headingRadians: look.headingRadians + difference * share }
}

export function stepFor(stick: StickDeflection, headingRadians: number, seconds: number): FloorPoint {
  const metres = walkingSpeedMetresPerSecond * seconds
  const forward = { x: Math.sin(headingRadians), z: Math.cos(headingRadians) }
  const right = { x: -forward.z, z: forward.x }
  return { x: (forward.x * stick.up + right.x * stick.right) * metres, z: (forward.z * stick.up + right.z * stick.right) * metres }
}

export function firstPersonPose(walker: FloorPoint, look: FirstPersonLook): CameraPose {
  const flatReach = Math.cos(look.pitchRadians)
  return {
    position: { x: walker.x, y: eyeHeightMetres, z: walker.z },
    target: {
      x: walker.x + Math.sin(look.headingRadians) * flatReach,
      y: eyeHeightMetres + Math.sin(look.pitchRadians),
      z: walker.z + Math.cos(look.headingRadians) * flatReach,
    },
  }
}
