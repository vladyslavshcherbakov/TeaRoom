import { middleHandIndex } from '../../../Shared/Simulation/Ritual/Reach.ts'
import type { HandIndex } from '../../../Shared/Simulation/State/SessionState.ts'
import { holdSecondsThatInspectAnItem } from './RoomGestures.ts'
import type { RoomLog } from './RoomNavigator.ts'

export type ShortcutPort = {
  readonly isInspecting: () => boolean
  readonly handTapped: (handIndex: HandIndex) => void
  readonly handHeld: (handIndex: HandIndex, heldSeconds: number) => void
  readonly inspectionClosed: () => void
  readonly sipped: () => void
  readonly tiltPressed: () => void
  readonly tiltReleased: () => void
}

type Shortcut = { readonly kind: 'hand'; readonly handIndex: HandIndex } | { readonly kind: 'sip' } | { readonly kind: 'tilt' }

type HandKeyHeld = { readonly code: string; readonly handIndex: HandIndex; heldSeconds: number; hasShownTheItem: boolean }

const shortcutByCode: Readonly<Record<string, Shortcut>> = {
  Digit1: { kind: 'hand', handIndex: 0 },
  Digit2: { kind: 'hand', handIndex: 1 },
  Digit3: { kind: 'hand', handIndex: middleHandIndex },
  Numpad1: { kind: 'hand', handIndex: 0 },
  Numpad2: { kind: 'hand', handIndex: 1 },
  Numpad3: { kind: 'hand', handIndex: middleHandIndex },
  KeyE: { kind: 'sip' },
  Space: { kind: 'tilt' },
}

export class KeyboardShortcuts {
  private readonly port: ShortcutPort
  private readonly log: RoomLog
  private handKeyHeld: HandKeyHeld | null = null

  constructor(port: ShortcutPort, log: RoomLog) {
    this.port = port
    this.log = log
  }

  keyPressed(code: string): void {
    const shortcut = shortcutByCode[code]
    if (shortcut === undefined) return
    if (shortcut.kind === 'sip') return this.port.sipped()
    if (shortcut.kind === 'tilt') return this.port.tiltPressed()
    if (this.port.isInspecting()) {
      this.log(`key ${code} closes the item shown up close`)
      return this.port.inspectionClosed()
    }
    this.handKeyHeld = { code, handIndex: shortcut.handIndex, heldSeconds: 0, hasShownTheItem: false }
  }

  keyReleased(code: string): void {
    if (shortcutByCode[code]?.kind === 'tilt') return this.port.tiltReleased()
    const held = this.handKeyHeld
    if (held === null || held.code !== code) return
    this.handKeyHeld = null
    if (held.hasShownTheItem) return
    this.log(`key ${code} taps hand ${held.handIndex}`)
    this.port.handTapped(held.handIndex)
  }

  advance(seconds: number): void {
    const held = this.handKeyHeld
    if (held === null || held.hasShownTheItem) return
    held.heldSeconds += seconds
    if (held.heldSeconds < holdSecondsThatInspectAnItem) return
    held.hasShownTheItem = true
    this.log(`key ${held.code} held ${held.heldSeconds.toFixed(1)} s shows the item in hand ${held.handIndex} up close`)
    this.port.handHeld(held.handIndex, held.heldSeconds)
  }
}
