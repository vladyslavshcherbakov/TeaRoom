import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import test from 'node:test'

const appsFolder = new URL('../../Apps/', import.meta.url)
const importOfAnInnerGameLogicFile = /from '(?:\.\.\/)+Shared\/GameLogic\/(?!GameLogic\.ts')[^']+'/

test('appFiles_reachTheGameLogicOnlyThroughItsPublicFile', () => {
  const appFiles = readdirSync(appsFolder, { recursive: true, encoding: 'utf8' }).filter((path) => path.endsWith('.ts'))

  const filesReachingInside = appFiles.filter((path) => importOfAnInnerGameLogicFile.test(readFileSync(new URL(path, appsFolder), 'utf8')))

  assert.deepEqual(filesReachingInside, [])
})
