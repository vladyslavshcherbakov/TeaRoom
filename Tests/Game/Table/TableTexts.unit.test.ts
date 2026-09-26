import assert from 'node:assert/strict'
import test from 'node:test'
import { sipText } from '../../../Apps/Game/Table/TableTexts.ts'
import { englishPhrases } from '../../../Apps/Game/Texts/EnglishTexts.ts'

test('sipLine_answersTheVerdictWithOneOfItsFeelingsPhrases', () => {
  const rows = [
    [{ temperature: 'pleasant', strength: 'none', bitterness: 'soft', reaction: 'shrug' }, 'noTea'],
    [{ temperature: 'tooHot', strength: 'balanced', bitterness: 'soft', reaction: 'waitsForItToCool' }, 'tooHot'],
    [{ temperature: 'pleasant', strength: 'balanced', bitterness: 'overbrewed', reaction: 'strongGrimace' }, 'overbrewed'],
    [{ temperature: 'pleasant', strength: 'balanced', bitterness: 'high', reaction: 'grimace' }, 'bitter'],
    [{ temperature: 'pleasant', strength: 'heavy', bitterness: 'soft', reaction: 'grimace' }, 'tooStrong'],
    [{ temperature: 'pleasant', strength: 'extreme', bitterness: 'high', reaction: 'grimace' }, 'extremelyStrong'],
    [{ temperature: 'cold', strength: 'balanced', bitterness: 'soft', reaction: 'shrug' }, 'cold'],
    [{ temperature: 'pleasant', strength: 'weak', bitterness: 'soft', reaction: 'shrug' }, 'weak'],
    [{ temperature: 'pleasant', strength: 'rich', bitterness: 'soft', reaction: 'contentSigh' }, 'rich'],
    [{ temperature: 'lukewarm', strength: 'balanced', bitterness: 'soft', reaction: 'contentSigh' }, 'coolingButGood'],
    [{ temperature: 'pleasant', strength: 'balanced', bitterness: 'soft', reaction: 'contentSigh' }, 'justRight'],
  ] as const

  for (const [verdict, feeling] of rows) {
    const phrases: readonly string[] = englishPhrases[`sip.${feeling}`]
    assert.ok(phrases.includes(sipText(verdict, false, 7)), `${feeling}: ${sipText(verdict, false, 7)}`)
  }
})

test('sipLine_fromABowlWithLeavesInIt_isAboutTheLeaves', () => {
  const phrases: readonly string[] = englishPhrases['sip.amongLeaves']

  const line = sipText({ temperature: 'pleasant', strength: 'balanced', bitterness: 'soft', reaction: 'contentSigh' }, true, 7)

  assert.ok(phrases.includes(line), line)
})

test('sipLine_fromABowlWithLeavesThatIsTooHot_saysItIsTooHot', () => {
  const phrases: readonly string[] = englishPhrases['sip.tooHot']

  const line = sipText({ temperature: 'tooHot', strength: 'balanced', bitterness: 'soft', reaction: 'waitsForItToCool' }, true, 7)

  assert.ok(phrases.includes(line), line)
})
