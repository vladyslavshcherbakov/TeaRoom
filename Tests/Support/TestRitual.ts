import type { Catalog } from '../../Shared/Simulation/Definitions/Catalog.ts'
import type { Command } from '../../Shared/Simulation/Ritual/Command.ts'
import type { RitualEvent } from '../../Shared/Simulation/Ritual/RitualEvent.ts'
import { RitualSession } from '../../Shared/Simulation/Ritual/RitualSession.ts'
import { sessionStateVersion } from '../../Shared/Simulation/State/FittedSavedState.ts'
import { RecordingLog } from './RecordingLog.ts'
import { testCatalog } from './TestCatalog.ts'

export const halfFlowTiltDegrees = 27.5
export const fullFlowTiltDegrees = 45

const longestWaitSeconds = 3600
const waterForTheMixedTeasC = 80
const secondsBetweenTheMixedTeas = 5
const secondsEachMixedTeaSteeps = 60
const spoonDepthForHalfAGram = 0.1

export class TestRitual {
  private readonly catalog: Catalog

  readonly log = new RecordingLog()
  readonly session: RitualSession

  constructor(catalog: Catalog = testCatalog(), roomId = 'testRoom', savedState: unknown = null) {
    this.catalog = catalog
    const opening = savedState === null ? RitualSession.open(catalog, roomId, this.log, true) : RitualSession.resume(catalog, savedState, sessionStateVersion, this.log, true)
    if (opening.kind !== 'opened') throw new Error(`test room "${roomId}" is unavailable: ${opening.problems.join('; ')}`)
    this.session = opening.session
  }

  static resumedFrom(savedState: unknown, catalog: Catalog = testCatalog()): TestRitual {
    return new TestRitual(catalog, 'testRoom', savedState)
  }

  get savedState(): unknown {
    return JSON.parse(JSON.stringify(this.session.state))
  }

