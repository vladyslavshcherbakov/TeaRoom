import type { AppLog } from './AppLog.ts'
import { browserStore, fits, withADefault, type StoreWithADefault } from './BrowserStorage.ts'

export type SettingValue<Value> = {
  readonly byDefault: Value
  readonly isAValue: (value: unknown) => value is Value
}

export type SettingsTable = Readonly<Record<string, SettingValue<unknown>>>

export type SettingsPlace = {
  readonly key: string
  readonly name: string
}

export type SettingsOf<Table extends SettingsTable> = { readonly [Key in keyof Table]: Table[Key] extends SettingValue<infer Value> ? Value : never }

export function onOff(byDefault: boolean): SettingValue<boolean> {
  return { byDefault, isAValue: (value) => typeof value === 'boolean' }
}

export function oneOf<Value extends string>(values: readonly Value[], byDefault: NoInfer<Value>): SettingValue<Value> {
  return { byDefault, isAValue: (value): value is Value => values.some((offered) => offered === value) }
}

export function someOf<Value extends string>(values: readonly Value[], byDefault: NoInfer<readonly Value[]>): SettingValue<readonly Value[]> {
  const isOffered = (value: unknown): value is Value => values.some((offered) => offered === value)
  return { byDefault, isAValue: (value): value is readonly Value[] => Array.isArray(value) && value.every(isOffered) && new Set(value).size === value.length }
}

export function numberWhere(isAValue: (value: unknown) => value is number, byDefault: number): SettingValue<number> {
  return { byDefault, isAValue }
}

export function defaultsOf<Table extends SettingsTable>(table: Table): SettingsOf<Table> {
  return Object.fromEntries(Object.entries(table).map(([name, setting]) => [name, setting.byDefault])) as SettingsOf<Table>
}

export function settingsFrom<Table extends SettingsTable>(table: Table, saved: unknown, defaults: SettingsOf<Table> = defaultsOf(table)): SettingsOf<Table> {
  const savedByName = typeof saved === 'object' && saved !== null ? (saved as Readonly<Record<string, unknown>>) : {}
  return Object.fromEntries(Object.entries(table).map(([name, setting]) => [name, setting.isAValue(savedByName[name]) ? savedByName[name] : (defaults as Readonly<Record<string, unknown>>)[name]])) as SettingsOf<Table>
}

export function describeSettings(settings: Readonly<Record<string, unknown>>): string {
  return Object.entries(settings).map(([name, value]) => `${name} ${String(value)}`).join(', ')
}

export function settingsStore<Table extends SettingsTable>(table: Table, place: SettingsPlace, defaults: SettingsOf<Table>, log: AppLog): StoreWithADefault<SettingsOf<Table>> {
  const store = browserStore({ key: place.key, name: place.name, whenLost: 'so the defaults are used', decode: (saved) => fits(settingsFrom(table, saved, defaults)), describe: describeSettings }, log)
  return withADefault(store, defaults)
}
