/* eslint-env node */
const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')

const root = path.resolve(__dirname, '..')
const rollup = require.resolve('rollup/dist/bin/rollup')

function run(command, args, cwd) {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    timeout: 30000,
    env: Object.assign({}, process.env, { npm_config_ignore_scripts: 'true', NODE_PATH: '' }),
    stdio: ['ignore', 'pipe', 'pipe']
  })
}

function remove(directory) {
  fs.readdirSync(directory).forEach(name => {
    const file = path.join(directory, name)
    if (fs.lstatSync(file).isDirectory()) remove(file)
    else fs.unlinkSync(file)
  })
  fs.rmdirSync(directory)
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

  // Supply only the React peer. Bundled outputs must not need progressbar.js or
  // Shifty from the development checkout or from a consumer's dependency tree.
  const modules = path.join(directory, 'node_modules')
  fs.mkdirSync(modules)
  fs.symlinkSync(path.dirname(require.resolve('react/package.json')), path.join(modules, 'react'), 'junction')

  const esmConsumer = path.join(directory, 'esm-consumer.js')
  run(process.execPath, [rollup, path.join(directory, pkg.module), '--format', 'cjs', '--external', 'react', '--file', esmConsumer], directory)
  ;[path.join(directory, pkg.main), esmConsumer].forEach(entry => {
    ;['ssr', 'dom'].forEach(mode => {
      process.stdout.write(run(process.execPath, [path.join(__dirname, 'test-package-consumer.js'), entry, mode], directory))
    })
  })
}

// Accept an existing extracted package to exercise the historical negative
// controls without checking the development dependency version first.
if (process.argv[2]) {
  checkPackage(path.resolve(process.argv[2]))
} else {
  const progressbarDirectory = path.dirname(require.resolve('progressbar.js/package.json'))
  const version = run(process.execPath, ['-p', "require('shifty/package.json').version"], progressbarDirectory).trim()
  assert.strictEqual(version, '2.9.1', 'Unexpected Shifty at progressbar.js require site')
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'react-progressbar-package-'))
  try {
    run(process.execPath, [rollup, '-c'], root)
    // Run npm from the temporary directory so the archive never enters the
    // source tree. No install, prepare, publish or release hooks are executed.
    // npm_execpath may point to Yarn when invoked with yarn test:package.
    run('npm', ['pack', root, '--ignore-scripts', '--cache', path.join(temporary, 'npm-cache')], temporary)
    const archives = fs.readdirSync(temporary).filter(name => /\.tgz$/.test(name))
    assert.strictEqual(archives.length, 1, 'Expected exactly one packed archive')
    // This developer check requires POSIX tar and extracts only its own npm pack.
    run('tar', ['-xzf', path.join(temporary, archives[0]), '-C', temporary], temporary)
    checkPackage(path.join(temporary, 'package'))
    console.log('Packed CJS/ESM smoke checks passed; interrupted animations remain unqualified')
  } finally {
    remove(temporary)
  }
}
