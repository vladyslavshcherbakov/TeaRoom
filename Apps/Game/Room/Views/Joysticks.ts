import type { StickDeflection } from '../Camera/FirstPersonLook.ts'

type Stick = {
  readonly pad: HTMLElement
  readonly knob: HTMLElement
  deflection: StickDeflection
}

const knobTravelShareOfThePad = 0.35
const restingDeflection: StickDeflection = { right: 0, up: 0 }

export class Joysticks {
  private readonly walkStick: Stick
  private readonly lookStick: Stick

  constructor(container: HTMLElement) {
    this.walkStick = newStick(container, 'stick walk')
    this.lookStick = newStick(container, 'stick look')
  }

  get walk(): StickDeflection {
    return this.walkStick.deflection
  }

  get look(): StickDeflection {
    return this.lookStick.deflection
  }

  show(areShown: boolean): void {
    for (const stick of [this.walkStick, this.lookStick]) {
      if (stick.pad.hidden === !areShown) continue
      stick.pad.hidden = !areShown
      if (!areShown) letGoOf(stick)
    }
  }
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
