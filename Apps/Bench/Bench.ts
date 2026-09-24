import { defaultCatalog } from '../../Shared/Content/DefaultCatalog.ts'
import type { TimeOfDay, Weather } from '../../Shared/Simulation/Definitions/Atmosphere.ts'
import { definitionIn } from '../../Shared/Simulation/Definitions/Catalog.ts'
import type { Command } from '../../Shared/Simulation/Ritual/Command.ts'
import { carriedItemIdsIn } from '../../Shared/Simulation/Ritual/Reach.ts'
import type { LogLevel } from '../../Shared/Simulation/Ritual/RitualLog.ts'
import { RitualSession } from '../../Shared/Simulation/Ritual/RitualSession.ts'
import { BenchLog } from './BenchLog.ts'
import { button, holdButton, picker, readout, row, section, slider, type Readout } from './Controls.ts'

const roomId = 'quietRoom'
const tableTargetLabel = 'table'
const visibleLogLines = 40
const logLevels: readonly LogLevel[] = ['info', 'debug']
const timeScales = ['1', '5', '20'] as const

class RitualBench {
  private readonly room = definitionIn(defaultCatalog, 'rooms', roomId)
  private readonly liveReadouts = new Map<HTMLElement, Readout>()
  private readonly log = new BenchLog(visibleLogLines)
  private session = this.openRoom()
  private timeScale = 1
  private lastFrameMs: number | null = null
  private teaId = Object.keys(defaultCatalog.teas)[0] ?? ''
  private timeOfDay: TimeOfDay = this.room.timesOfDay[0] ?? 'sunset'
  private weather: Weather = this.room.weathers[0] ?? 'rain'
  private pourSourceId = 'kettle'
  private pourTargetId: string | null = 'bowl1'
  private tiltDegrees = 27.5
  private streamOnTargetFraction = 1
  private scoopDepth = 1
  private figurineId = this.room.figurineIds[0] ?? ''
  private placeId = this.room.places[0] ?? ''
  private itemId = this.room.vessels[0]?.id ?? ''

  mount(container: HTMLElement): void {
    container.append(
      this.setupSection(),
      this.keeperSection(),
      this.heatingSection(),
      this.leavesSection(),
      this.pouringSection(),
      this.cupsSection(),
      this.tableSection(),
      this.logSection(),
    )
    requestAnimationFrame((nowMs) => this.frame(nowMs))
  }

  private frame(nowMs: number): void {
    const elapsedSeconds = this.lastFrameMs === null ? 0 : (nowMs - this.lastFrameMs) / 1000
    this.lastFrameMs = nowMs
    this.session.advance(Math.min(elapsedSeconds, 0.25) * this.timeScale)
    for (const [element, text] of this.liveReadouts) element.textContent = text()
    requestAnimationFrame((nextMs) => this.frame(nextMs))
  }

  private send(command: Command): void {
    this.session.dispatch(command)
  }

  private keeperSection(): HTMLElement {
    const itemIds = carriedItemIdsIn(this.session.state)
    return section(
      'Keeper',
      row(this.live(() => this.keeperSummary())),
      row(
        picker(this.room.places, (placeId) => (this.placeId = placeId)),
        button('Stand here', () => this.send({ type: 'standAt', placeId: this.placeId })),
        button('Walk away', () => this.send({ type: 'standAt', placeId: null })),
      ),
      row(
        picker(itemIds, (itemId) => (this.itemId = itemId)),
        button('Pick up', () => this.send({ type: 'pickUp', itemId: this.itemId })),
        button('Put down here', () => this.putDownWhereTheKeeperStands()),
      ),
    )
  }

  private putDownWhereTheKeeperStands(): void {
    const placeId = this.session.state.keeper.placeId ?? this.placeId
    this.send({ type: 'putDown', itemId: this.itemId, spot: { placeId, x: 0, y: 0, z: 0 } })
  }

