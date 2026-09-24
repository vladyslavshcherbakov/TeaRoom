import { godsVerdictOnSpill } from '../Judgement/GodsMood.ts'
import { isEmpty } from '../Physics/Liquid.ts'
import type { VesselState } from '../State/SessionState.ts'
import type { CommandOfType } from './Command.ts'
import { describeLiquid, letTheGodsJudge, note, noteDetail, refuse, vesselDefinitionOf, type Draft } from './Draft.ts'
import { isWithinReach } from './Reach.ts'
import type { RefusalReason } from './RitualEvent.ts'

export function startPouring(draft: Draft, command: CommandOfType<'startPouring'>): void {
  const pourInProgress = draft.state.pour
  if (pourInProgress !== null) {
    return refuse(draft, command, 'alreadyPouring', `pouring ${pourInProgress.sourceId} into ${pourInProgress.targetId ?? 'the table'}`)
  }
  const source = draft.state.vessels[command.sourceId]
  const target = command.targetId === null ? null : draft.state.vessels[command.targetId]
  if (source === undefined || target === undefined) return refuse(draft, command, 'unknownVessel')
  const refusal = refusalToPour(draft, source, target)
  if (refusal !== null) return refuse(draft, command, refusal, describeLiquid(source))
  draft.state.pour = {
    sourceId: source.id,
    targetId: target?.id ?? null,
    tiltDegrees: 0,
    streamOnTargetFraction: 1,
    pouredMl: 0,
    spilledMl: 0,
    hasOverflowed: false,
    hasRunDry: false,
  }
  note(draft, `pour started from ${describeLiquid(source)} into ${target === null ? 'the table' : describeLiquid(target)}`)
  draft.events.push({ type: 'pourStarted', sourceId: source.id, targetId: target?.id ?? null })
}

export function adjustPour(draft: Draft, command: CommandOfType<'adjustPour'>): void {
  if (draft.state.pour === null) return refuse(draft, command, 'notPouring')
  draft.state.pour.tiltDegrees = command.tiltDegrees
  draft.state.pour.streamOnTargetFraction = command.streamOnTargetFraction
  noteDetail(draft, `pour tilted to ${command.tiltDegrees.toFixed(1)}°, ${(command.streamOnTargetFraction * 100).toFixed(0)}% on target`)
}

export function stopPouring(draft: Draft, command: CommandOfType<'stopPouring'>): void {
  if (draft.state.pour === null) return refuse(draft, command, 'notPouring')
  finishPour(draft)
}

export function finishPour(draft: Draft): void {
  const pour = draft.state.pour
  if (pour === null) return
  draft.state.pour = null
  note(
    draft,
    `pour from ${pour.sourceId} into ${pour.targetId ?? 'the table'} finished: ` +
      `${pour.pouredMl.toFixed(1)} ml landed, ${pour.spilledMl.toFixed(1)} ml spilled, table ${draft.state.tableWetMl.toFixed(1)} ml wet`,
  )
  draft.events.push({
    type: 'pourFinished',
    sourceId: pour.sourceId,
    targetId: pour.targetId,
    pouredMl: pour.pouredMl,
    spilledMl: pour.spilledMl,
  })
  letTheGodsJudge(draft, godsVerdictOnSpill(pour.spilledMl))
}

function refusalToPour(draft: Draft, source: VesselState, target: VesselState | null): RefusalReason | null {
  if (source.id === target?.id) return 'cannotPourIntoItself'
  const vesselIdUnderTheTap = draft.state.filling?.vesselId
  if (vesselIdUnderTheTap !== undefined && (vesselIdUnderTheTap === source.id || vesselIdUnderTheTap === target?.id)) return 'vesselIsBeingFilled'
  if (!isWithinReach(draft, source.location)) return 'outOfReach'
  if (target !== null && !isWithinReach(draft, target.location)) return 'outOfReach'
  if (target === null && draft.state.keeper.placeId === null) return 'outOfReach'
  if (draft.state.heater.vesselIdOnTop === source.id) return 'vesselIsOnTheHeater'
  if (isEmpty(source.liquid)) return 'sourceIsEmpty'
  if (vesselDefinitionOf(draft, source).lid?.mustBeOpenToPour === true && !source.isLidOpen) return 'lidClosed'
  if (target === null) return null
  if (vesselDefinitionOf(draft, target).lid?.mustBeOpenToFill === true && !target.isLidOpen) return 'lidClosed'
  return null
}
