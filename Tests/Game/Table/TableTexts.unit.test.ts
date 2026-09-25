import assert from 'node:assert/strict'
import test from 'node:test'
import { remarkText, sipText } from '../../../Apps/Game/Table/TableTexts.ts'
import { englishTexts } from '../../../Apps/Game/Texts/EnglishTexts.ts'

test('godsRemark_readsAsADeadpanLine', () => {
  assert.equal(remarkText('weWillTellNoOne'), 'We will tell no one.')
  assert.equal(remarkText('pretendNotToNotice'), 'The gods pretend not to notice.')
})

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
    const phrases: string[] = Object.entries(englishTexts).filter(([key]) => key.startsWith(`sip.${feeling}.`)).map(([, phrase]) => phrase)
    assert.ok(phrases.includes(sipText(verdict, false, 7)), `${feeling}: ${sipText(verdict, false, 7)}`)
  }
})

test('sipLine_fromABowlWithLeavesInIt_isAboutTheLeaves', () => {
  const phrases: string[] = Object.entries(englishTexts).filter(([key]) => key.startsWith('sip.amongLeaves.')).map(([, phrase]) => phrase)

  const line = sipText({ temperature: 'pleasant', strength: 'balanced', bitterness: 'soft', reaction: 'contentSigh' }, true, 7)

  assert.ok(phrases.includes(line), line)
})

test('sipLine_fromABowlWithLeavesThatIsTooHot_saysItIsTooHot', () => {
  const phrases: string[] = Object.entries(englishTexts).filter(([key]) => key.startsWith('sip.tooHot.')).map(([, phrase]) => phrase)

  const line = sipText({ temperature: 'tooHot', strength: 'balanced', bitterness: 'soft', reaction: 'waitsForItToCool' }, true, 7)

  assert.ok(phrases.includes(line), line)
})
