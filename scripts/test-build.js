/* eslint-env node */
const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')
const { rollup, watch } = require('rollup')
const { execFileSync } = require('child_process')
const resolve = require('rollup-plugin-node-resolve')
const commonjs = require('rollup-plugin-commonjs')
const { SourceMapConsumer } = require('source-map')
const guard = require('./progressbar-cancellation-plugin')
const { copy, remove, stagePackage, promote } = require('./build')
const projectConfig = require('../rollup.config')
const root = path.resolve(__dirname, '..')
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'progressbar-guard-'))
const dependency = path.dirname(require.resolve('progressbar.js/package.json'))
const engine = path.dirname(require.resolve('shifty/package.json'))
const target = path.join(fixture, 'node_modules/progressbar.js/src/path.js')
const engineFile = path.join(fixture, 'node_modules/shifty/dist/shifty.node.js')
const enginePackage = path.join(fixture, 'node_modules/shifty/package.json')
const input = path.join(fixture, 'src/index.js')
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const untouched = [path.join(dependency, 'src/path.js'), path.join(engine, 'dist/shifty.node.js')].map(file => [file, hash(file)])
const checks = []
fs.mkdirSync(path.join(fixture, 'node_modules'))
fs.mkdirSync(path.join(fixture, 'src'))
copy(dependency, path.join(fixture, 'node_modules/progressbar.js'))
copy(engine, path.join(fixture, 'node_modules/shifty'))
fs.writeFileSync(input, "import ProgressBar from 'progressbar.js'; export default ProgressBar;\n")

function settings(extra) {
  return Object.assign({
    input,
    plugins: [guard(fixture), resolve(), commonjs()],
    onwarn: warning => {
      if (warning.code !== 'CIRCULAR_DEPENDENCY') throw new Error(warning.message)
    }
  }, extra)
}

async function compile(options) {
  const bundle = await rollup(options)
  const outputs = []
  for (const format of ['cjs', 'es']) {
    const result = await bundle.generate({ format, file: path.join(fixture, format + '.js'), sourcemap: true })
    outputs.push(result.output[0])
  }
  return { cache: bundle.cache, outputs }
}

async function rejects(label, callback, pattern) {
  let rejected = false
  try { await callback() } catch (error) {
    assert(pattern.test(error.message), error.stack)
    rejected = true
  }
  assert(rejected, 'Expected guard failure: ' + label)
  checks.push(label)
}

async function altered(file, contents, callback) {
  const original = fs.readFileSync(file)
  try { fs.writeFileSync(file, contents); await callback() } finally { fs.writeFileSync(file, original) }
}

async function watchCheck(label, change, expectedError) {
  const output = path.join(fixture, 'watch-output')
  if (!fs.existsSync(output)) fs.mkdirSync(output)
  await new Promise((resolve, reject) => {
    let count = 0
    let changed = false
    const watcher = watch(Object.assign(settings(), {
      output: [{ format: 'cjs', file: path.join(output, 'index.js') }, { format: 'es', file: path.join(output, 'index.es.js') }],
      watch: { chokidar: false, clearScreen: false }
    }))
    const finish = error => { clearTimeout(timeout); watcher.close(); error ? reject(error) : resolve() }
    const timeout = setTimeout(() => finish(new Error('Watch timeout: ' + label)), 10000)
    watcher.on('event', event => {
      if (event.code === 'ERROR' || event.code === 'FATAL') {
        if (changed && expectedError && expectedError.test(event.error.message)) finish()
        else finish(event.error)
      }
      if (event.code === 'BUNDLE_END') {
        count++
        if (count === 1) {
          setTimeout(() => {
            try { changed = true; change() } catch (error) { finish(error) }
          }, 50)
        } else if (expectedError) finish(new Error('Expected watched guard rejection: ' + label))
        else finish()
      }
    })
  })
  checks.push(label)
}

