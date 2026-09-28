import type { DeepReadonly } from '../../Engine/DeepReadonly.ts'
import type { HeaterMode } from '../State/SessionState.ts'

export type HeaterEvent =
  | { readonly kind: 'switchedOn'; readonly holdsTheThermostatsTarget: boolean }
  | { readonly kind: 'switchedOff' }
  | { readonly kind: 'thermostatStarted' }
  | { readonly kind: 'thermostatDecided'; readonly callsForHeat: boolean }

export function nextHeaterMode(mode: DeepReadonly<HeaterMode>, event: HeaterEvent): HeaterMode {
  switch (event.kind) {
    case 'switchedOn':
      return { kind: 'byHand', holdsTheThermostatsTarget: event.holdsTheThermostatsTarget }
    case 'switchedOff':
      return { kind: 'off' }
    case 'thermostatStarted':
      return { kind: 'thermostat', isHeating: isHeating(mode) }
    case 'thermostatDecided':
      return withTheThermostatsDecision(mode, event.callsForHeat)
  }
}

export function isHeating(mode: DeepReadonly<HeaterMode>): boolean {
  switch (mode.kind) {
    case 'off':
      return false
    case 'byHand':
      return true
    case 'thermostat':
      return mode.isHeating
  }
}

export function isTheHeaterInUse(mode: DeepReadonly<HeaterMode>): boolean {
  switch (mode.kind) {
    case 'off':
      return false
    case 'byHand':
    case 'thermostat':
      return true
  }
}

export function isTheThermostatWorking(mode: DeepReadonly<HeaterMode>): boolean {
  switch (mode.kind) {
    case 'thermostat':
      return true
    case 'off':
    case 'byHand':
      return false
  }
}

export function highestTemperatureHeldC(mode: DeepReadonly<HeaterMode>, thermostatTargetC: number): number | undefined {
  switch (mode.kind) {
    case 'byHand':
      return mode.holdsTheThermostatsTarget ? thermostatTargetC : undefined
    case 'off':
    case 'thermostat':
      return undefined
  }
}

export function describeTheHeatersControl(mode: DeepReadonly<HeaterMode>, thermostatTargetC: number): string {
  switch (mode.kind) {
    case 'off':
      return 'switched off'
    case 'byHand':
      return mode.holdsTheThermostatsTarget ? `by hand, holding the thermostat's ${thermostatTargetC} °C` : 'by hand'
    case 'thermostat':
      return `its thermostat at ${thermostatTargetC} °C, ${mode.isHeating ? 'heating' : 'waiting'}`
  }
}

function withTheThermostatsDecision(mode: DeepReadonly<HeaterMode>, callsForHeat: boolean): HeaterMode {
  switch (mode.kind) {
    case 'thermostat':
      return { kind: 'thermostat', isHeating: callsForHeat }
    case 'off':
    case 'byHand':
      return { ...mode }
  }
}
