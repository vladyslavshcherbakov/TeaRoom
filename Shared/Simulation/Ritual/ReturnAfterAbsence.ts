import { definitionIn, type Catalog } from '../Definitions/Catalog.ts'
import { isEmpty, water } from '../Physics/Liquid.ts'
import type { SessionState, VesselState } from '../State/SessionState.ts'
import { note, outcomeOf, startDraft, type Draft, type Outcome } from './Draft.ts'
import { finishPour } from './PouringCommands.ts'
import { caddyItemId } from './Reach.ts'
import { stepTheWorld } from './SimulationStep.ts'
import { reportTheWorld } from './WorldReport.ts'
import { dryLeaves } from '../Physics/Brewing.ts'

export const absenceStepSeconds = 1
export const longestLivedAbsenceSeconds = 12 * 60 * 60

type CaddyRefill = 'wasEmpty' | 'wasToppedUp'

export function returnAfterAbsence(state: SessionState, awaySeconds: number, catalog: Catalog): Outcome {
  const draft = startDraft(state, catalog)
  if (draft.state.pour !== null) {
    note(draft, 'the pour stops, because the keeper left in the middle of it')
    finishPour(draft)
  }
  liveThroughTheAbsence(draft, awaySeconds)
  restockTheHouse(draft)
  reportTheWorld(draft, 'the room on return')
  return outcomeOf(draft)
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
  const caddy = draft.state.vessels[caddyItemId]
  const caddyRefill = caddy === undefined ? null : refillTheCaddy(draft, caddy)
  if (!spoonReturned && caddyRefill === null) return note(draft, 'nothing to restock on return: the spoon is in the house and the caddy is full and dry')
  draft.events.push({ type: 'houseRestocked', spoonReturned, caddyWasRefilled: caddyRefill !== null, caddyWasEmpty: caddyRefill === 'wasEmpty' })
}

function returnTheSpoon(draft: Draft): boolean {
  const spoon = draft.state.spoon
  if (spoon.location.kind !== 'gone') return false
  const spot = definitionIn(draft.catalog, 'rooms', draft.state.roomId).spoonStartsAt
  spoon.location = { kind: 'onSurface', spot }
  spoon.charring = 0
  spoon.grams = 0
  note(draft, `a new spoon waits at its place on the ${spot.placeId}, since the last one crumbled to ash`)
  return true
}

function refillTheCaddy(draft: Draft, caddy: VesselState): CaddyRefill | null {
  const teaId = draft.state.teaId
  if (teaId === null) {
    note(draft, 'the caddy is not refilled on return: no tea was chosen yet')
    return null
  }
  const room = definitionIn(draft.catalog, 'rooms', draft.state.roomId)
  const gramsBefore = caddy.leaves?.grams ?? 0
  const heldWater = !isEmpty(caddy.liquid)
  const isFullAndDry = !heldWater && caddy.leaves !== null && caddy.leaves.teaId === teaId && gramsBefore >= room.caddyGrams && caddy.leaves.steepedSeconds === 0
  if (isFullAndDry) return null
  const pouredOut = heldWater ? `, after pouring out ${caddy.liquid.volumeMl.toFixed(1)} ml and the wet leaves in it` : ''
  caddy.liquid = water(0, room.ambientTemperatureC)
  caddy.leaves = dryLeaves(teaId, room.caddyGrams)
  note(draft, `the caddy is refilled where it stands, from ${gramsBefore.toFixed(1)} g to ${room.caddyGrams} g of ${teaId}${pouredOut}`)
  return gramsBefore === 0 ? 'wasEmpty' : 'wasToppedUp'
}
