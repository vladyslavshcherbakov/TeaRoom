import type { TeahouseCommand } from '../../../../Shared/GameLogic/GameLogic.ts'
import type { Choice, Prompt, SpokenBeat, Whisper } from '../../Presentation/Moment.ts'
import type { PanelViewState } from '../TeahouseViewState.ts'

export type PanelEvents = {
  readonly nextTapped: () => void
  readonly commandChosen: (command: TeahouseCommand) => void
  readonly holdStarted: () => void
  readonly holdReleased: () => void
  readonly holdInterrupted: () => void
  readonly startOverTapped: () => void
}

const emphasised = /(\*[^*]+\*)/

export class PanelView {
  private readonly events: PanelEvents
  private shownKey = ''

  readonly element = document.createElement('div')

  constructor(events: PanelEvents) {
    this.events = events
    this.element.className = 'panel'
  }

  show(panel: PanelViewState): void {
    if (panel.key === this.shownKey) return
    this.shownKey = panel.key
    const parts = [...(panel.beat === null ? [] : [this.beat(panel.beat)]), ...(panel.prompt === null ? [this.button(panel.nextLabel, 'next', () => this.events.nextTapped())] : this.prompt(panel.prompt))]
    this.element.replaceChildren(...parts)
    this.element.scrollTop = 0
  }

  private beat(beat: SpokenBeat): HTMLElement {
    const block = element('div', beat.speaker === null ? 'beat narrated' : 'beat')
    if (beat.speaker !== null) block.append(element('div', 'speaker', beat.speaker))
    const text = element('p', 'line')
    for (const piece of beat.text.split(emphasised)) {
      if (piece === '') continue
      text.append(emphasised.test(piece) ? element('em', '', piece.slice(1, -1)) : document.createTextNode(piece))
    }
    block.append(text)
    return block
  }

  private prompt(prompt: Prompt): readonly HTMLElement[] {
    switch (prompt.kind) {
      case 'continue':
        return [this.button(prompt.label, 'continue', () => this.events.commandChosen(prompt.command))]
      case 'startOver':
        return [this.button(prompt.label, 'continue', () => this.events.startOverTapped())]
      case 'hold':
        return [this.holdButton(prompt.label)]
      case 'choices':
        return [...(prompt.whisper === null ? [] : [whisperBlock(prompt.whisper)]), ...(prompt.note === null ? [] : [element('div', 'note', prompt.note)]), ...prompt.choices.map((choice) => this.choiceButton(choice))]
    }
  }

  private choiceButton(choice: Choice): HTMLElement {
    const button = this.button('', 'choice', () => this.events.commandChosen(choice.command))
    if (choice.label !== null) button.append(element('span', 'kind', choice.label))
    if (choice.mark !== null) button.append(element('span', 'mark', choice.mark))
    button.append(element('span', 'said', choice.text))
    if (choice.detail !== null) button.append(element('span', 'detail', choice.detail))
    return button
  }

  private holdButton(label: string): HTMLElement {
    const button = element('button', 'hold', label)
    button.addEventListener('pointerdown', (event) => {
      button.setPointerCapture(event.pointerId)
      button.classList.add('held')
      this.events.holdStarted()
    })
    button.addEventListener('pointerup', () => this.events.holdReleased())
    button.addEventListener('pointercancel', () => {
      button.classList.remove('held')
      this.events.holdInterrupted()
    })
    button.addEventListener('contextmenu', (event) => event.preventDefault())
    return button
  }

  private button(label: string, className: string, tapped: () => void): HTMLElement {
    const button = element('button', className, label)
    button.addEventListener('click', tapped)
    return button
  }
}

function whisperBlock(whisper: Whisper): HTMLElement {
  const block = element('div', 'whisper')
  block.append(element('span', 'pet-name', whisper.petName), element('span', 'whispered', whisper.text))
  return block
}

function element<Name extends keyof HTMLElementTagNameMap>(name: Name, className: string, text = ''): HTMLElementTagNameMap[Name] {
  const created = document.createElement(name)
  if (className !== '') created.className = className
  if (text !== '') created.textContent = text
  return created
}
