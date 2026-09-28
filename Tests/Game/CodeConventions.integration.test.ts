import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

type SourceFile = {
  readonly path: string
  readonly text: string
}

type MemberKind = (typeof memberOrder)[number]

const repositoryFolder = fileURLToPath(new URL('../../', import.meta.url))
const worldOutsideTheGameLogic = /\bDate\b|Math\.random|performance\.|console\.|setTimeout|setInterval|requestAnimationFrame|window\.|document\.|globalThis|localStorage/
const browserStorage = /localStorage|sessionStorage|indexedDB/
const writeOfALocation = /\.location\s*=[^=]/
const importOfAStylesheet = /import [^\n]*'[^']+\.css'/
const importOfThreeJs = /from 'three[/']/
const changeOfLayers = /\.layers\.(set|enable|disable|enableAll|disableAll|toggle)\(/
const relativeImportPath = /^import [^\n]*? from '(\.[^']+)'/gm
const testName = /^(?:test|it)\((['"`])(.+?)\1/gm
const subjectConditionOutcome = /^[a-z][A-Za-z0-9]*(_[a-z0-9][A-Za-z0-9]*){1,2}$/
const pascalCaseFileName = /^[A-Z][A-Za-z0-9]*(\.unit\.test|\.integration\.test|\.performance\.test|\.endToEndUI\.spec)?\.(ts|css)$/
const toolConfigurationFileName = /^[a-z]+\.config\.ts$/
const memberOrder = ['private property', 'public property', 'constructor', 'getter', 'public method', 'private method'] as const

test('gameLogic_readsNoClockRandomnessConsoleOrBrowser', () => {
  const filesReachingOut = sourceFilesIn('Shared/GameLogic').filter((file) => worldOutsideTheGameLogic.test(file.text)).map((file) => file.path)

  assert.deepEqual(filesReachingOut, [])
})

test('itemLocation_isWrittenOnlyByMoveItem', () => {
  const filesWritingALocation = sourceFilesIn('Shared/GameLogic').filter((file) => writeOfALocation.test(file.text)).map((file) => file.path)

  assert.deepEqual(filesWritingALocation, ['Shared/GameLogic/Simulation/MoveItem.ts'])
})

test('commandHandlers_neverThrow', () => {
  const handlersThatThrow = sourceFilesIn('Shared/GameLogic/Simulation').filter((file) => file.path.endsWith('Commands.ts') && file.text.includes('throw ')).map((file) => file.path)

  assert.deepEqual(handlersThatThrow, [])
})

test('browserStorage_isReachedOnlyThroughBrowserStorageFile', () => {
  const filesReachingStorage = sourceFilesIn('Apps').filter((file) => browserStorage.test(file.text)).map((file) => file.path)

  assert.deepEqual(filesReachingStorage, ['Apps/Engine/BrowserStorage.ts'])
})

test('threeJs_isImportedOnlyByTheRenderingAndRoomScene', () => {
  const filesImportingThreeJs = sourceFilesIn('Apps').filter((file) => importOfThreeJs.test(file.text) && !file.path.includes('/Rendering/')).map((file) => file.path)

  assert.deepEqual(filesImportingThreeJs, ['Apps/Game/Room/RoomScene.ts'])
})

test('renderLayers_areChangedOnlyInTheEnginesLayersFile', () => {
  const filesChangingLayers = sourceFilesIn('Apps').filter((file) => changeOfLayers.test(file.text)).map((file) => file.path)

  assert.deepEqual(filesChangingLayers, ['Apps/Engine/Rendering/Layers.ts'])
})

test('views_neverImportTheirStyles', () => {
  const filesImportingStyles = sourceFilesIn('Apps').filter((file) => importOfAStylesheet.test(file.text)).map((file) => file.path)

  assert.deepEqual(filesImportingStyles, [])
})

test('relativeImports_endInTsOrInWebmForASound', () => {
  const importsWithoutTs = ['Apps', 'Shared', 'Tests'].flatMap(sourceFilesIn).flatMap((file) => [...file.text.matchAll(relativeImportPath)].map((match) => `${file.path}: ${match[1] ?? ''}`)).filter((line) => !line.endsWith('.ts') && !line.endsWith('.webm'))

  assert.deepEqual(importsWithoutTs, [])
})

test('testNames_areSubjectConditionOutcome', () => {
  const names = sourceFilesIn('Tests').flatMap((file) => [...file.text.matchAll(testName)].map((match) => match[2] ?? ''))

  const namesOutOfShape = names.filter((name) => !subjectConditionOutcome.test(name))

  assert.deepEqual(namesOutOfShape, [])
})

test('sourceFileNames_areInPascalCase', () => {
  const fileNames = ['Apps', 'Shared', 'Tests'].flatMap((folder) => filesIn(folder, (name) => name.endsWith('.ts') || name.endsWith('.css'))).map((file) => path.basename(file))

  const namesOutOfShape = fileNames.filter((name) => !pascalCaseFileName.test(name) && !toolConfigurationFileName.test(name))

  assert.deepEqual(namesOutOfShape, [])
})

test('classMembers_goFromPrivatePropertiesToPrivateMethods', () => {
  const membersOutOfOrder = ['Apps', 'Shared', 'Tests'].flatMap(sourceFilesIn).flatMap(membersOutOfOrderIn)

  assert.deepEqual(membersOutOfOrder, [])
})

function membersOutOfOrderIn(file: SourceFile): string[] {
  const outOfOrder: string[] = []
  const visit = (node: ts.Node): void => {
    if (ts.isClassLike(node)) {
      let furthestRank = 0
      for (const member of node.members) {
        const kind = kindOf(member)
        if (kind === null) continue
        const rank = memberOrder.indexOf(kind)
        if (rank < furthestRank) outOfOrder.push(`${file.path}: ${node.name?.text ?? 'a class'}.${member.name?.getText() ?? kind} is a ${kind} after a ${memberOrder[furthestRank] ?? ''}`)
        furthestRank = Math.max(furthestRank, rank)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(ts.createSourceFile(file.path, file.text, ts.ScriptTarget.Latest, true))
  return outOfOrder
}

function kindOf(member: ts.ClassElement): MemberKind | null {
  const isPrivate = (ts.getCombinedModifierFlags(member) & ts.ModifierFlags.Private) !== 0 || (member.name !== undefined && ts.isPrivateIdentifier(member.name))
  if (ts.isPropertyDeclaration(member)) return isPrivate ? 'private property' : 'public property'
  if (ts.isConstructorDeclaration(member)) return 'constructor'
  if (ts.isGetAccessor(member) || ts.isSetAccessor(member)) return 'getter'
  if (ts.isMethodDeclaration(member)) return isPrivate ? 'private method' : 'public method'
  return null
}

function sourceFilesIn(folder: string): readonly SourceFile[] {
  return filesIn(folder, (name) => name.endsWith('.ts')).map((file) => ({ path: file, text: readFileSync(path.join(repositoryFolder, file), 'utf8') }))
}

function filesIn(folder: string, isWanted: (name: string) => boolean): readonly string[] {
  return readdirSync(path.join(repositoryFolder, folder), { recursive: true, encoding: 'utf8' })
    .filter(isWanted)
    .map((file) => path.join(folder, file).split(path.sep).join('/'))
    .sort()
}