async function main() {
  const shared = settings()
  const cold = await compile(shared)
  const warm = await compile(Object.assign({}, shared, { cache: cold.cache }))
  assert.strictEqual(cold.outputs[0].code, warm.outputs[0].code)
  assert.strictEqual(cold.outputs[1].code, warm.outputs[1].code)
  checks.push('cold and unchanged cached builds produce identical formats')
  for (const output of cold.outputs.concat(warm.outputs)) {
    const consumer = new SourceMapConsumer(output.map.toString())
    const source = fs.readFileSync(target, 'utf8')
    const anchor = 'cb();'
    const originalOffset = source.indexOf(anchor)
    const generatedOffset = output.code.indexOf(anchor)
    const position = text => ({ line: text.split('\n').length, column: text.length - text.lastIndexOf('\n') - 1 })
    const original = position(source.slice(0, originalOffset))
    const generated = position(output.code.slice(0, generatedOffset))
    const mapped = consumer.originalPositionFor(generated)
    assert.strictEqual(mapped.line, original.line)
    assert.strictEqual(mapped.column, original.column)
    assert(mapped.source.endsWith('progressbar.js/src/path.js'))
    assert.strictEqual(consumer.sourceContentFor(mapped.source), source)
  }
  checks.push('original callback positions and source content survive CJS/ESM maps')
  await altered(target, fs.readFileSync(target, 'utf8') + '\n', () => rejects('wrong Path hash', () => compile(settings()), /Path source hash/))
  await altered(target, fs.readFileSync(target, 'utf8').replace('}).then(function(state)', '}).then(function(other)'), () => rejects('changed patch anchor', () => compile(settings()), /Path source hash/))
  await altered(engineFile, fs.readFileSync(engineFile, 'utf8') + '\n', () => rejects('wrong Shifty bytes', () => compile(settings()), /Shifty entry bytes/))
  const metadata = JSON.parse(fs.readFileSync(enginePackage, 'utf8'))
  await altered(enginePackage, JSON.stringify(Object.assign({}, metadata, { version: '2.9.0' })), () => rejects('wrong Shifty version on reuse', () => compile(Object.assign({}, shared, { cache: warm.cache })), /Shifty metadata/))
  await altered(enginePackage, JSON.stringify(Object.assign({}, metadata, { main: 'dist/shifty.js' })), () => rejects('changed package entry on reuse', () => compile(Object.assign({}, shared, { cache: warm.cache })), /Shifty metadata/))
  await rejects('externalized engine', () => compile(settings({ external: id => id === 'shifty' })), /external Shifty entry/)
  await altered(input, 'export default 42;\n', () => rejects('absent target', () => compile(settings()), /exactly one patched/))
  const duplicateRoot = path.join(fixture, 'node_modules/duplicate-progressbar')
  copy(dependency, duplicateRoot)
  const extra = "import Other from 'duplicate-progressbar'; export { Other };\n"
  await altered(input, fs.readFileSync(input, 'utf8') + extra, () => rejects('duplicate package under alias', () => compile(settings()), /unexpected dependency copy/))
  fs.symlinkSync(path.join(fixture, 'node_modules/progressbar.js'), path.join(fixture, 'node_modules/linked-progressbar'), 'junction')
  await altered(input, fs.readFileSync(input, 'utf8') + "import Linked from 'linked-progressbar'; export { Linked };\n", () => rejects('duplicate symlink module identity', () => compile(settings({ preserveSymlinks: true })), /duplicate target|duplicate Shifty/))
  await altered(input, fs.readFileSync(input, 'utf8') + "import Prebuilt from 'progressbar.js/dist/progressbar.js'; export { Prebuilt };\n", () => rejects('alternative prebuilt dependency entry', () => compile(settings()), /unexpected dependency copy/))
  const engineBytes = fs.readFileSync(engineFile)
  const alterDuringLoad = { name: 'changed-entry-at-load-test', load(id) { if (id === engineFile) fs.appendFileSync(engineFile, '\n'); return null } }
  try {
    await rejects('loaded engine bytes are revalidated', () => compile(settings({ plugins: [alterDuringLoad, guard(fixture), resolve(), commonjs()] })), /Shifty entry changed before loading/)
  } finally { fs.writeFileSync(engineFile, engineBytes) }
  const adversary = {
    name: 'comment-only-handler-test',
    renderChunk(code) {
      const start = code.indexOf('function ignoreProgressbarCancellation(reason)')
      assert(start >= 0)
      const end = code.indexOf('throw reason;', start) + 'throw reason;'.length
      return { code: code.slice(0, start) + '/* function ignoreProgressbarCancellation(reason) */ function (reason) { throw reason;' + code.slice(end), map: null }
    }
  }
  await rejects('comment cannot masquerade as executable handler', () => compile(settings({ plugins: [guard(fixture), resolve(), commonjs(), adversary] })), /executable cancellation handler/)
  const alternateDirectory = path.join(fixture, 'node_modules/shifty/alternate')
  fs.mkdirSync(alternateDirectory)
  const identicalAlternative = path.join(alternateDirectory, 'shifty.node.js')
  fs.writeFileSync(identicalAlternative, fs.readFileSync(engineFile))
  const sameBytesElsewhere = { name: 'alternate-identical-entry-test', resolveId(id) { if (id === 'shifty') return identicalAlternative } }
  await rejects('identical bytes at an undeclared entry are rejected', () => compile(settings({ plugins: [sameBytesElsewhere, guard(fixture), resolve(), commonjs()] })), /Shifty entry path/)
  let changedResolution = false
  const alternate = path.join(fixture, 'node_modules/shifty/dist/shifty.js')
  const redirect = { name: 'changed-resolution-test', resolveId(id) { if (id === 'shifty' && changedResolution) return alternate } }
  const redirected = settings({ plugins: [redirect, guard(fixture), resolve(), commonjs()] })
  const beforeRedirect = await compile(redirected)
  changedResolution = true
  await rejects('resolver change cannot reuse stale cache', () => compile(Object.assign({}, redirected, { cache: beforeRedirect.cache })), /unexpected Shifty entry (?:bytes|path)/)
  const badGraph = JSON.parse(JSON.stringify(cold.cache))
  const proxy = badGraph.modules.find(module => module.id.endsWith('?commonjs-proxy') && module.id.includes('shifty.node.js'))
  assert(proxy)
  const key = Object.keys(proxy.resolvedIds).find(key => key.includes('shifty.node.js'))
  assert(key)
  proxy.resolvedIds[key] = Object.assign({}, proxy.resolvedIds[key], { external: true, id: 'unverified-shifty' })
  await rejects('actual cached graph is checked beyond fresh resolution', () => compile(settings({ cache: badGraph })), /external dependency|audited Shifty load/)
  const inputBytes = fs.readFileSync(input)
  try { await watchCheck('unchanged dependency revalidated on watch rebuild', () => fs.appendFileSync(input, '\n')) } finally { fs.writeFileSync(input, inputBytes) }
  const pathBytes = fs.readFileSync(target)
  try { await watchCheck('watched source bytes fail closed', () => fs.appendFileSync(target, '\n'), /Path source hash/) } finally { fs.writeFileSync(target, pathBytes) }
  const packageBytes = fs.readFileSync(enginePackage)
  try {
    await watchCheck('watched metadata fails closed despite resolver cache', () => fs.writeFileSync(enginePackage, JSON.stringify(Object.assign({}, metadata, { main: 'dist/shifty.js' }))), /Shifty metadata/)
  } finally { fs.writeFileSync(enginePackage, packageBytes) }
  await rejects('restored metadata remains rejected until restart', () => compile(settings()), /unexpected Shifty entry (?:bytes|path).*restart the build process/)
  const restart = `
    const { rollup } = require('rollup');
    const guard = require('./scripts/progressbar-cancellation-plugin');
    const resolve = require('rollup-plugin-node-resolve');
    const commonjs = require('rollup-plugin-commonjs');
    rollup({ input: ${JSON.stringify(input)}, plugins: [guard(${JSON.stringify(fixture)}), resolve(), commonjs()] })
      .then(async bundle => { for (const format of ['cjs', 'es']) await bundle.generate({ format }); console.log('RESTART_OK') })
      .catch(error => { console.error(error.stack); process.exitCode = 1 });
  `
  assert(execFileSync(process.execPath, ['-e', restart], { cwd: root, encoding: 'utf8', timeout: 6000 }).includes('RESTART_OK'))
  checks.push('fresh process accepts restored audited bytes at the same path')
  const incomplete = projectConfig()
  incomplete.output = incomplete.output.slice(0, 1)
  await rejects('missing second output prevents staging', () => stagePackage(incomplete), /Both CJS and ESM/)
  const project = projectConfig()
  const hadDist = fs.existsSync(path.join(root, 'dist'))
  const outputsBefore = ['index.js', 'index.es.js'].map(file => path.join(root, 'dist', file)).filter(file => fs.existsSync(file)).map(file => [file, hash(file)])
  project.plugins.push({ name: 'fail-second-output-test', generateBundle(output) { if (output.format === 'es') throw new Error('deliberate second-output failure') } })
  await rejects('second output failure prevents staged package', () => stagePackage(project), /deliberate second-output failure/)
  outputsBefore.forEach(([file, before]) => assert.strictEqual(hash(file), before))
  assert.strictEqual(fs.existsSync(path.join(root, 'dist')), hadDist)
  checks.push('failed staged build preserves prior dist and cannot provide a package')
  for (const restorationFails of [false, true]) {
    const promotionRoot = fs.mkdtempSync(path.join(fixture, 'promotion-'))
    const stagedDirectory = path.join(promotionRoot, 'staged')
    const packageDirectory = path.join(stagedDirectory, 'package')
    const destination = path.join(promotionRoot, 'dist')
    fs.mkdirSync(stagedDirectory)
    fs.mkdirSync(packageDirectory)
    fs.mkdirSync(path.join(packageDirectory, 'dist'))
    fs.mkdirSync(destination)
    fs.writeFileSync(path.join(destination, 'sentinel'), 'previous-good-output')
    fs.writeFileSync(path.join(packageDirectory, 'dist/new-output'), 'new')
    const originalRename = fs.renameSync
    fs.renameSync = (from, to) => {
      if (from === path.join(packageDirectory, 'dist') || (restorationFails && from === path.join(stagedDirectory, 'previous-dist'))) throw new Error('deliberate promotion failure')
      return originalRename(from, to)
    }
    try {
      assert.throws(() => promote({ directory: stagedDirectory, package: packageDirectory, cleanup: () => remove(stagedDirectory) }, destination), restorationFails ? /previous output is retained/ : /deliberate promotion failure/)
    } finally { fs.renameSync = originalRename }
    const preserved = restorationFails ? path.join(stagedDirectory, 'previous-dist/sentinel') : path.join(destination, 'sentinel')
    assert.strictEqual(fs.readFileSync(preserved, 'utf8'), 'previous-good-output')
    checks.push(restorationFails ? 'failed restoration retains recoverable backup' : 'failed promotion restores previous output')
  }
  const staging = await stagePackage()
  try {
    assert(fs.existsSync(path.join(staging.package, 'dist/index.js')))
    assert(fs.existsSync(path.join(staging.package, 'dist/index.es.js')))
  } finally { staging.cleanup() }
  untouched.forEach(([file, before]) => assert.strictEqual(hash(file), before, 'Installed dependency changed'))
  checks.push('audited installed dependency files remain byte-identical')
  console.log(JSON.stringify({ checks: checks.length, results: checks }, null, 2))
}
process.chdir(root)
main().catch(error => { console.error('Completed guard cases:', checks); console.error(error.stack); process.exitCode = 1 }).then(() => remove(fixture))
