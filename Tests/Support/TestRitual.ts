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

export class TestRitual {
  readonly log = new RecordingLog()
  readonly session: RitualSession

  constructor(catalog: Catalog = testCatalog(), roomId = 'testRoom', savedState: unknown = null) {
    const opening = savedState === null ? RitualSession.open(catalog, roomId, this.log, true) : RitualSession.resume(catalog, savedState, sessionStateVersion, this.log, true)
    if (opening.kind !== 'opened') throw new Error(`test room "${roomId}" is unavailable: ${opening.problems.join('; ')}`)
    this.session = opening.session
  }

  static begun(catalog: Catalog = testCatalog(), teaId = 'testGreen', roomId = 'testRoom'): TestRitual {
    const ritual = new TestRitual(catalog, roomId)
    ritual.do({ type: 'beginRitual', teaId })
    return ritual
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

  leaveAndReturnAfter(awaySeconds: number, catalog: Catalog = testCatalog(), shareThroughTheNextTimeOfDay = 0.5): { readonly ritual: TestRitual; readonly events: readonly RitualEvent[] } {
    const ritual = TestRitual.resumedFrom(this.savedState, catalog)
    return { ritual, events: ritual.session.returnAfter(awaySeconds, shareThroughTheNextTimeOfDay) }
  }

  heatKettleTo(temperatureC: number): readonly RitualEvent[] {
    const events = [
      ...this.do({ type: 'placeOnHeater', itemId: 'kettle' }),
      ...this.do({ type: 'switchHeaterOn' }),
    ]
    events.push(...this.waitUntil(() => this.vessel('kettle').liquid.temperatureC >= temperatureC))
    events.push(...this.do({ type: 'switchHeaterOff' }), ...this.do({ type: 'pickUp', itemId: 'kettle' }))
    return events
  }

  fillInTheSink(vesselId: string, seconds: number): readonly RitualEvent[] {
    return [
      ...this.do({ type: 'putInTheSink', itemId: vesselId }),
      ...this.wait(seconds),
      ...this.do({ type: 'turnTheTapOff' }),
      ...this.do({ type: 'pickUp', itemId: vesselId }),
    ]
  }

  addLeavesToKettle(grams: number): readonly RitualEvent[] {
    const spoonLocation = this.state.spoon.location
    const events = [
      ...this.do({ type: 'pickUp', itemId: 'spoon' }),
      ...this.do({ type: 'openVesselLid', vesselId: 'kettle' }),
      ...this.do({ type: 'openVesselLid', vesselId: 'caddy' }),
    ]
    let gramsLeftToAdd = grams
    while (gramsLeftToAdd > 0) {
      const depth = Math.min(1, gramsLeftToAdd / this.state.spoon.capacityGrams)
      events.push(...this.do({ type: 'scoopTea', depth }))
      gramsLeftToAdd -= this.state.spoon.grams
      events.push(...this.do({ type: 'tipSpoonInto', vesselId: 'kettle' }))
    }
    events.push(...this.do({ type: 'closeVesselLid', vesselId: 'caddy' }), ...this.do({ type: 'closeVesselLid', vesselId: 'kettle' }))
    if (spoonLocation.kind === 'onSurface') events.push(...this.do({ type: 'putDown', itemId: 'spoon', spot: spoonLocation.spot }))
    return events
  }

  tipASpoonOfLeavesInto(vesselId: string): readonly RitualEvent[] {
    return [
      ...this.do({ type: 'pickUp', itemId: 'spoon' }),
      ...this.do({ type: 'openVesselLid', vesselId: 'caddy' }),
      ...this.do({ type: 'scoopTea', depth: 1 }),
      ...this.do({ type: 'tipSpoonInto', vesselId }),
    ]
  }

  pour(
    sourceId: string,
    targetId: string | null,
    seconds: number,
    tiltDegrees = halfFlowTiltDegrees,
    streamOnTargetFraction = 1,
  ): readonly RitualEvent[] {
    return [
      ...this.do({ type: 'startPouring', sourceId, targetId }),
      ...this.do({ type: 'adjustPour', tiltDegrees, streamOnTargetFraction, missedStreamLandsAt: null }),
      ...this.wait(seconds),
      ...this.do({ type: 'stopPouring' }),
    ]
  }

  waitUntilCupCoolsTo(cupId: string, temperatureC: number): readonly RitualEvent[] {
    return this.waitUntil(() => this.vessel(cupId).liquid.temperatureC <= temperatureC)
  }

  private waitUntil(isDone: () => boolean): readonly RitualEvent[] {
    const events: RitualEvent[] = []
    let waitedSeconds = 0
    while (!isDone()) {
      if (waitedSeconds > longestWaitSeconds) throw new Error(`the condition was not met within ${longestWaitSeconds} s`)
      events.push(...this.wait(RitualSession.simulationStepSeconds))
      waitedSeconds += RitualSession.simulationStepSeconds
    }
    return events
  }
}

export function eventsOfType<Type extends RitualEvent['type']>(
  events: readonly RitualEvent[],
  type: Type,
): Extract<RitualEvent, { readonly type: Type }>[] {
  return events.filter((event): event is Extract<RitualEvent, { readonly type: Type }> => event.type === type)
}
