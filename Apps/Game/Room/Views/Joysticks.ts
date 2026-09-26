import type { StickDeflection } from '../Camera/FirstPersonLook.ts'

type Stick = {
  readonly pad: HTMLElement
  readonly knob: HTMLElement
  deflection: StickDeflection
}

const knobTravelShareOfThePad = 0.35
const restingDeflection: StickDeflection = { right: 0, up: 0 }

export class Joysticks {
  private readonly leftStick: Stick
  private readonly rightStick: Stick

  constructor(container: HTMLElement) {
    this.leftStick = newStick(container, 'stick left')
    this.rightStick = newStick(container, 'stick right')
  }

  get left(): StickDeflection {
    return this.leftStick.deflection
  }

  get right(): StickDeflection {
    return this.rightStick.deflection
  }

  get screenHeightShareTakenFromTheBottom(): number {
    const shownPads = [this.leftStick.pad, this.rightStick.pad].filter((pad) => !pad.hidden)
    const pixelsFromTheBottom = shownPads.map((pad) => window.innerHeight - pad.getBoundingClientRect().top)
    return Math.max(0, ...pixelsFromTheBottom) / window.innerHeight
  }

  show(isTheLeftShown: boolean, isTheRightShown: boolean): void {
    showOrHide(this.leftStick, isTheLeftShown)
    showOrHide(this.rightStick, isTheRightShown)
  }
}

function showOrHide(stick: Stick, isShown: boolean): void {
  if (stick.pad.hidden === !isShown) return
  stick.pad.hidden = !isShown
  if (!isShown) letGoOf(stick)
}

function newStick(container: HTMLElement, className: string): Stick {
  const pad = document.createElement('div')
  pad.className = className
  pad.hidden = true
  const knob = document.createElement('div')
  knob.className = 'stick-knob'
  pad.append(knob)
  container.append(pad)
  const stick: Stick = { pad, knob, deflection: restingDeflection }
  pad.addEventListener('pointerdown', (event) => {
    pad.setPointerCapture(event.pointerId)
    pushTo(stick, event.clientX, event.clientY)
  })
  pad.addEventListener('pointermove', (event) => {
    if (pad.hasPointerCapture(event.pointerId)) pushTo(stick, event.clientX, event.clientY)
  })
  for (const ending of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) pad.addEventListener(ending, () => letGoOf(stick))
  return stick
}

function pushTo(stick: Stick, clientX: number, clientY: number): void {
  const bounds = stick.pad.getBoundingClientRect()
  const radius = bounds.width / 2
  const right = (clientX - (bounds.left + radius)) / radius
  const up = (bounds.top + radius - clientY) / radius
  const length = Math.hypot(right, up)
  const scale = length > 1 ? 1 / length : 1
  stick.deflection = { right: right * scale, up: up * scale }
  const travel = bounds.width * knobTravelShareOfThePad
  stick.knob.style.transform = `translate(${stick.deflection.right * travel}px, ${-stick.deflection.up * travel}px)`
}

function letGoOf(stick: Stick): void {
  stick.deflection = restingDeflection
  stick.knob.style.transform = ''
}
