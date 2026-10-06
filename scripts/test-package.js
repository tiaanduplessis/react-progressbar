/* eslint-env node */
const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')
const { execFileSync, spawnSync } = require('child_process')
const { stagePackage, remove } = require('./build')
const root = path.resolve(__dirname, '..')
const rollup = require.resolve('rollup/dist/bin/rollup')
const environment = Object.assign({}, process.env, { npm_config_ignore_scripts: 'true', NODE_PATH: '' })
const baselineIndex = process.argv.indexOf('--baseline')
const baselineArchive = baselineIndex >= 0 ? path.resolve(process.argv[baselineIndex + 1]) : null
const extractedArgument = process.argv[2] && process.argv[2] !== '--baseline' ? path.resolve(process.argv[2]) : null

function run(command, args, cwd) {
  return execFileSync(command, args, { cwd, encoding: 'utf8', timeout: 30000, env: environment, stdio: ['ignore', 'pipe', 'pipe'] })
}

function checkPackage(directory) {
  const pkg = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'))
  ;['main', 'module', 'jsnext:main'].forEach(field => {
    assert(pkg[field], 'Missing ' + field + ' declaration')
    assert(fs.existsSync(path.join(directory, pkg[field])), 'Missing packed entry: ' + pkg[field])
  })
  assert(fs.existsSync(path.join(directory, 'README.md')), 'Missing packed README')
  assert.strictEqual(pkg.license, 'MIT')
  assert(/MIT/.test(fs.readFileSync(path.join(directory, 'README.md'), 'utf8')), 'Missing license notice')
  ;[pkg.main, pkg.module].forEach(entry => {
    const file = path.join(directory, entry + '.map')
    const map = JSON.parse(fs.readFileSync(file, 'utf8'))
    const ownSource = map.sources.findIndex(source => path.resolve(path.dirname(file), source) === path.join(directory, 'src/index.js'))
    assert(ownSource >= 0, 'Packed map must resolve to packed component source')
    assert.strictEqual(map.sourcesContent[ownSource], fs.readFileSync(path.join(directory, 'src/index.js'), 'utf8'))
  })
  // Only React is installed beside the extracted artifact.
  const modules = path.join(directory, 'node_modules')
  fs.mkdirSync(modules)
  fs.symlinkSync(path.dirname(require.resolve('react/package.json')), path.join(modules, 'react'), 'junction')
  const esmConsumer = path.join(directory, 'esm-consumer.js')
  run(process.execPath, [rollup, path.join(directory, pkg.module), '--format', 'cjs', '--external', 'react', '--file', esmConsumer], directory)
  const entries = [[path.join(directory, pkg.main), 'test-package-consumer.js'], [esmConsumer, 'test-package-consumer.js']]
  entries.forEach(([entry, runner]) => {
    ;['ssr', 'complete', 'interrupt', 'zero'].forEach(mode => {
      process.stdout.write(run(process.execPath, ['--unhandled-rejections=strict', path.join(__dirname, runner), entry, mode], directory))
    })
    ;['callback-error', 'callback-record', 'unexpected-rejection', 'similar-record'].forEach(mode => {
      const result = spawnSync(process.execPath, ['--unhandled-rejections=strict', path.join(__dirname, runner), entry, mode], { cwd: directory, encoding: 'utf8', timeout: 6000, env: environment })
      assert(!result.error, result.error && result.error.message)
      assert.strictEqual(result.status, 1, 'Unexpected errors must remain observable: ' + mode)
      const message = mode === 'callback-error' ? 'unexpected-completion-error' : mode === 'unexpected-rejection' ? 'unexpected-tween-rejection' : 'ERR_UNHANDLED_REJECTION'
      assert(result.stderr.includes(message), result.stderr)
      assert(!result.stderr.includes('did not terminate the strict child'), result.stderr)
    })
  })
}

function comparePublished(archive, temporary) {
  const integrity = 'sha512-' + crypto.createHash('sha512').update(fs.readFileSync(archive)).digest('base64')
  assert.strictEqual(integrity, 'sha512-d3WzKKmS0WAhF6iCBuGgCgOC66oRXlPRQLG7Mn8eb9/63PKu5lkCxVT2J+X/5N5rppkg3APzKhOG/iSiQErNog==', 'Expected original published 1.0.0 archive')
  const destination = path.join(temporary, 'published')
  fs.mkdirSync(destination)
  run('tar', ['-xzf', archive, '-C', destination], temporary)
  const directory = path.join(destination, 'package')
  const pkg = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'))
  assert.strictEqual(pkg.version, '1.0.0')
  assert(!fs.existsSync(path.join(directory, pkg.module)), 'Historical missing ESM control changed')
  fs.mkdirSync(path.join(directory, 'node_modules'))
  fs.symlinkSync(path.dirname(require.resolve('react/package.json')), path.join(directory, 'node_modules/react'), 'junction')
  ;['ssr', 'published-cancel'].forEach(mode => {
    process.stdout.write(run(process.execPath, ['--unhandled-rejections=strict', path.join(__dirname, 'test-package-consumer.js'), path.join(directory, pkg.main), mode], directory))
  })
  console.log('Published 1.0.0 cancellation/callback baseline matches; its missing ESM entry is retained as a negative control')
}

async function main() {
  // This qualification command uses strict rejection handling;
  // it requires Node 14+. The package runtime engine declaration is unchanged.
  assert(Number(process.versions.node.split('.')[0]) >= 14, 'Packed qualification requires Node 14 or newer')
  if (extractedArgument) return checkPackage(extractedArgument)
  const staged = await stagePackage()
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'react-progressbar-package-'))
  try {
    run('npm', ['pack', staged.package, '--ignore-scripts', '--cache', path.join(temporary, 'npm-cache')], temporary)
    const archives = fs.readdirSync(temporary).filter(name => /\.tgz$/.test(name))
    assert.strictEqual(archives.length, 1)
    run('tar', ['-xzf', path.join(temporary, archives[0]), '-C', temporary], temporary)
    const extracted = path.join(temporary, 'package')
    ;['dist/index.js', 'dist/index.es.js', 'dist/index.js.map', 'dist/index.es.js.map'].forEach(file => {
      assert(fs.readFileSync(path.join(extracted, file)).equals(fs.readFileSync(path.join(staged.package, file))), 'Packed output differs from fresh staging')
    })
    checkPackage(extracted)
    if (baselineArchive) comparePublished(baselineArchive, temporary)
    console.log('Fresh packed CJS/ESM cancellation, error-visibility and SSR checks passed')
  } finally {
    remove(temporary)
    staged.cleanup()
  }
}
process.chdir(root)
main().catch(error => { console.error(error.stack); process.exitCode = 1 })
