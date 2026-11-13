import type { CommandBook } from '../../Engine/Commands.ts'
import { chooseLeaf, holdTheSteep, pauseTheSteep, pourTheSteep, serveIn, startBrewing, takeTheKettleOff } from './BrewingCommands.ts'
import { feed, openTheDoor, seeTheGuestOff, waitForTheNextEvening } from './EveningCommands.ts'
import { reply } from './TalkingCommands.ts'
import type { TeahouseCommand } from './TeahouseCommands.ts'
import type { TeahouseDraft } from './TeahouseDraft.ts'

export const teahouseCommandBook: CommandBook<TeahouseDraft, TeahouseCommand> = {
  openTheDoor,
  startBrewing,
  chooseLeaf,
  takeTheKettleOff,
  holdTheSteep,
  pauseTheSteep,
  pourTheSteep,
  serveIn,
  reply,
  seeTheGuestOff,
  feed,
  waitForTheNextEvening,
}
