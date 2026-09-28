import { figurineIds, type FigurineId } from '../../../Shared/Content/Rooms.ts'
import type { OfferingResponse } from '../../../Shared/GameLogic/GameLogic.ts'
import { sipText } from '../Presentation/SipTexts.ts'
import { phraseLineAtTurn, text, textWith, type PhraseKey } from '../Texts/Texts.ts'
import type { AppLog } from '../../Engine/AppLog.ts'
import type { PlayerBark } from './PlayerBarks.ts'

const millilitresInALitre = 1000

export class RoomTexts {
  private readonly voiceSeed: number
  private readonly log: AppLog

  constructor(voiceSeed: number, log: AppLog) {
    this.voiceSeed = voiceSeed
    this.log = log
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
      case 'offering':
        return event?.type === 'figurineAcceptedTea' ? this.offeringLines(event.figurineId, event.response) : []
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

  private offeringLines(figurineId: string, response: OfferingResponse): readonly string[] {
    if (!isAFigurineOfTheRoom(figurineId)) {
      this.log(`the offering to ${figurineId} gets no caption: no figurine of the room has that id, so it has no name`)
      return []
    }
    return [textWith(`offering.${response}`, { figurine: text(`figurine.${figurineId}`) })]
  }
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

function isAFigurineOfTheRoom(id: string): id is FigurineId {
  return (figurineIds as readonly string[]).includes(id)
}
