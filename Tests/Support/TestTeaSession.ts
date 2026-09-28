import type { Catalog } from '../../Shared/GameLogic/Definitions/Catalog.ts'
import { totalLeafGrams } from '../../Shared/GameLogic/Chemistry/Brewing.ts'
import type { Command } from '../../Shared/GameLogic/Simulation/Command.ts'
import type { TeaEvent } from '../../Shared/GameLogic/Simulation/TeaEvent.ts'
import { TeaSession } from '../../Shared/GameLogic/Simulation/TeaSession.ts'
import { sessionStateVersion } from '../../Shared/GameLogic/State/FittedSavedState.ts'
import { RecordingLog } from './RecordingLog.ts'
import { testCatalog } from './TestCatalog.ts'
import type { Spot } from '../../Shared/GameLogic/Definitions/RoomDefinition.ts'
import type { DeepReadonly } from '../../Shared/Engine/DeepReadonly.ts'
import type { SessionState } from '../../Shared/GameLogic/State/SessionState.ts'

export const halfFlowTiltDegrees = 27.5
export const fullFlowTiltDegrees = 45

const longestWaitSeconds = 3600
const waterForTheMixedTeasC = 80
const secondsBetweenTheMixedTeas = 5
const secondsEachMixedTeaSteeps = 60
const spoonDepthForHalfAGram = 0.1
const spotBesideThePlayerX = -1

export class TestTeaSession {
  private readonly catalog: Catalog
  private readonly spotWhereMissedStreamsLand: (state: DeepReadonly<SessionState>) => Spot

  readonly log = new RecordingLog()
  readonly session: TeaSession

  constructor(catalog: Catalog = testCatalog(), roomId = 'testRoom', savedState: unknown = null, spotWhereMissedStreamsLand: (state: DeepReadonly<SessionState>) => Spot = spotBesideThePlayer) {
    this.catalog = catalog
    this.spotWhereMissedStreamsLand = spotWhereMissedStreamsLand
    const opening = savedState === null ? TeaSession.open(catalog, roomId, this.log, true) : TeaSession.resume(catalog, savedState, sessionStateVersion, this.log, true)
    if (opening.kind !== 'opened') throw new Error(`test room "${roomId}" is unavailable: ${opening.problems.join('; ')}`)
    this.session = opening.session
  }

  get savedState(): unknown {
    return JSON.parse(JSON.stringify(this.session.state))
  }

  get state() {
    return this.session.state
  }

  static resumedFrom(savedState: unknown, catalog: Catalog = testCatalog()): TestTeaSession {
    return new TestTeaSession(catalog, 'testRoom', savedState)
  }

  vessel(id: string) {
    const vessel = this.session.state.vessels[id]
    if (vessel === undefined) throw new Error(`the test room has no vessel "${id}"`)
    return vessel
  }

  cloth(id = 'cloth') {
    const cloth = this.session.state.cloths[id]
    if (cloth === undefined) throw new Error(`the test room has no cloth "${id}"`)
    return cloth
  }

  do(command: Command): readonly TeaEvent[] {
    return this.session.dispatch(command)
  }

  doWithoutARefusal(command: Command): readonly TeaEvent[] {
    const events = this.do(command)
    const [refusal] = eventsOfType(events, 'actionRefused')
    if (refusal !== undefined) throw new Error(`the arrange could not ${command.type}: it was refused with ${refusal.reason}`)
    return events
  }

  wait(seconds: number): readonly TeaEvent[] {
    return this.session.advance(seconds)
  }

  leaveAndReturnAfter(awaySeconds: number, shareThroughTheNextTimeOfDay = 0.5): { readonly session: TestTeaSession; readonly events: readonly TeaEvent[] } {
    const session = TestTeaSession.resumedFrom(this.savedState, this.catalog)
    return { session, events: session.session.returnAfter(awaySeconds, shareThroughTheNextTimeOfDay) }
  }

  heatKettleTo(temperatureC: number): readonly TeaEvent[] {
    const events = [
      ...this.doWithoutARefusal({ type: 'placeOnHeater', itemId: 'kettle' }),
      ...this.doWithoutARefusal({ type: 'switchHeaterOn' }),
    ]
    events.push(...this.waitUntil(() => this.vessel('kettle').liquid.temperatureC >= temperatureC))
    events.push(...this.doWithoutARefusal({ type: 'switchHeaterOff' }), ...this.doWithoutARefusal({ type: 'pickUp', itemId: 'kettle' }))
    return events
  }

  putOnTheWorkingHeater(itemId: string): readonly TeaEvent[] {
    return [...this.doWithoutARefusal({ type: 'placeOnHeater', itemId }), ...this.doWithoutARefusal({ type: 'switchHeaterOn' })]
  }

  fillInTheSink(vesselId: string, seconds: number): readonly TeaEvent[] {
    return [
      ...this.doWithoutARefusal({ type: 'putInTheSink', itemId: vesselId }),
      ...this.doWithoutARefusal({ type: 'turnTheTapOn' }),
      ...this.wait(seconds),
      ...this.doWithoutARefusal({ type: 'turnTheTapOff' }),
      ...this.doWithoutARefusal({ type: 'pickUp', itemId: vesselId }),
    ]
  }

