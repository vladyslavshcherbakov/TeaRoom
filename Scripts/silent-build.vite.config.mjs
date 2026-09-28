import ts from 'typescript'
import roomConfig from '../Apps/Game/Room/vite.config.mjs'

const logFunctionNames = new Set(['note', 'noteDetail', 'log', 'roomLog', 'reportTheWorld'])
const logMethodNamesOnThis = new Set(['log', 'write'])
const developmentToolNames = new Set(['exposeTheProbe'])
const refusalArgumentsKept = 3

const everyAssetIsInlined = Number.MAX_SAFE_INTEGER

export default {
  ...roomConfig,
  build: { ...roomConfig.build, assetsInlineLimit: everyAssetIsInlined },
  plugins: [
    {
      name: 'strip-log-calls',
      enforce: 'pre',
      transform(code, id) {
        if (!id.endsWith('.ts')) return null
        const source = ts.createSourceFile(id, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
        const result = ts.transform(source, [(context) => (root) => ts.visitNode(root, function visit(node) {
          const visited = ts.visitEachChild(node, visit, context)
          return ts.isCallExpression(visited) ? withoutLogging(visited, context.factory) : visited
        })])
        const printed = ts.createPrinter().printFile(result.transformed[0])
        result.dispose()
        return { code: printed, map: null }
      },
    },
  ],
}

function withoutLogging(call, factory) {
  const callee = call.expression
  if (ts.isIdentifier(callee) && logFunctionNames.has(callee.text)) return nothing(factory)
  if (ts.isIdentifier(callee) && developmentToolNames.has(callee.text)) return nothing(factory)
  if (ts.isPropertyAccessExpression(callee) && isThisOrALog(callee.expression) && logMethodNamesOnThis.has(callee.name.text)) return nothing(factory)
  if (ts.isIdentifier(callee) && callee.text === 'refuse' && call.arguments.length > refusalArgumentsKept) {
    return factory.updateCallExpression(call, callee, call.typeArguments, call.arguments.slice(0, refusalArgumentsKept))
  }
  return call
}

function isThisOrALog(expression) {
  if (expression.kind === ts.SyntaxKind.ThisKeyword) return true
  if (ts.isIdentifier(expression)) return expression.text === 'log'
  return ts.isPropertyAccessExpression(expression) && expression.expression.kind === ts.SyntaxKind.ThisKeyword && expression.name.text === 'log'
}

function nothing(factory) {
  return factory.createVoidZero()
}
