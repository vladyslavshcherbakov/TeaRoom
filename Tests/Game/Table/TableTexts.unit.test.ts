import assert from 'node:assert/strict'
import test from 'node:test'
import { remarkText, sipText } from '../../../Apps/Game/Table/TableTexts.ts'

test('godsRemark_readsAsADeadpanLine', () => {
  assert.equal(remarkText('weWillTellNoOne'), 'We will tell no one.')
  assert.equal(remarkText('pretendNotToNotice'), 'The gods pretend not to notice.')
})

test('sipLine_answersTheVerdictWithAFeeling', () => {
  const rows = [
    [{ temperature: 'pleasant', strength: 'none', bitterness: 'soft', reaction: 'shrug' }, 'Hmm… no smell of tea in here at all.'],
    [{ temperature: 'tooHot', strength: 'balanced', bitterness: 'soft', reaction: 'waitsForItToCool' }, 'Ouch, too hot. Let it breathe a little.'],
    [{ temperature: 'pleasant', strength: 'balanced', bitterness: 'overbrewed', reaction: 'strongGrimace' }, 'Oof… it has gone bitter. It steeped too long.'],
    [{ temperature: 'pleasant', strength: 'balanced', bitterness: 'high', reaction: 'grimace' }, 'A bitter edge. A little less time next pour.'],
    [{ temperature: 'pleasant', strength: 'heavy', bitterness: 'soft', reaction: 'grimace' }, 'Strong… it grips the tongue.'],
    [{ temperature: 'cold', strength: 'balanced', bitterness: 'soft', reaction: 'shrug' }, 'Cold already. The moment has passed.'],
    [{ temperature: 'pleasant', strength: 'weak', bitterness: 'soft', reaction: 'shrug' }, 'Pale and thin. It wanted more leaves, or more time.'],
    [{ temperature: 'pleasant', strength: 'rich', bitterness: 'soft', reaction: 'contentSigh' }, 'Rich and deep. Lovely.'],
    [{ temperature: 'lukewarm', strength: 'balanced', bitterness: 'soft', reaction: 'contentSigh' }, 'Good, though it is cooling.'],
    [{ temperature: 'pleasant', strength: 'balanced', bitterness: 'soft', reaction: 'contentSigh' }, 'Ahh… just right.'],
  ] as const

  for (const [verdict, line] of rows) assert.equal(sipText(verdict), line, JSON.stringify(verdict))
})
