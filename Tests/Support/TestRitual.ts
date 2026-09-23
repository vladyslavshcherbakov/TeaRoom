import type { Catalog } from '../../Shared/Simulation/Definitions/Catalog.ts'
import type { Command } from '../../Shared/Simulation/Ritual/Command.ts'
import type { RitualEvent } from '../../Shared/Simulation/Ritual/RitualEvent.ts'
import { RitualSession } from '../../Shared/Simulation/Ritual/RitualSession.ts'
import { RecordingLog } from './RecordingLog.ts'
import { testCatalog } from './TestCatalog.ts'

export const halfFlowTiltDegrees = 27.5
export const fullFlowTiltDegrees = 45

const longestWaitSeconds = 3600

export class TestRitual {
  readonly log = new RecordingLog()
  readonly session: RitualSession

  constructor(catalog: Catalog = testCatalog(), roomId = 'testRoom') {
    this.session = new RitualSession(catalog, roomId, this.log)
  }

  static begun(catalog: Catalog = testCatalog(), teaId = 'testGreen', roomId = 'testRoom'): TestRitual {
    const ritual = new TestRitual(catalog, roomId)
    ritual.do({ type: 'beginRitual', teaId })
    return ritual
  }

  get state() {
    return this.session.state
  }

  vessel(id: string) {
    const vessel = this.session.state.vessels[id]
    if (vessel === undefined) throw new Error(`the test room has no vessel "${id}"`)
    return vessel
  }

  do(command: Command): readonly RitualEvent[] {
    return this.session.dispatch(command)
  }

  wait(seconds: number): readonly RitualEvent[] {
    return this.session.advance(seconds)
  }

  heatKettleTo(temperatureC: number): readonly RitualEvent[] {
    const events = [
      ...this.do({ type: 'placeOnHeater', vesselId: 'kettle' }),
      ...this.do({ type: 'switchHeaterOn' }),
    ]
    events.push(...this.waitUntil(() => this.vessel('kettle').liquid.temperatureC >= temperatureC))
    events.push(...this.do({ type: 'switchHeaterOff' }), ...this.do({ type: 'takeOffHeater' }))
    return events
  }

  addLeavesToKettle(grams: number): readonly RitualEvent[] {
    const events = [...this.do({ type: 'openVesselLid', vesselId: 'kettle' }), ...this.do({ type: 'openCaddy' })]
    let gramsLeftToAdd = grams
    while (gramsLeftToAdd > 0) {
      const depth = Math.min(1, gramsLeftToAdd / this.state.spoon.capacityGrams)
      events.push(...this.do({ type: 'scoopTea', depth }))
      gramsLeftToAdd -= this.state.spoon.grams
      events.push(...this.do({ type: 'tipSpoonInto', vesselId: 'kettle' }))
    }
    events.push(...this.do({ type: 'closeCaddy' }), ...this.do({ type: 'closeVesselLid', vesselId: 'kettle' }))
    return events
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
      ...this.do({ type: 'adjustPour', tiltDegrees, streamOnTargetFraction }),
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
