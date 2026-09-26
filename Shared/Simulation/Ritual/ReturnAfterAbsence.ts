import { definitionIn, type Catalog } from '../Definitions/Catalog.ts'
import { isEmpty, water } from '../Physics/Liquid.ts'
import type { TeaStock } from '../Definitions/RoomDefinition.ts'
import type { SessionState } from '../State/SessionState.ts'
import { note, outcomeOf, startDraft, type Draft, type Outcome } from './Draft.ts'
import { finishPour } from './PouringCommands.ts'
import { stepTheWorld } from './SimulationStep.ts'
import { reportTheWorld } from './WorldReport.ts'
import { dryLeaves } from '../Physics/Brewing.ts'
import { hoursSinceSunriseOf, timeOfDayAfter } from '../Judgement/TimeOfDayJudgement.ts'
import { clampedToShare } from '../Physics/ClampedToShare.ts'

export const absenceStepSeconds = 1
export const longestLivedAbsenceSeconds = 12 * 60 * 60

type CaddyRefill = 'wasEmpty' | 'wasToppedUp'

export function returnAfterAbsence(state: SessionState, awaySeconds: number, shareThroughTheNextTimeOfDay: number, catalog: Catalog): Outcome {
  const draft = startDraft(state, catalog)
  if (draft.state.pour !== null) {
    note(draft, 'the pour stops, because the keeper left in the middle of it')
    finishPour(draft)
  }
  liveThroughTheAbsence(draft, awaySeconds)
  restockTheHouse(draft)
  moveOnToTheNextTimeOfDay(draft, shareThroughTheNextTimeOfDay)
  reportTheWorld(draft, 'the room on return')
  return outcomeOf(draft)
}

function moveOnToTheNextTimeOfDay(draft: Draft, shareThroughTheNextTimeOfDay: number): void {
  const before = draft.state.atmosphere
  const timeOfDay = timeOfDayAfter(before.timeOfDay, definitionIn(draft.catalog, 'rooms', draft.state.roomId).timesOfDay)
  draft.state.atmosphere = { ...before, timeOfDay, shareThroughTheTimeOfDay: clampedToShare(shareThroughTheNextTimeOfDay) }
  note(draft, `the day moves on from ${before.timeOfDay} to ${timeOfDay} on return, ${hoursSinceSunriseOf(draft.state.atmosphere).toFixed(1)} hours after sunrise`)
  draft.events.push({ type: 'atmosphereChanged', atmosphere: draft.state.atmosphere })
}

function liveThroughTheAbsence(draft: Draft, awaySeconds: number): void {
  const livedSeconds = Math.min(Math.max(awaySeconds, 0), longestLivedAbsenceSeconds)
  const steps = Math.floor(livedSeconds / absenceStepSeconds)
  const eventsBeforeTheAbsence = draft.events.length
  for (let step = 0; step < steps; step += 1) stepTheWorld(draft, absenceStepSeconds)
  const eventsWhileAway = draft.events.splice(eventsBeforeTheAbsence)
  const whatHappened = eventsWhileAway.length === 0 ? 'nothing happened' : `${eventsWhileAway.map((event) => event.type).join(', ')} happened unseen`
  const cut = awaySeconds > longestLivedAbsenceSeconds ? `, only the first ${longestLivedAbsenceSeconds} s of it lived, since by then the room has settled` : ''
  note(draft, `the keeper returns after ${awaySeconds.toFixed(0)} s away${cut}: the room lived ${steps} steps of ${absenceStepSeconds} s, and ${whatHappened}`)
}

function restockTheHouse(draft: Draft): void {
  const spoonReturned = returnTheSpoon(draft)
  const caddyRefills = definitionIn(draft.catalog, 'rooms', draft.state.roomId).vessels.flatMap((vessel) => (vessel.teaStock === null ? [] : [refillTheCaddy(draft, vessel.id, vessel.teaStock)]))
  const wasACaddyRefilled = caddyRefills.some((refill) => refill !== null)
  if (!spoonReturned && !wasACaddyRefilled) return note(draft, 'nothing to restock on return: the spoon is in the house and every caddy is full and dry')
  draft.events.push({ type: 'houseRestocked', spoonReturned, wasACaddyRefilled, wasACaddyEmpty: caddyRefills.includes('wasEmpty') })
}

function returnTheSpoon(draft: Draft): boolean {
  const spoon = draft.state.spoon
  if (spoon.location.kind !== 'gone') return false
  const spot = definitionIn(draft.catalog, 'rooms', draft.state.roomId).spoonStartsAt
  spoon.location = { kind: 'onSurface', spot }
  spoon.charring = 0
  spoon.grams = 0
  spoon.teaId = null
  note(draft, `a new spoon waits at its place on the ${spot.placeId}, since the last one crumbled to ash`)
  return true
}

function refillTheCaddy(draft: Draft, caddyId: string, teaStock: TeaStock): CaddyRefill | null {
  const caddy = draft.state.vessels[caddyId]
  if (caddy === undefined) {
    note(draft, `the caddy ${caddyId} is not refilled on return: the room has no such vessel`)
    return null
  }
  const room = definitionIn(draft.catalog, 'rooms', draft.state.roomId)
  const gramsBefore = caddy.leaves?.grams ?? 0
  const heldWater = !isEmpty(caddy.liquid)
  const isFullAndDry = !heldWater && caddy.leaves !== null && caddy.leaves.teaId === teaStock.teaId && gramsBefore >= teaStock.grams && caddy.leaves.steepedSeconds === 0
  if (isFullAndDry) return null
  const pouredOut = heldWater ? `, after pouring out ${caddy.liquid.volumeMl.toFixed(1)} ml and the wet leaves in it` : ''
  caddy.liquid = water(0, room.ambientTemperatureC)
  caddy.leaves = dryLeaves(teaStock.teaId, teaStock.grams)
  note(draft, `the caddy ${caddy.id} is refilled where it stands, from ${gramsBefore.toFixed(1)} g to ${teaStock.grams} g of ${teaStock.teaId}${pouredOut}`)
  return gramsBefore === 0 ? 'wasEmpty' : 'wasToppedUp'
}