  addLeavesToKettle(grams: number): readonly TeaEvent[] {
    const spoonLocation = this.state.spoon.location
    const events = [...this.takeTheSpoon(), ...this.openTheLid('kettle'), ...this.openTheLid('caddy')]
    let gramsLeftToAdd = grams
    while (gramsLeftToAdd > 0) {
      const depth = Math.min(1, gramsLeftToAdd / this.state.spoon.capacityGrams)
      events.push(...this.doWithoutARefusal({ type: 'scoopTea', caddyId: 'caddy', depth }))
      gramsLeftToAdd -= totalLeafGrams(this.state.spoon.gramsByTeaId)
      events.push(...this.doWithoutARefusal({ type: 'tipSpoonInto', vesselId: 'kettle' }))
    }
    events.push(...this.doWithoutARefusal({ type: 'closeVesselLid', vesselId: 'caddy' }), ...this.doWithoutARefusal({ type: 'closeVesselLid', vesselId: 'kettle' }))
    if (spoonLocation.kind === 'onSurface') events.push(...this.doWithoutARefusal({ type: 'putDown', itemId: 'spoon', spot: spoonLocation.spot }))
    return events
  }

  tipASpoonOfLeavesInto(vesselId: string, caddyId = 'caddy'): readonly TeaEvent[] {
    return [
      ...this.takeTheSpoon(),
      ...this.openTheLid(caddyId),
      ...this.doWithoutARefusal({ type: 'scoopTea', caddyId, depth: 1 }),
      ...this.doWithoutARefusal({ type: 'tipSpoonInto', vesselId }),
    ]
  }

  mixInTheThermos(caddyIds: readonly string[]): void {
    const cups = caddyIds.map((caddyId, index) => ({ caddyId, cupId: `cup${index + 1}` }))
    this.heatKettleTo(waterForTheMixedTeasC)
    this.takeTheSpoon()
    for (const { caddyId, cupId } of cups) this.brewASpoonfulOf(caddyId, cupId)
    this.wait(secondsEachMixedTeaSteeps - secondsBetweenTheMixedTeas * (cups.length - 1))
    this.openTheLid('thermos')
    for (const { cupId } of cups) this.pour(cupId, 'thermos', secondsBetweenTheMixedTeas, fullFlowTiltDegrees)
  }

  pour(
    sourceId: string,
    targetId: string | null,
    seconds: number,
    tiltDegrees = halfFlowTiltDegrees,
    streamOnTargetFraction = 1,
  ): readonly TeaEvent[] {
    return [
      ...this.doWithoutARefusal({ type: 'startPouring', sourceId, targetId }),
      ...this.doWithoutARefusal({ type: 'adjustPour', tiltDegrees, streamOnTargetFraction, missedStreamLandsAt: this.spotWhereMissedStreamsLand(this.state) }),
      ...this.wait(seconds),
      ...this.doWithoutARefusal({ type: 'stopPouring' }),
    ]
  }

  waitUntilCupCoolsTo(cupId: string, temperatureC: number): readonly TeaEvent[] {
    return this.waitUntil(() => this.vessel(cupId).liquid.temperatureC <= temperatureC)
  }

  waitUntil(isDone: () => boolean): readonly TeaEvent[] {
    return this.waitStepByStep(() => isDone(), 'the condition was not met')
  }

  waitFor(eventType: TeaEvent['type']): readonly TeaEvent[] {
    return this.waitStepByStep((eventsSoFar) => eventsSoFar.some((event) => event.type === eventType), `no ${eventType} happened`)
  }

  private brewASpoonfulOf(caddyId: string, cupId: string): void {
    this.pour('kettle', cupId, secondsBetweenTheMixedTeas)
    this.openTheLid(caddyId)
    this.doWithoutARefusal({ type: 'scoopTea', caddyId, depth: spoonDepthForHalfAGram })
    this.doWithoutARefusal({ type: 'tipSpoonInto', vesselId: cupId })
  }

  private takeTheSpoon(): readonly TeaEvent[] {
    return this.state.spoon.location.kind === 'inHand' ? [] : this.doWithoutARefusal({ type: 'pickUp', itemId: 'spoon' })
  }

  private openTheLid(vesselId: string): readonly TeaEvent[] {
    return this.vessel(vesselId).isLidOpen ? [] : this.doWithoutARefusal({ type: 'openVesselLid', vesselId })
  }

  private waitStepByStep(isDone: (eventsSoFar: readonly TeaEvent[]) => boolean, whatWasNotMet: string): readonly TeaEvent[] {
    const events: TeaEvent[] = []
    let waitedSeconds = 0
    while (!isDone(events)) {
      if (waitedSeconds > longestWaitSeconds) throw new Error(`${whatWasNotMet} within ${longestWaitSeconds} s`)
      events.push(...this.wait(TeaSession.worldStepSeconds))
      waitedSeconds += TeaSession.worldStepSeconds
    }
    return events
  }
}

export function sessionWithTheKettleOnTheWorkingHeater(session: TestTeaSession = new TestTeaSession()): TestTeaSession {
  session.putOnTheWorkingHeater('kettle')
  return session
}

function spotBesideThePlayer(state: DeepReadonly<SessionState>): Spot {
  return { placeId: state.player.placeId ?? 'table', x: spotBesideThePlayerX, y: 0, z: 0 }
}

export function sessionWithSpillOnTheTable(): TestTeaSession {
  const session = new TestTeaSession()
  session.pour('kettle', null, 2.5)
  return session
}

export function eventsOfType<Type extends TeaEvent['type']>(
  events: readonly TeaEvent[],
  type: Type,
): Extract<TeaEvent, { readonly type: Type }>[] {
  return events.filter((event): event is Extract<TeaEvent, { readonly type: Type }> => event.type === type)
}