  private setupSection(): HTMLElement {
    return section(
      'Session',
      row(
        picker(Object.keys(defaultCatalog.teas), (teaId) => (this.teaId = teaId)),
        button('Begin ritual', () => this.send({ type: 'beginRitual', teaId: this.teaId })),
      ),
      row(
        picker(this.room.timesOfDay, (timeOfDay) => (this.timeOfDay = timeOfDay)),
        picker(this.room.weathers, (weather) => (this.weather = weather)),
        button('Set', () => this.send({ type: 'chooseAtmosphere', timeOfDay: this.timeOfDay, weather: this.weather })),
      ),
      row(
        button('Finish ritual', () => this.send({ type: 'finishRitual' })),
        button('Leave', () => this.send({ type: 'leaveRoom' })),
        button('Restart', () => this.restart()),
        picker(timeScales, (scale) => (this.timeScale = Number(scale))),
      ),
      row(this.live(() => this.sessionSummary())),
    )
  }

  private heatingSection(): HTMLElement {
    return section(
      'Kettle and heater',
      row(this.live(() => `kettle: ${this.vesselSummary('kettle')}`)),
      row(this.live(() => this.heaterSummary())),
      row(
        button('Put kettle on heater', () => this.send({ type: 'placeOnHeater', itemId: 'kettle' })),
        button('Lift kettle off', () => this.send({ type: 'pickUp', itemId: 'kettle' })),
      ),
      row(
        button('Heater: switch on', () => this.send({ type: 'switchHeaterOn' })),
        button('Heater: switch off', () => this.send({ type: 'switchHeaterOff' })),
      ),
      row(...this.lidButtons('kettle')),
      row(
        button('Tap: fill kettle in hand', () => this.send({ type: 'startFillingFromTap', vesselId: 'kettle' })),
        button('Tap: close', () => this.send({ type: 'stopFillingFromTap' })),
      ),
      row(this.live(() => `thermos: ${this.vesselSummary('thermos')}`)),
      row(...this.lidButtons('thermos')),
    )
  }

  private leavesSection(): HTMLElement {
    return section(
      'Tea leaves',
      row(this.live(() => this.leavesSummary())),
      row(
        button('Open caddy', () => this.send({ type: 'openCaddy' })),
        button('Close caddy', () => this.send({ type: 'closeCaddy' })),
      ),
      row(slider(0, 1, this.scoopDepth, (depth) => (this.scoopDepth = depth))),
      row(
        button('Scoop', () => this.send({ type: 'scoopTea', depth: this.scoopDepth })),
        button('Tip into kettle', () => this.send({ type: 'tipSpoonInto', vesselId: 'kettle' })),
      ),
    )
  }

  private pouringSection(): HTMLElement {
    const vesselIds = this.room.vessels.map((vessel) => vessel.id)
    return section(
      'Pouring',
      row(
        picker(vesselIds, (vesselId) => (this.pourSourceId = vesselId), this.pourSourceId),
        picker([...vesselIds, tableTargetLabel], (target) => this.choosePourTarget(target), this.pourTargetId ?? tableTargetLabel),
      ),
      row(this.live(() => `tilt ${this.tiltDegrees.toFixed(0)}°`), slider(0, 60, this.tiltDegrees, (tilt) => this.tilt(tilt))),
      row(
        this.live(() => `on target ${(this.streamOnTargetFraction * 100).toFixed(0)}%`),
        slider(0, 1, this.streamOnTargetFraction, (fraction) => this.aim(fraction)),
      ),
      row(
        holdButton(
          'Hold to pour',
          () => this.startPouring(),
          () => this.send({ type: 'stopPouring' }),
        ),
      ),
    )
  }

  private cupsSection(): HTMLElement {
    const cupIds = this.room.vessels.filter((vessel) => definitionIn(defaultCatalog, 'vessels', vessel.definitionId).isDrinkable)
    return section(
      'Bowls and figurines',
      row(picker(this.room.figurineIds, (figurineId) => (this.figurineId = figurineId))),
      ...cupIds.map((cup) =>
        row(
          this.live(() => `${cup.id}: ${this.vesselSummary(cup.id)}`),
          button('Taste', () => this.send({ type: 'tasteCup', cupId: cup.id })),
          button('Offer', () => this.send({ type: 'offerCup', cupId: cup.id, figurineId: this.figurineId })),
        ),
      ),
    )
  }

