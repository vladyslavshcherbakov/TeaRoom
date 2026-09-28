import type { TestContext } from 'node:test'

export class StorageInMemory {
  private readonly textByKey = new Map<string, string>()

  isBlocked = false
  refusesTheNextWrite = false

  get length(): number {
    return this.textByKey.size
  }

  getItem(key: string): string | null {
    this.throwIfBlocked()
    return this.textByKey.get(key) ?? null
  }

  setItem(key: string, text: string): void {
    this.throwIfBlocked()
    if (this.refusesTheNextWrite) {
      this.refusesTheNextWrite = false
      throw new DOMException('the quota is full', 'QuotaExceededError')
    }
    this.textByKey.set(key, text)
  }

  removeItem(key: string): void {
    this.throwIfBlocked()
    this.textByKey.delete(key)
  }

  clear(): void {
    this.throwIfBlocked()
    this.textByKey.clear()
  }

  key(index: number): string | null {
    this.throwIfBlocked()
    return [...this.textByKey.keys()][index] ?? null
  }

  private throwIfBlocked(): void {
    if (this.isBlocked) throw new DOMException('the storage is blocked', 'SecurityError')
  }
}

export function installStorageInMemory(test: TestContext): StorageInMemory {
  const storage = new StorageInMemory()
  const storageBefore = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
  test.after(() => {
    if (storageBefore === undefined) Reflect.deleteProperty(globalThis, 'localStorage')
    else Object.defineProperty(globalThis, 'localStorage', storageBefore)
  })
  return storage
}
