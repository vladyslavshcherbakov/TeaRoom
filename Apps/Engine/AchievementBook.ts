import type { AppLog } from './AppLog.ts'

export type AchievementRecord<Id extends string> = { readonly unlocked: readonly Id[] }

export type AchievementStorage<SomeRecord> = {
  readonly load: () => SomeRecord
  readonly keep: (record: SomeRecord) => void
}

export class AchievementBook<Id extends string, SomeRecord extends AchievementRecord<Id>> {
  private readonly storage: AchievementStorage<SomeRecord>
  private readonly log: AppLog
  private readonly unlockedNow: (id: Id) => void
  private keptRecord: SomeRecord

  constructor(storage: AchievementStorage<SomeRecord>, everyId: readonly Id[], log: AppLog, unlockedNow: (id: Id) => void) {
    this.storage = storage
    this.log = log
    this.unlockedNow = unlockedNow
    this.keptRecord = storage.load()
    log(`${this.keptRecord.unlocked.length} of ${everyId.length} achievements are unlocked`)
  }

  get record(): SomeRecord {
    return this.keptRecord
  }

  get unlocked(): ReadonlySet<Id> {
    return new Set(this.keptRecord.unlocked)
  }

  isUnlocked(id: Id): boolean {
    return this.keptRecord.unlocked.includes(id)
  }

  unlock(id: Id, reason: string): void {
    if (this.isUnlocked(id)) return
    this.keep({ ...this.keptRecord, unlocked: [...this.keptRecord.unlocked, id] })
    this.log(`achievement ${id} unlocked: ${reason}`)
    this.unlockedNow(id)
  }

  keep(record: SomeRecord): void {
    this.keptRecord = record
    this.storage.keep(record)
  }
}