  private tableSection(): HTMLElement {
    return section(
      'Table',
      row(this.live(() => `wet ${this.session.state.tableWetMl.toFixed(1)} ml`)),
      row(
        button('Wipe slowly', () => this.send({ type: 'wipeTable', strokeSpeedCmPerSecond: 10, coveredFraction: 1 })),
        button('Wipe fast', () => this.send({ type: 'wipeTable', strokeSpeedCmPerSecond: 60, coveredFraction: 1 })),
      ),
    )
  }

  private logSection(): HTMLElement {
    const log = this.live(() => this.log.newestFirst.join('\n'))
    log.id = 'log'
    return section('Log, newest first', row(picker(logLevels, (level) => this.log.showLevelsFrom(level))), log)
  }

  private lidButtons(vesselId: string): HTMLElement[] {
    return [
      button(`Open ${vesselId}`, () => this.send({ type: 'openVesselLid', vesselId })),
      button(`Close ${vesselId}`, () => this.send({ type: 'closeVesselLid', vesselId })),
    ]
  }

  private live(text: Readout): HTMLElement {
    return readout(text, this.liveReadouts)
  }

  private choosePourTarget(target: string): void {
    this.pourTargetId = target === tableTargetLabel ? null : target
  }

  private startPouring(): void {
    this.send({ type: 'startPouring', sourceId: this.pourSourceId, targetId: this.pourTargetId })
    this.adjustPouring()
  }

  private tilt(tiltDegrees: number): void {
    this.tiltDegrees = tiltDegrees
    if (this.session.state.pour !== null) this.adjustPouring()
  }

  private aim(streamOnTargetFraction: number): void {
    this.streamOnTargetFraction = streamOnTargetFraction
    if (this.session.state.pour !== null) this.adjustPouring()
  }

  private adjustPouring(): void {
    this.send({ type: 'adjustPour', tiltDegrees: this.tiltDegrees, streamOnTargetFraction: this.streamOnTargetFraction })
  }

  private restart(): void {
    this.log.clear()
    this.session = this.openRoom()
  }

  private openRoom(): RitualSession {
    const opening = RitualSession.open(defaultCatalog, roomId, this.log, true)
    if (opening.kind !== 'opened') throw new Error(`the bench room is unavailable: ${opening.problems.join('; ')}`)
    return opening.session
  }

  private keeperSummary(): string {
    const { placeId, hands } = this.session.state.keeper
    const heldItems = hands.map((itemId) => itemId ?? 'empty').join(' · ')
    return `${placeId === null ? 'walking' : `at the ${placeId}`} · hands: ${heldItems}`
  }

  private sessionSummary(): string {
    const { phase, atmosphere, teaId, godsSatisfaction, elapsedSeconds } = this.session.state
    return `${phase} · ${teaId ?? 'no tea'} · ${atmosphere.timeOfDay}, ${atmosphere.weather} · gods ${godsSatisfaction} · ${elapsedSeconds.toFixed(0)} s`
  }

  private vesselSummary(vesselId: string): string {
    const vessel = this.session.state.vessels[vesselId]
    if (vessel === undefined) return 'missing'
    const { volumeMl, temperatureC, strength, bitterness } = vessel.liquid
    const leaves = vessel.leaves === null ? '' : ` · leaves ${vessel.leaves.grams.toFixed(1)} g`
    const lid = vessel.isLidOpen ? ' · lid open' : ''
    return `${volumeMl.toFixed(0)} ml · ${temperatureC.toFixed(1)} °C · strength ${strength.toFixed(0)} · bitterness ${bitterness.toFixed(0)}${leaves}${lid}`
  }

  private heaterSummary(): string {
    const { isOn, itemIdOnTop } = this.session.state.heater
    return `heater ${isOn ? 'on' : 'off'} · ${itemIdOnTop === null ? 'nothing on it' : `${itemIdOnTop} on it`}`
  }

  private leavesSummary(): string {
    const { caddy, spoon } = this.session.state
    return `caddy ${caddy.grams.toFixed(1)} g${caddy.isOpen ? ' (open)' : ''} · spoon ${spoon.grams.toFixed(1)} g`
  }
}

const container = document.getElementById('bench')
if (container === null) throw new Error('the page has no #bench element to mount into')
new RitualBench().mount(container)
