export type Probe = Readonly<Record<string, (...values: never[]) => unknown>>

export function exposeTheProbe(probe: Probe): void {
  Object.assign(globalThis, { enginesProbe: probe })
}
