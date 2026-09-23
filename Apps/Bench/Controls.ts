export type Readout = () => string

export function section(title: string, ...children: HTMLElement[]): HTMLElement {
  const element = document.createElement('section')
  const heading = document.createElement('h2')
  heading.textContent = title
  element.append(heading, ...children)
  return element
}

export function row(...children: HTMLElement[]): HTMLElement {
  const element = document.createElement('div')
  element.className = 'row'
  element.append(...children)
  return element
}

export function button(label: string, onPress: () => void): HTMLButtonElement {
  const element = document.createElement('button')
  element.textContent = label
  element.addEventListener('click', onPress)
  return element
}

export function holdButton(label: string, onHold: () => void, onRelease: () => void): HTMLButtonElement {
  const element = document.createElement('button')
  element.textContent = label
  element.className = 'hold'
  element.addEventListener('pointerdown', (event) => {
    element.setPointerCapture(event.pointerId)
    onHold()
  })
  for (const releaseEvent of ['pointerup', 'pointercancel'] as const) element.addEventListener(releaseEvent, onRelease)
  return element
}

export function slider(minimum: number, maximum: number, initial: number, onChange: (value: number) => void): HTMLInputElement {
  const element = document.createElement('input')
  element.type = 'range'
  element.min = String(minimum)
  element.max = String(maximum)
  element.step = 'any'
  element.value = String(initial)
  element.addEventListener('input', () => onChange(Number(element.value)))
  return element
}

export function picker<Value extends string>(
  values: readonly Value[],
  onChange: (value: Value) => void,
  initial: Value | undefined = values[0],
): HTMLSelectElement {
  const element = document.createElement('select')
  for (const value of values) element.add(new Option(value, value, false, value === initial))
  element.addEventListener('change', () => onChange(element.value as Value))
  return element
}

export function readout(text: Readout, liveReadouts: Map<HTMLElement, Readout>): HTMLElement {
  const element = document.createElement('span')
  element.className = 'readout'
  liveReadouts.set(element, text)
  return element
}
