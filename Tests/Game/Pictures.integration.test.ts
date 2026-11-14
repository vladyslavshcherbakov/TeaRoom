import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { xmlProblems } from '../Support/XmlProblems.ts'

const artFolder = new URL('../../Apps/Game/Teahouse/Art/', import.meta.url)

test('everyPicture_readAsXml_isWellFormed', () => {
  const pictures = readdirSync(artFolder).filter((name) => name.endsWith('.svg'))

  const problems = pictures.flatMap((name) => xmlProblems(readFileSync(new URL(name, artFolder), 'utf8')).map((problem) => `${name}: ${problem}`))

  assert.deepEqual(problems, [])
})
