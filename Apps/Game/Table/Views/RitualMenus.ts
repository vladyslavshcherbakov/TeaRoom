import type Phaser from 'phaser'
import type { TimeOfDay } from '../../../../Shared/Simulation/Definitions/Atmosphere.ts'
import type { RoomDefinition } from '../../../../Shared/Simulation/Definitions/RoomDefinition.ts'
import type { Phase } from '../../../../Shared/Simulation/State/SessionState.ts'
import { finishButton, sceneHeight, sceneWidth } from '../TableLayout.ts'
import { teaName, timeOfDayName } from '../TableTexts.ts'
import { palette } from './Palette.ts'
import { textButton } from './TextButton.ts'

export type MenuChoices = {
  readonly beginRitual: (teaId: string, timeOfDay: TimeOfDay) => void
  readonly finishRitual: () => void
  readonly leaveRoom: () => void
  readonly startAgain: () => void
}

const chosenMarker = '• '

export class RitualMenus {
  private readonly scene: Phaser.Scene
  private readonly choices: MenuChoices
  private shownPhase: Phase | null = null
  private isRestPromptDismissed = false
  private readonly shownObjects: Phaser.GameObjects.GameObject[] = []

  constructor(scene: Phaser.Scene, choices: MenuChoices) {
    this.scene = scene
    this.choices = choices
  }

  showFor(phase: Phase, room: RoomDefinition, teaIds: readonly string[]): void {
    if (phase === this.shownPhase) return
    this.shownPhase = phase
    this.isRestPromptDismissed = false
    this.clear()
    switch (phase) {
      case 'settingUp':
        return this.showSetup(room, teaIds)
      case 'ritual':
        this.keep(textButton(this.scene, finishButton.x, finishButton.y, 'Finish', this.choices.finishRitual))
        return
      case 'resting':
        return this.showRestPrompt()
      case 'ended':
        return this.showFarewell()
    }
  }

  private showSetup(room: RoomDefinition, teaIds: readonly string[]): void {
    let teaId = teaIds[0] ?? ''
    let timeOfDay = room.timesOfDay[0] ?? 'sunset'
    this.keep(this.scene.add.rectangle(sceneWidth / 2, sceneHeight / 2, sceneWidth, sceneHeight, 0x000000, 0.55).setDepth(35).setInteractive())
    this.keep(this.label(sceneWidth / 2, 250, 'Which tea today?'))
    const teaLabels = teaIds.map(teaName)
    const teaButtons = teaIds.map((id, index) =>
      this.keep(textButton(this.scene, sceneWidth / 2, 300 + index * 50, teaLabels[index] ?? id, () => {
        teaId = id
        markChosen(teaButtons, index, teaLabels)
      })),
    )
    markChosen(teaButtons, 0, teaLabels)
    this.keep(this.label(sceneWidth / 2, 470, 'When?'))
    const timeLabels = room.timesOfDay.map(timeOfDayName)
    const timeButtons = room.timesOfDay.map((time, index) =>
      this.keep(textButton(this.scene, 85 + index * 110, 520, timeLabels[index] ?? time, () => {
        timeOfDay = time
        markChosen(timeButtons, index, timeLabels)
      })),
    )
    markChosen(timeButtons, 0, timeLabels)
    this.keep(textButton(this.scene, sceneWidth / 2, 620, 'Begin', () => this.choices.beginRitual(teaId, timeOfDay)))
  }

  private showRestPrompt(): void {
    if (this.isRestPromptDismissed) return
    this.keep(this.label(sceneWidth / 2, 330, 'The tea is ready.'))
    this.keep(textButton(this.scene, sceneWidth / 2 - 70, 390, 'Stay', () => this.stay()))
    this.keep(textButton(this.scene, sceneWidth / 2 + 70, 390, 'Leave', this.choices.leaveRoom))
  }

  private stay(): void {
    this.isRestPromptDismissed = true
    this.clear()
    this.keep(textButton(this.scene, finishButton.x, finishButton.y, '…', () => {
      this.isRestPromptDismissed = false
      this.clear()
      this.showRestPrompt()
    }).setAlpha(0.5))
  }

  private showFarewell(): void {
    this.keep(this.scene.add.rectangle(sceneWidth / 2, sceneHeight / 2, sceneWidth, sceneHeight, 0x000000, 0.6).setDepth(35).setInteractive())
    this.keep(this.label(sceneWidth / 2, 360, 'Come back any time.'))
    this.keep(textButton(this.scene, sceneWidth / 2, 430, 'Start again', this.choices.startAgain))
  }

  private label(x: number, y: number, text: string): Phaser.GameObjects.Text {
    return this.scene.add.text(x, y, text, { color: palette.text, fontSize: '20px' }).setOrigin(0.5).setDepth(40)
  }

  private keep<Shown extends Phaser.GameObjects.GameObject>(shown: Shown): Shown {
    this.shownObjects.push(shown)
    return shown
  }

  private clear(): void {
    for (const shown of this.shownObjects.splice(0)) shown.destroy()
  }
}

function markChosen(buttons: readonly Phaser.GameObjects.Text[], chosenIndex: number, labels: readonly string[]): void {
  buttons.forEach((button, index) => button.setText(`${index === chosenIndex ? chosenMarker : ''}${labels[index] ?? ''}`))
}
