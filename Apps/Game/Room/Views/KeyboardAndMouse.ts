import type { MouseMovement } from '../Camera/FirstPersonLook.ts'
import type { RoomLog } from '../RoomNavigator.ts'

export type KeyListener = {
  readonly keyPressed: (code: string) => void
  readonly keyReleased: (code: string) => void
}

const noMovement: MouseMovement = { x: 0, y: 0 }
const largestMouseStepPixels = 150

export class KeyboardAndMouse {
  private readonly canvas: HTMLCanvasElement
  private readonly log: RoomLog
  private readonly crosshair: HTMLElement
  private readonly heldKeys = new Set<string>()
  private movement: MouseMovement = noMovement
  private wasRefused = false

  constructor(container: HTMLElement, canvas: HTMLCanvasElement, keys: KeyListener, log: RoomLog) {
    this.canvas = canvas
    this.log = log
    this.crosshair = document.createElement('div')
    this.crosshair.className = 'crosshair'
    this.crosshair.hidden = true
    container.append(this.crosshair)
    window.addEventListener('keydown', (event) => {
      this.heldKeys.add(event.code)
      if (!event.repeat) keys.keyPressed(event.code)
    })
    window.addEventListener('keyup', (event) => {
      this.heldKeys.delete(event.code)
      keys.keyReleased(event.code)
    })
    window.addEventListener('blur', () => this.heldKeys.clear())
    document.addEventListener('mousemove', (event) => {
      const isAJumpOfTheBrowser = Math.abs(event.movementX) > largestMouseStepPixels || Math.abs(event.movementY) > largestMouseStepPixels
      if (!this.isLocked || isAJumpOfTheBrowser) return
      this.movement = { x: this.movement.x + event.movementX, y: this.movement.y + event.movementY }
    })
    document.addEventListener('pointerlockchange', () => {
      this.crosshair.hidden = !this.isLocked
      this.movement = noMovement
      log(this.isLocked ? 'the mouse is caught: it turns the look, and a click acts under the crosshair' : 'the mouse is let go')
    })
    document.addEventListener('pointerlockerror', () => this.refused('the browser refused to catch it'))
  }

  get keysHeld(): ReadonlySet<string> {
    return this.heldKeys
  }

  get mayBeCaught(): boolean {
    return !this.wasRefused
  }

  get isLocked(): boolean {
    return document.pointerLockElement === this.canvas
  }

  takeTheMouseMovement(): MouseMovement {
    const movement = this.movement
    this.movement = noMovement
    return movement
  }

  catchTheMouse(): void {
    if (this.isLocked) return
    this.log('catching the mouse for the first-person look')
    Promise.resolve(this.canvas.requestPointerLock()).catch((error: unknown) => this.refused(String(error)))
  }

  letGoOfTheMouse(reason: string): void {
    if (!this.isLocked) return
    this.log(`letting go of the mouse: ${reason}`)
    document.exitPointerLock()
  }

  private refused(reason: string): void {
    if (this.wasRefused) return
    this.wasRefused = true
    this.log(`the mouse cannot be caught on this page, so a click acts where it points and the keys still walk: ${reason}`)
  }
}