  get state() {
    return this.session.state
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

  do(command: Command): readonly RitualEvent[] {
    return this.session.dispatch(command)
  }

  wait(seconds: number): readonly RitualEvent[] {
    return this.session.advance(seconds)
  }

  leaveAndReturnAfter(awaySeconds: number, shareThroughTheNextTimeOfDay = 0.5): { readonly ritual: TestRitual; readonly events: readonly RitualEvent[] } {
    const ritual = TestRitual.resumedFrom(this.savedState, this.catalog)
    return { ritual, events: ritual.session.returnAfter(awaySeconds, shareThroughTheNextTimeOfDay) }
  }

  heatKettleTo(temperatureC: number): readonly RitualEvent[] {
    const events = [
      ...this.doWithoutARefusal({ type: 'placeOnHeater', itemId: 'kettle' }),
      ...this.doWithoutARefusal({ type: 'switchHeaterOn' }),
    ]
    events.push(...this.waitUntil(() => this.vessel('kettle').liquid.temperatureC >= temperatureC))
    events.push(...this.doWithoutARefusal({ type: 'switchHeaterOff' }), ...this.doWithoutARefusal({ type: 'pickUp', itemId: 'kettle' }))
    return events
  }

  putOnTheWorkingHeater(itemId: string): readonly RitualEvent[] {
    return [...this.doWithoutARefusal({ type: 'placeOnHeater', itemId }), ...this.doWithoutARefusal({ type: 'switchHeaterOn' })]
  }

  fillInTheSink(vesselId: string, seconds: number): readonly RitualEvent[] {
    return [
      ...this.doWithoutARefusal({ type: 'putInTheSink', itemId: vesselId }),
      ...this.doWithoutARefusal({ type: 'turnTheTapOn' }),
      ...this.wait(seconds),
      ...this.doWithoutARefusal({ type: 'turnTheTapOff' }),
      ...this.doWithoutARefusal({ type: 'pickUp', itemId: vesselId }),
    ]
  }

  addLeavesToKettle(grams: number): readonly RitualEvent[] {
    const spoonLocation = this.state.spoon.location
    const events = [...this.takeTheSpoon(), ...this.openTheLid('kettle'), ...this.openTheLid('caddy')]
    let gramsLeftToAdd = grams
    while (gramsLeftToAdd > 0) {
      const depth = Math.min(1, gramsLeftToAdd / this.state.spoon.capacityGrams)
      events.push(...this.doWithoutARefusal({ type: 'scoopTea', caddyId: 'caddy', depth }))
      gramsLeftToAdd -= this.state.spoon.grams
      events.push(...this.doWithoutARefusal({ type: 'tipSpoonInto', vesselId: 'kettle' }))
    }
    events.push(...this.doWithoutARefusal({ type: 'closeVesselLid', vesselId: 'caddy' }), ...this.doWithoutARefusal({ type: 'closeVesselLid', vesselId: 'kettle' }))
    if (spoonLocation.kind === 'onSurface') events.push(...this.doWithoutARefusal({ type: 'putDown', itemId: 'spoon', spot: spoonLocation.spot }))
    return events
  }

  tipASpoonOfLeavesInto(vesselId: string, caddyId = 'caddy'): readonly RitualEvent[] {
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
  ): readonly RitualEvent[] {
    return [
      ...this.doWithoutARefusal({ type: 'startPouring', sourceId, targetId }),
      ...this.doWithoutARefusal({ type: 'adjustPour', tiltDegrees, streamOnTargetFraction, missedStreamLandsAt: null }),
      ...this.wait(seconds),
      ...this.doWithoutARefusal({ type: 'stopPouring' }),
    ]
  }

  waitUntilCupCoolsTo(cupId: string, temperatureC: number): readonly RitualEvent[] {
    return this.waitUntil(() => this.vessel(cupId).liquid.temperatureC <= temperatureC)
  }

  waitUntil(isDone: () => boolean): readonly RitualEvent[] {
    return this.waitStepByStep(() => isDone(), 'the condition was not met')
  }

  waitFor(eventType: RitualEvent['type']): readonly RitualEvent[] {
    return this.waitStepByStep((eventsSoFar) => eventsSoFar.some((event) => event.type === eventType), `no ${eventType} happened`)
  }

  private brewASpoonfulOf(caddyId: string, cupId: string): void {
    this.pour('kettle', cupId, secondsBetweenTheMixedTeas)
    this.openTheLid(caddyId)
    this.doWithoutARefusal({ type: 'scoopTea', caddyId, depth: spoonDepthForHalfAGram })
    this.doWithoutARefusal({ type: 'tipSpoonInto', vesselId: cupId })
  }

  private takeTheSpoon(): readonly RitualEvent[] {
    return this.state.spoon.location.kind === 'inHand' ? [] : this.doWithoutARefusal({ type: 'pickUp', itemId: 'spoon' })
  }

  private openTheLid(vesselId: string): readonly RitualEvent[] {
    return this.vessel(vesselId).isLidOpen ? [] : this.doWithoutARefusal({ type: 'openVesselLid', vesselId })
  }

  private waitStepByStep(isDone: (eventsSoFar: readonly RitualEvent[]) => boolean, whatWasNotMet: string): readonly RitualEvent[] {
    const events: RitualEvent[] = []
    let waitedSeconds = 0
    while (!isDone(events)) {
      if (waitedSeconds > longestWaitSeconds) throw new Error(`${whatWasNotMet} within ${longestWaitSeconds} s`)
      events.push(...this.wait(RitualSession.simulationStepSeconds))
      waitedSeconds += RitualSession.simulationStepSeconds
    }
    return events
  }

  private doWithoutARefusal(command: Command): readonly RitualEvent[] {
    const events = this.do(command)
    const [refusal] = eventsOfType(events, 'actionRefused')
    if (refusal !== undefined) throw new Error(`the arrange could not ${command.type}: it was refused with ${refusal.reason}`)
    return events
  }


}

export function ritualWithTheKettleOnTheWorkingHeater(ritual: TestRitual = new TestRitual()): TestRitual {
  ritual.putOnTheWorkingHeater('kettle')
  return ritual
}

export function ritualWithSpillOnTheTable(): TestRitual {
  const ritual = new TestRitual()
  ritual.pour('kettle', null, 2.5)
  return ritual
}

export function eventsOfType<Type extends RitualEvent['type']>(
  events: readonly RitualEvent[],
  type: Type,
): Extract<RitualEvent, { readonly type: Type }>[] {
  return events.filter((event): event is Extract<RitualEvent, { readonly type: Type }> => event.type === type)
}
