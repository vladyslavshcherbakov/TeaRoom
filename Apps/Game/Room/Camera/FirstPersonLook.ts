import type { CameraPose, FloorPoint, WorldPoint } from '../RoomLayout.ts'
import { walkingSpeedMetresPerSecond } from '../Walking/Walk.ts'

export type FirstPersonLook = {
  readonly headingRadians: number
  readonly pitchRadians: number
}

export type StickDeflection = {
  readonly right: number
  readonly up: number
}

export type MouseMovement = {
  readonly x: number
  readonly y: number
}

export const firstPersonFieldOfViewDegrees = 70

const turnRadiansPerMousePixel = 0.0025
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

export function lookTurnedByTheMouse(look: FirstPersonLook, movement: MouseMovement): FirstPersonLook {
  const pitchRadians = look.pitchRadians - movement.y * turnRadiansPerMousePixel
  return {
    headingRadians: look.headingRadians - movement.x * turnRadiansPerMousePixel,
    pitchRadians: Math.min(steepestPitchRadians, Math.max(-steepestPitchRadians, pitchRadians)),
  }
}

export function lookAt(target: WorldPoint, eye: WorldPoint): FirstPersonLook {
  const across = { x: target.x - eye.x, z: target.z - eye.z }
  return { headingRadians: Math.atan2(across.x, across.z), pitchRadians: Math.atan2(target.y - eye.y, Math.hypot(across.x, across.z)) }
}

export function lookTurnedTowards(look: FirstPersonLook, headingRadians: number, seconds: number): FirstPersonLook {
  const difference = Math.atan2(Math.sin(headingRadians - look.headingRadians), Math.cos(headingRadians - look.headingRadians))
  const share = 1 - Math.exp(-seconds / turnSettleSeconds)
  return { ...look, headingRadians: look.headingRadians + difference * share }
}

export function stepFor(stick: StickDeflection, headingRadians: number, seconds: number, speedShare = 1): FloorPoint {
  const metres = walkingSpeedMetresPerSecond * speedShare * seconds
  const forward = { x: Math.sin(headingRadians), z: Math.cos(headingRadians) }
  const right = rightOnTheFloorOf(headingRadians)
  return { x: (forward.x * stick.up + right.x * stick.right) * metres, z: (forward.z * stick.up + right.z * stick.right) * metres }
}

export function rightOnTheFloorOf(headingRadians: number): FloorPoint {
  return { x: -Math.cos(headingRadians), z: Math.sin(headingRadians) }
}

export function firstPersonPose(walker: FloorPoint, look: FirstPersonLook, eyeHeight: number): CameraPose {
  const flatReach = Math.cos(look.pitchRadians)
  return {
    position: { x: walker.x, y: eyeHeight, z: walker.z },
    target: {
      x: walker.x + Math.sin(look.headingRadians) * flatReach,
      y: eyeHeight + Math.sin(look.pitchRadians),
      z: walker.z + Math.cos(look.headingRadians) * flatReach,
    },
  }
}
