import type { Catalog } from '../Definitions/Catalog.ts'
import type { SessionState } from '../State/SessionState.ts'
import { startOrEndBrews } from './Brews.ts'
import { wipeTable } from './CleanupCommands.ts'
import type { Command } from './Command.ts'
import { noteDetail, outcomeOf, refuse, startDraft, type Draft, type Outcome } from './Draft.ts'
import { pickUp, putDown, standAt } from './KeeperCommands.ts'
import { placeOnHeater, switchHeaterOff, switchHeaterOn, takeOffHeater } from './HeatingCommands.ts'
import { scoopTea, tipSpoonInto } from './LeavesCommands.ts'
import { moveCaddyLid, moveVesselLid } from './LidCommands.ts'
import { refusalInPhase } from './PhaseRules.ts'
import { adjustPour, startPouring, stopPouring } from './PouringCommands.ts'
import { offerCup, tasteCup } from './ServingCommands.ts'
import { startFillingFromTap, stopFillingFromTap } from './TapCommands.ts'
import { beginRitual, chooseAtmosphere, finishRitual, leaveRoom } from './SessionCommands.ts'

export function applyCommand(state: SessionState, command: Command, catalog: Catalog): Outcome {
  const draft = startDraft(state, catalog)
  noteDetail(draft, `received ${JSON.stringify(command)} in phase ${state.phase}`)
  const phaseRefusal = refusalInPhase(state.phase, command.type)
  if (phaseRefusal !== null) {
    refuse(draft, command, phaseRefusal)
    return outcomeOf(draft)
  }
  carryOut(draft, command)
  startOrEndBrews(draft)
  return outcomeOf(draft)
}

function carryOut(draft: Draft, command: Command): void {
  switch (command.type) {
    case 'beginRitual':
      return beginRitual(draft, command)
    case 'chooseAtmosphere':
      return chooseAtmosphere(draft, command)
    case 'standAt':
      return standAt(draft, command)
    case 'pickUp':
      return pickUp(draft, command)
    case 'putDown':
      return putDown(draft, command)
    case 'openVesselLid':
    case 'closeVesselLid':
      return moveVesselLid(draft, command)
    case 'openCaddy':
    case 'closeCaddy':
      return moveCaddyLid(draft, command)
    case 'placeOnHeater':
      return placeOnHeater(draft, command)
    case 'takeOffHeater':
      return takeOffHeater(draft, command)
    case 'switchHeaterOn':
      return switchHeaterOn(draft, command)
    case 'switchHeaterOff':
      return switchHeaterOff(draft, command)
    case 'startPouring':
      return startPouring(draft, command)
    case 'adjustPour':
      return adjustPour(draft, command)
    case 'stopPouring':
      return stopPouring(draft, command)
    case 'startFillingFromTap':
      return startFillingFromTap(draft, command)
    case 'stopFillingFromTap':
      return stopFillingFromTap(draft, command)
    case 'scoopTea':
      return scoopTea(draft, command)
    case 'tipSpoonInto':
      return tipSpoonInto(draft, command)
    case 'tasteCup':
      return tasteCup(draft, command)
    case 'offerCup':
      return offerCup(draft, command)
    case 'wipeTable':
      return wipeTable(draft, command)
    case 'finishRitual':
      return finishRitual(draft)
    case 'leaveRoom':
      return leaveRoom(draft)
  }
}
