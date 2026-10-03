import type { HandIndex } from '../../../Shared/GameLogic/GameLogic.ts'
import { holdSecondsThatInspectAnItem } from './TouchInput.ts'
import type { AppLog } from '../../Engine/AppLog.ts'

export type KeyBindingsPort = {
  readonly isInspecting: () => boolean
  readonly handTapped: (handIndex: HandIndex) => void
  readonly handHeld: (handIndex: HandIndex, heldSeconds: number) => void
  readonly inspectionClosed: () => void
  readonly sipped: () => void
  readonly tiltPressed: () => void
  readonly tiltReleased: () => void
}

type Binding = { readonly kind: 'hand'; readonly handIndex: HandIndex } | { readonly kind: 'sip' } | { readonly kind: 'tilt' }

type HandKeyHeld = { readonly code: string; readonly handIndex: HandIndex; heldSeconds: number; hasShownTheItem: boolean }

const bindingByCode: Readonly<Record<string, Binding>> = {
  Digit1: { kind: 'hand', handIndex: 0 },
  Digit2: { kind: 'hand', handIndex: 1 },
  Numpad1: { kind: 'hand', handIndex: 0 },
  Numpad2: { kind: 'hand', handIndex: 1 },
  KeyE: { kind: 'sip' },
  Space: { kind: 'tilt' },
}

export class KeyBindings {
  private readonly port: KeyBindingsPort
  private readonly log: AppLog
  private handKeyHeld: HandKeyHeld | null = null
  private isTiltHeld = false

  constructor(port: KeyBindingsPort, log: AppLog) {
    this.port = port
    this.log = log
  }

  keyPressed(code: string): void {
    const binding = bindingByCode[code]
    if (binding === undefined) return
    if (binding.kind === 'sip') return this.port.sipped()
    if (binding.kind === 'tilt') return this.pressTheTilt()
    if (this.port.isInspecting()) {
      this.log(`key ${code} closes the item shown up close`)
      return this.port.inspectionClosed()
    }
    this.handKeyHeld = { code, handIndex: binding.handIndex, heldSeconds: 0, hasShownTheItem: false }
  }

  keyReleased(code: string): void {
    if (bindingByCode[code]?.kind === 'tilt') return this.releaseTheTilt()
    const held = this.handKeyHeld
    if (held === null || held.code !== code) return
    this.handKeyHeld = null
    if (held.hasShownTheItem) return
    this.log(`key ${code} taps hand ${held.handIndex}`)
    this.port.handTapped(held.handIndex)
  }

  everyKeyReleased(reason: string): void {
    const held = this.handKeyHeld
    this.handKeyHeld = null
    if (held !== null && !held.hasShownTheItem) this.log(`key ${held.code} is let go without tapping hand ${held.handIndex}: ${reason}`)
    if (!this.isTiltHeld) return
    this.log(`the tilt key is let go: ${reason}`)
    this.releaseTheTilt()
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

  private pressTheTilt(): void {
    this.isTiltHeld = true
    this.port.tiltPressed()
  }

  private releaseTheTilt(): void {
    this.isTiltHeld = false
    this.port.tiltReleased()
  }
}
