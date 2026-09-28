import { nothingUnlocked, type AchievementRecord, type AchievementStorage } from '../../Apps/Game/Room/Achievements.ts'

export class AchievementsKeptInMemory implements AchievementStorage {
  private record: AchievementRecord

  readonly load = (): AchievementRecord => this.record

  readonly keep = (record: AchievementRecord): void => {
    this.record = record
  }

  constructor(record: AchievementRecord = nothingUnlocked) {
    this.record = record
  }
}
