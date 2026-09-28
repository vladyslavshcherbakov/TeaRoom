import type { AppLog } from './AppLog.ts'

export type Decoded<T> = { readonly kind: 'fits'; readonly value: T } | { readonly kind: 'doesNotFit'; readonly problem: string }

export type KeptValue<T> = {
  readonly key: string
  readonly name: string
  readonly whenLost: string
  readonly decode: (saved: unknown) => Decoded<T>
  readonly describe?: (value: T) => string
}

export type FoundValue<T> = { readonly kind: 'none' } | { readonly kind: 'found'; readonly value: T } | { readonly kind: 'doesNotFit' }

export type BrowserStore<T> = {
  readonly load: () => FoundValue<T>
  readonly keep: (value: T) => void
  readonly forget: (reason: string) => void
}

export type StoreWithADefault<T> = {
  readonly load: () => T
  readonly keep: (value: T) => void
}

type StoredText = { readonly kind: 'none' } | { readonly kind: 'found'; readonly text: string } | { readonly kind: 'unreachable'; readonly error: string }

type StorageWrite = { readonly kind: 'done' } | { readonly kind: 'failed'; readonly error: string }

export function fits<T>(value: T): Decoded<T> {
  return { kind: 'fits', value }
}

export function doesNotFit(problem: string): Decoded<never> {
  return { kind: 'doesNotFit', problem }
}

export function browserStore<T>(kept: KeptValue<T>, log: AppLog): BrowserStore<T> {
  let hasLoggedAFailedKeep = false
  const load = (): FoundValue<T> => {
    const stored = read(kept.key)
    if (stored.kind === 'unreachable') {
      log(`cannot read ${kept.name}, ${kept.whenLost}: ${stored.error}`, 'error')
      return { kind: 'none' }
    }
    if (stored.kind === 'none') return stored
    const saved = parsedJsonOrNull(stored.text)
    if (saved === null) {
      log(`cannot read ${kept.name} as JSON, ${kept.whenLost}`, 'error')
      return { kind: 'doesNotFit' }
    }
    const decoded = kept.decode(saved)
    if (decoded.kind === 'doesNotFit') {
      log(`found ${kept.name} kept by another version of the game, ${kept.whenLost}: ${decoded.problem}`)
      return { kind: 'doesNotFit' }
    }
    if (kept.describe !== undefined) log(`read ${kept.name}: ${kept.describe(decoded.value)}`)
    return { kind: 'found', value: decoded.value }
  }
  return {
    load,
    keep: (value) => {
      const write = keep(kept.key, JSON.stringify(value))
      if (write.kind === 'done') {
        if (hasLoggedAFailedKeep) log(`saved ${kept.name} again after a save that failed`)
        hasLoggedAFailedKeep = false
        return
      }
      if (hasLoggedAFailedKeep) return
      hasLoggedAFailedKeep = true
      log(`could not save ${kept.name}, it will be tried again: ${write.error}`, 'error')
    },
    forget: (reason) => {
      const write = forget(kept.key)
      if (write.kind === 'done') log(`forgot ${kept.name}: ${reason}`)
      else log(`could not forget ${kept.name} (${reason}): ${write.error}`, 'error')
    },
  }
}

export function withADefault<T>(store: BrowserStore<T>, byDefault: T): StoreWithADefault<T> {
  return {
    load: () => {
      const found = store.load()
      return found.kind === 'found' ? found.value : byDefault
    },
    keep: store.keep,
  }
}

function read(key: string): StoredText {
  try {
    const text = localStorage.getItem(key)
    return text === null ? { kind: 'none' } : { kind: 'found', text }
  } catch (error) {
    return { kind: 'unreachable', error: String(error) }
  }
}

function keep(key: string, text: string): StorageWrite {
  try {
    localStorage.setItem(key, text)
    return { kind: 'done' }
  } catch (error) {
    return { kind: 'failed', error: String(error) }
  }
}

function forget(key: string): StorageWrite {
  try {
    localStorage.removeItem(key)
    return { kind: 'done' }
  } catch (error) {
    return { kind: 'failed', error: String(error) }
  }
}

function parsedJsonOrNull(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
