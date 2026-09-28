import { definitionIn } from '../../Engine/Catalog.ts'
import { isEmpty } from '../Chemistry/Liquid.ts'
import type { TeaStock } from '../Definitions/RoomDefinition.ts'
import type { Draft } from './Draft.ts'
import { note } from '../../Engine/Draft.ts'
import { finishPour } from './PouringCommands.ts'
import type { AbsenceChanges, LivedAbsence } from '../../Engine/Session.ts'
import { dryLeaves, hasAnyTeaSteeped, totalLeafGrams } from '../Chemistry/Brewing.ts'
import { hoursSinceSunriseOf, timeOfDayAfter } from '../Judgement/TimeOfDayJudgement.ts'
import { clampedToShare } from '../../Engine/ClampedToShare.ts'
import { spoonItemId } from '../State/WhereItemsAre.ts'
import { emptyTheVessel } from './VesselLiquid.ts'
import { moveItem } from './MoveItem.ts'

export const absenceStepSeconds = 1
export const longestLivedAbsenceSeconds = 12 * 60 * 60

type CaddyRefill = 'wasEmpty' | 'wasToppedUp'

export function whatTheAbsenceChanges(shareThroughTheNextTimeOfDay: number): AbsenceChanges<Draft> {
  return {
    beforeLiving: stopThePour,
    afterLiving: (draft, absence) => {
      noteTheAbsence(draft, absence)
      restockTheHouse(draft)
      moveOnToTheNextTimeOfDay(draft, shareThroughTheNextTimeOfDay)
    },
  }
}

function stopThePour(draft: Draft): void {
  if (draft.state.pour === null) return
  note(draft, 'the pour stops, because the player left in the middle of it')
  finishPour(draft)
}

function moveOnToTheNextTimeOfDay(draft: Draft, shareThroughTheNextTimeOfDay: number): void {
  const before = draft.state.atmosphere
  const timeOfDay = timeOfDayAfter(before.timeOfDay, definitionIn(draft.catalog, 'rooms', draft.state.roomId).timesOfDay)
  draft.state.atmosphere = { ...before, timeOfDay, shareThroughTheTimeOfDay: clampedToShare(shareThroughTheNextTimeOfDay) }
  note(draft, `the day moves on from ${before.timeOfDay} to ${timeOfDay} on return, ${hoursSinceSunriseOf(draft.state.atmosphere).toFixed(1)} hours after sunrise`)
  draft.events.push({ type: 'atmosphereChanged', atmosphere: draft.state.atmosphere })
}

function noteTheAbsence(draft: Draft, { awaySeconds, livedSteps, stepSeconds, longestLivedSeconds, eventTypesWhileAway }: LivedAbsence): void {
  const whatHappened = eventTypesWhileAway.length === 0 ? 'nothing happened' : `${eventTypesWhileAway.join(', ')} happened unseen`
  const cut = awaySeconds > longestLivedSeconds ? `, only the first ${longestLivedSeconds} s of it lived, since by then the room has settled` : ''
  note(draft, `the player returns after ${awaySeconds.toFixed(0)} s away${cut}: the room lived ${livedSteps} steps of ${stepSeconds} s, and ${whatHappened}`)
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
  moveItem(draft, spoonItemId, { kind: 'onSurface', spot })
  spoon.charring = 0
  spoon.gramsByTeaId = {}
  note(draft, `a new spoon waits at its place on the ${spot.placeId}, since the last one crumbled to ash`)
  return true
}

function refillTheCaddy(draft: Draft, caddyId: string, teaStock: TeaStock): CaddyRefill | null {
  const caddy = draft.state.vessels[caddyId]
  if (caddy === undefined) {
    note(draft, `the caddy ${caddyId} is not refilled on return: the room has no such vessel`)
    return null
  }
  const gramsBefore = caddy.leaves === null ? 0 : totalLeafGrams(caddy.leaves.gramsByTeaId)
  const heldWater = !isEmpty(caddy.liquid)
  const isFullAndDry = !heldWater && caddy.leaves !== null && (caddy.leaves.gramsByTeaId[teaStock.teaId] ?? 0) >= teaStock.grams && !hasAnyTeaSteeped(caddy.leaves)
  if (isFullAndDry) return null
  const pouredOut = heldWater ? `, after pouring out ${caddy.liquid.volumeMl.toFixed(1)} ml and the wet leaves in it` : ''
  emptyTheVessel(caddy)
  caddy.leaves = dryLeaves({ [teaStock.teaId]: teaStock.grams })
  note(draft, `the caddy ${caddy.id} is refilled where it stands, from ${gramsBefore.toFixed(1)} g to ${teaStock.grams} g of ${teaStock.teaId}${pouredOut}`)
  return gramsBefore === 0 ? 'wasEmpty' : 'wasToppedUp'
}
