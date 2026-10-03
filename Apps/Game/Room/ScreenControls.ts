import { sticksShownFor, usesTheMouse, type ControlScheme, type StickLayout } from '../../Engine/Camera/FirstPersonControls.ts'
import type { PlayerMode } from './PlayerMode.ts'
import type { CameraMode } from './RoomSettings.ts'
import type { ScreenButton } from './ScreenButton.ts'

export type ScreenSituation = {
  readonly cameraMode: CameraMode
  readonly controlScheme: ControlScheme
  readonly stickLayout: StickLayout
  readonly mode: PlayerMode
}

export type ScreenControlsShown = {
  readonly buttons: Readonly<Record<ScreenButton, boolean>>
  readonly leftStick: boolean
  readonly rightStick: boolean
  readonly mayHoldTheMouse: boolean
}

export type ScreenButtonPress = 'tap' | 'hold' | 'lift'

type ScreenButtonRule = {
  readonly press: ScreenButtonPress
  readonly isNeededIn: (situation: ScreenSituation) => boolean
}

export const screenButtonRules: Readonly<Record<ScreenButton, ScreenButtonRule>> = {
  tilt: { press: 'hold', isNeededIn: () => true },
  whyPouring: { press: 'tap', isNeededIn: () => true },
  leaveFirstPerson: { press: 'lift', isNeededIn: (situation) => situation.cameraMode === 'firstPerson' },
}

const screenButtonsByMode: Readonly<Record<PlayerMode, readonly ScreenButton[]>> = {
  free: ['leaveFirstPerson'],
  aiming: ['tilt', 'whyPouring', 'leaveFirstPerson'],
  lookingClosely: ['leaveFirstPerson'],
  sipping: ['leaveFirstPerson'],
  choosing: ['leaveFirstPerson'],
  ended: ['leaveFirstPerson'],
}

const isTheLookFreeIn: Readonly<Record<PlayerMode, boolean>> = {
  free: true,
  aiming: false,
  lookingClosely: false,
  sipping: true,
  choosing: false,
  ended: true,
}

export function screenControlsShown(situation: ScreenSituation): ScreenControlsShown {
  const isLookingFreely = situation.cameraMode === 'firstPerson' && isTheLookFreeIn[situation.mode]
  const sticks = sticksShownFor(situation.controlScheme, situation.stickLayout)
  return {
    buttons: { tilt: isShown('tilt', situation), whyPouring: isShown('whyPouring', situation), leaveFirstPerson: isShown('leaveFirstPerson', situation) },
    leftStick: isLookingFreely && sticks.left !== null,
    rightStick: isLookingFreely && sticks.right !== null,
    mayHoldTheMouse: isLookingFreely && usesTheMouse(situation.controlScheme),
  }
}

function isShown(button: ScreenButton, situation: ScreenSituation): boolean {
  return screenButtonsByMode[situation.mode].includes(button) && screenButtonRules[button].isNeededIn(situation)
}
