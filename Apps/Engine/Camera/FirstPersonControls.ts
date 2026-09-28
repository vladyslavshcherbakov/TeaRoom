import type { StickDeflection } from './FirstPersonLook.ts'

export type ControlScheme = 'twoSticks' | 'mouseAndKeyboard' | 'mouseAndWalkStick' | 'keyboardAndLookStick'

export type StickRole = 'walk' | 'look'

export type SticksShown = {
  readonly left: StickRole | null
  readonly right: StickRole | null
}

export const stickLayouts = ['walkOnTheLeft', 'lookOnTheLeft'] as const

export type StickLayout = (typeof stickLayouts)[number]

export const controlSchemes: readonly ControlScheme[] = ['twoSticks', 'mouseAndKeyboard', 'mouseAndWalkStick', 'keyboardAndLookStick']

const forwardKeys = ['KeyW', 'ArrowUp']
const backwardKeys = ['KeyS', 'ArrowDown']
const leftKeys = ['KeyA', 'ArrowLeft']
const rightKeys = ['KeyD', 'ArrowRight']

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

export function walkFromTheKeys(keysHeld: ReadonlySet<string>): StickDeflection {
  const isHeld = (keys: readonly string[]): number => (keys.some((key) => keysHeld.has(key)) ? 1 : 0)
  const right = isHeld(rightKeys) - isHeld(leftKeys)
  const up = isHeld(forwardKeys) - isHeld(backwardKeys)
  const length = Math.hypot(right, up)
  const scale = length > 1 ? 1 / length : 1
  return { right: right * scale, up: up * scale }
}

function usesAWalkStick(scheme: ControlScheme): boolean {
  return scheme === 'twoSticks' || scheme === 'mouseAndWalkStick'
}

function usesALookStick(scheme: ControlScheme): boolean {
  return scheme === 'twoSticks' || scheme === 'keyboardAndLookStick'
}

export type SticksHeld = {
  readonly left: StickDeflection
  readonly right: StickDeflection
}

export function stickWithRole(role: StickRole, scheme: ControlScheme, layout: StickLayout, sticks: SticksHeld): StickDeflection | null {
  const shown = sticksShownFor(scheme, layout)
  if (shown.left === role) return sticks.left
  return shown.right === role ? sticks.right : null
}

export function walkAsked(scheme: ControlScheme, layout: StickLayout, keysHeld: ReadonlySet<string>, sticks: SticksHeld): StickDeflection {
  const walkStick = stickWithRole('walk', scheme, layout, sticks)
  const fromTheKeys = usesTheKeyboard(scheme) ? walkFromTheKeys(keysHeld) : null
  const areTheKeysUsed = fromTheKeys !== null && (fromTheKeys.right !== 0 || fromTheKeys.up !== 0)
  if (areTheKeysUsed || walkStick === null) return fromTheKeys ?? { right: 0, up: 0 }
  return walkStick
}
