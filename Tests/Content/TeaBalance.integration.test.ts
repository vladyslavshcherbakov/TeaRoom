import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultCatalog } from '../../Shared/Content/DefaultCatalog.ts'
import { eventsOfType, TestRitual } from '../Support/TestRitual.ts'

for (const tea of Object.values(defaultCatalog.teas)) {
  test(`${tea.id}_whenBrewedByTheBookInTheQuietRoom_tastesBalancedAndSoft`, () => {
    const ritual = TestRitual.begun(defaultCatalog, tea.id, 'quietRoom')
    ritual.heatKettleTo(tea.water.idealC)
    ritual.addLeavesToKettle((tea.steeping.idealGramsPer100Ml * ritual.vessel('kettle').liquid.volumeMl) / 100)
    ritual.wait(tea.steeping.idealSeconds)
    ritual.pour('kettle', 'bowl1', 8)
    ritual.waitUntilCupCoolsTo('bowl1', 60)

    const verdict = eventsOfType(ritual.do({ type: 'tasteCup', cupId: 'bowl1' }), 'teaTasted')[0]?.verdict

    assert.equal(verdict?.strength, 'balanced')
    assert.equal(verdict?.bitterness, 'soft')
    assert.equal(verdict?.reaction, 'contentSigh')
  })
}
