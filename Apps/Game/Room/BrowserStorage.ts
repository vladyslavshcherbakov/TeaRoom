export type StoredText = { readonly kind: 'none' } | { readonly kind: 'found'; readonly text: string } | { readonly kind: 'unreachable'; readonly error: string }

export type StorageWrite = { readonly kind: 'done' } | { readonly kind: 'failed'; readonly error: string }

export const browserStorage = {
  read(key: string): StoredText {
    try {
      const text = localStorage.getItem(key)
      return text === null ? { kind: 'none' } : { kind: 'found', text }
    } catch (error) {
      return { kind: 'unreachable', error: String(error) }
    }
  },

  keep(key: string, text: string): StorageWrite {
    try {
      localStorage.setItem(key, text)
      return { kind: 'done' }
    } catch (error) {
      return { kind: 'failed', error: String(error) }
    }
  },

  forget(key: string): StorageWrite {
    try {
      localStorage.removeItem(key)
      return { kind: 'done' }
    } catch (error) {
      return { kind: 'failed', error: String(error) }
    }
  },
}

export function parsedJsonOrNull(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
