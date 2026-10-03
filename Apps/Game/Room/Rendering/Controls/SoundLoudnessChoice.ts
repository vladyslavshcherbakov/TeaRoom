import { text } from '../../../Texts/Texts.ts'
import { soundLoudnesses, type SoundLoudness } from '../../SoundLoudness.ts'
import { choiceRow, pageElement } from '../../../../Engine/Rendering/Controls/PageControls.ts'

export type SoundLoudnessChoice = {
  readonly chosenNow: SoundLoudness
  readonly chosen: (soundLoudness: SoundLoudness) => void
}

export function soundLoudnessChoiceOnThePage(choice: SoundLoudnessChoice): HTMLElement {
  const choiceElement = pageElement('div', 'sound-choice')
  const loudnessButtons = choiceRow(soundLoudnesses, { rowClass: 'sound-choice-buttons', buttonClass: 'sound-choice-button', dress: (loudnessButton, loudness) => (loudnessButton.textContent = text(`settings.sound.${loudness}`)) }, choice.chosen)
  loudnessButtons.showTheChosen(choice.chosenNow)
  choiceElement.append(pageElement('span', 'sound-choice-label', text('settings.sound')), loudnessButtons.element)
  return choiceElement
}
