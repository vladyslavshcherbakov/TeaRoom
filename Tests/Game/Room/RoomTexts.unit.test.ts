import assert from 'node:assert/strict'
import test from 'node:test'
import { captionLinesFor } from '../../../Apps/Game/Room/RoomTexts.ts'

test('caption_ofAnOffering_namesTheFigurineAndThenTheGods', () => {
  const lines = captionLinesFor([
    { type: 'figurineAcceptedTea', figurineId: 'dragon', response: 'glow' },
    { type: 'godsMoodChanged', delta: 2, satisfaction: 52, remark: 'acceptTheOffering' },
  ])

  assert.deepEqual(lines, ['The dragon glows softly.', 'The offering is accepted.'])
})

test('caption_ofASipThatMovesTheGods_leavesTheGodsUnnamed', () => {
  const lines = captionLinesFor([
    { type: 'teaTasted', cupId: 'bowl1', verdict: { temperature: 'pleasant', strength: 'balanced', bitterness: 'soft', reaction: 'contentSigh' } },
    { type: 'godsMoodChanged', delta: 4, satisfaction: 54, remark: 'pleasedWithTheTea' },
  ])

  assert.deepEqual(lines, ['Ahh… just right.'])
})
