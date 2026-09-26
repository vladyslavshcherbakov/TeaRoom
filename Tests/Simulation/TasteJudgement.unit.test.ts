import assert from 'node:assert/strict'
import test from 'node:test'
import { blendOf, judgeTaste, type TasteVerdict } from '../../Shared/Simulation/Judgement/TasteJudgement.ts'
import { testCatalog } from '../Support/TestCatalog.ts'

test('sip_atFortyFourDegrees_isLukewarm', () => {
  assert.equal(verdictOf({ temperatureC: 44 }).temperature, 'lukewarm')
})

test('sip_atFortyFiveDegrees_isPleasant', () => {
  assert.equal(verdictOf({ temperatureC: 45 }).temperature, 'pleasant')
})

test('sip_atTwentyNineDegrees_isColdAndShrugged', () => {
  assert.deepEqual(verdictOf({ temperatureC: 29 }), { temperature: 'cold', strength: 'balanced', bitterness: 'soft', reaction: 'shrug' })
})

test('sip_atThirtyDegrees_isLukewarmAndEnjoyed', () => {
  assert.deepEqual(verdictOf({ temperatureC: 30 }), { temperature: 'lukewarm', strength: 'balanced', bitterness: 'soft', reaction: 'contentSigh' })
})

test('sip_fifteenAboveTheBalancedRange_isRichAndEnjoyed', () => {
  assert.deepEqual(verdictOf({ strength: 85 }), { temperature: 'pleasant', strength: 'rich', bitterness: 'soft', reaction: 'contentSigh' })
})

test('sip_sixteenAboveTheBalancedRange_isHeavyAndMakesAGrimace', () => {
  assert.deepEqual(verdictOf({ strength: 86 }), { temperature: 'pleasant', strength: 'heavy', bitterness: 'soft', reaction: 'grimace' })
})

test('sip_ofBitterness24_isSoft', () => {
  assert.equal(verdictOf({ bitterness: 24 }).bitterness, 'soft')
})

test('sip_ofBitterness25_isNoticeableAndStillEnjoyed', () => {
  assert.deepEqual(verdictOf({ bitterness: 25 }), { temperature: 'pleasant', strength: 'balanced', bitterness: 'noticeable', reaction: 'contentSigh' })
})

test('sip_ofBitterness44_isNoticeable', () => {
  assert.equal(verdictOf({ bitterness: 44 }).bitterness, 'noticeable')
})

test('sip_ofBitterness45_isHighAndMakesAGrimace', () => {
  assert.deepEqual(verdictOf({ bitterness: 45 }), { temperature: 'pleasant', strength: 'balanced', bitterness: 'high', reaction: 'grimace' })
})

function verdictOf({ temperatureC = 60, strength = 55, bitterness = 0 }: { temperatureC?: number; strength?: number; bitterness?: number }): TasteVerdict {
  const sip = { volumeMl: 40, temperatureC, strength, strengthByTeaId: { testGreen: strength }, bitterness }
  return judgeTaste(sip, blendOf(sip, testCatalog()))
}
