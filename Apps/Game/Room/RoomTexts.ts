import { sipText } from '../Presentation/SipTexts.ts'
import { phraseLineAtTurn, text, textWith, type PhraseKey } from '../Texts/Texts.ts'
import type { ActionLabel } from './ActionMenu.ts'
import type { PlayerBark } from './PlayerBarks.ts'

const millilitresInALitre = 1000

export class RoomTexts {
  private readonly voiceSeed: number

  constructor(voiceSeed: number) {
    this.voiceSeed = voiceSeed
  }

  linesOf(barks: readonly PlayerBark[]): readonly string[] {
    return barks.flatMap((bark) => this.linesOfABark(bark))
  }

  lastWordsLine(): string {
    return phraseLineAtTurn('lastWords', this.voiceSeed, 1)
  }

  obituaryLine(): string {
    return phraseLineAtTurn('obituary', this.voiceSeed, 1)
  }

  private linesOfABark(bark: PlayerBark): readonly string[] {
    const event = bark.fact.kind === 'teaEvent' ? bark.fact.event : null
    switch (bark.kind) {
      case 'whyPouring':
        return [text('aim.why')]
      case 'noRoomToPutDown':
        return [text('room.noRoom')]
      case 'sip':
        return event?.type === 'teaTasted' ? [sipText(event.verdict, event.cupHeldLeaves, this.voiceSeed)] : []
      case 'heaterRanLong':
        return event?.type === 'heaterSwitchedOff' ? [this.lineOnTurn(bark.kind, bark.timesMade, { kilowattHours: kilowattHoursText(event.kilowattHoursWasted) })] : []
      case 'tapRanLong':
        return event?.type === 'tapTurnedOff' ? [this.lineOnTurn(bark.kind, bark.timesMade, { litres: litresText(event.drainedMl) })] : []
      case 'spoonAndCaddyReturned':
      case 'spoonReturned':
      case 'emptyCaddyRefilled':
        return [this.lineOnTurn(bark.kind, 1, {})]
      case 'sillIsTheRoomsOwn':
      case 'bowlKeptOffTheHeater':
      case 'caddyKeptOffTheHeater':
      case 'handsFull':
      case 'handsFullOfBowls':
      case 'heaterTester':
      case 'everythingOnTheShelf':
      case 'spill':
      case 'tooHotToHold':
      case 'smoulderingClothTaken':
      case 'spoonCrumbled':
      case 'caddyWashedOut':
      case 'burntClothWashed':
        return [this.lineOnTurn(bark.kind, bark.timesMade, {})]
    }
  }

  private lineOnTurn(phrase: PhraseKey, turn: number, values: Readonly<Record<string, string>>): string {
    return phraseLineAtTurn(phrase, this.voiceSeed, turn, values)
  }

}

export function actionText(label: ActionLabel): string {
  return textWith(`action.${label.kind}`, { item: text(`item.${label.item}`), target: label.target === null ? '' : text(`item.${label.target}`) })
}

export function startOverNote(areAchievementsShown: boolean): string {
  return text(areAchievementsShown ? 'visit.startOverNote' : 'visit.startOverNoteWithoutAchievements')
}

function litresText(drainedMl: number): string {
  return String(Number((drainedMl / millilitresInALitre).toFixed(1)))
}

function kilowattHoursText(kilowattHoursUsed: number): string {
  return String(Number(kilowattHoursUsed.toFixed(2)))
}
