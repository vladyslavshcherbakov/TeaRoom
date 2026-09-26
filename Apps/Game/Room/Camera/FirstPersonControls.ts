import type { StickLayout } from '../Views/DebugMenu.ts'
import type { StickDeflection } from './FirstPersonLook.ts'

export type ControlScheme = 'twoSticks' | 'mouseAndKeyboard' | 'mouseAndWalkStick' | 'keyboardAndLookStick'

export type StickRole = 'walk' | 'look'

export type SticksShown = {
  readonly left: StickRole | null
  readonly right: StickRole | null
}

export type WalkFromTheKeys = {
  readonly stick: StickDeflection
  readonly isHurrying: boolean
}

export const controlSchemes: readonly ControlScheme[] = ['twoSticks', 'mouseAndKeyboard', 'mouseAndWalkStick', 'keyboardAndLookStick']
export const hurryingSpeedShare = 1.8

const forwardKeys = ['KeyW', 'ArrowUp']
const backwardKeys = ['KeyS', 'ArrowDown']
const leftKeys = ['KeyA', 'ArrowLeft']
const rightKeys = ['KeyD', 'ArrowRight']
const hurryKeys = ['ShiftLeft', 'ShiftRight']

export function sticksShownFor(scheme: ControlScheme, layout: StickLayout): SticksShown {
  const walk: StickRole | null = usesAWalkStick(scheme) ? 'walk' : null
  const look: StickRole | null = usesALookStick(scheme) ? 'look' : null
  return layout === 'walkOnTheLeft' ? { left: walk, right: look } : { left: look, right: walk }
}

export function usesTheMouse(scheme: ControlScheme): boolean {
  return scheme === 'mouseAndKeyboard' || scheme === 'mouseAndWalkStick'
}

export function usesTheKeyboard(scheme: ControlScheme): boolean {
  return scheme === 'mouseAndKeyboard' || scheme === 'keyboardAndLookStick'
}

export function walkFromTheKeys(keysHeld: ReadonlySet<string>): WalkFromTheKeys {
  const isHeld = (keys: readonly string[]): number => (keys.some((key) => keysHeld.has(key)) ? 1 : 0)
  const right = isHeld(rightKeys) - isHeld(leftKeys)
  const up = isHeld(forwardKeys) - isHeld(backwardKeys)
  const length = Math.hypot(right, up)
  const scale = length > 1 ? 1 / length : 1
  return { stick: { right: right * scale, up: up * scale }, isHurrying: isHeld(hurryKeys) === 1 }
}

function usesAWalkStick(scheme: ControlScheme): boolean {
  return scheme === 'twoSticks' || scheme === 'mouseAndWalkStick'
}

function usesALookStick(scheme: ControlScheme): boolean {
  return scheme === 'twoSticks' || scheme === 'keyboardAndLookStick'
}
