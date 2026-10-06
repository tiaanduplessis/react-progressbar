/* eslint-env node */
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { rollup } = require('rollup')
const config = require('../rollup.config')
const root = path.resolve(__dirname, '..')

function remove(directory) {
  if (!fs.existsSync(directory)) return
  fs.readdirSync(directory).forEach(name => {
    const file = path.join(directory, name)
    if (fs.lstatSync(file).isDirectory()) remove(file)
    else fs.unlinkSync(file)
  })
  fs.rmdirSync(directory)
}

function copy(source, destination) {
  if (fs.statSync(source).isDirectory()) {
    fs.mkdirSync(destination)
    fs.readdirSync(source).forEach(name => copy(path.join(source, name), path.join(destination, name)))
  } else fs.writeFileSync(destination, fs.readFileSync(source))
}

async function stagePackage(configuration) {
  const directory = fs.mkdtempSync(path.join(root, '.progressbar-build-'))
  const staged = path.join(directory, 'package')
  fs.mkdirSync(staged)
  fs.mkdirSync(path.join(staged, 'dist'))
  try {
    const settings = configuration || config()
    const outputs = settings.output
    assert.deepStrictEqual(outputs.map(output => output.format), ['cjs', 'es'], 'Both CJS and ESM outputs are required')
    assert.deepStrictEqual(outputs.map(output => output.file), ['dist/index.js', 'dist/index.es.js'], 'Unexpected package output paths')
    const input = Object.assign({}, settings)
    delete input.output
    input.input = path.resolve(root, input.input)
    const bundle = await rollup(input)
    for (const output of outputs) {
      await bundle.write(Object.assign({}, output, {
        file: path.join(staged, output.file),
        sourcemapFile: path.join(root, output.file)
      }))
      assert(fs.statSync(path.join(staged, output.file)).size > 0)
      assert(fs.statSync(path.join(staged, output.file + '.map')).size > 0)
    }
    ;['package.json', 'README.md', 'src'].forEach(file => copy(path.join(root, file), path.join(staged, file)))
    outputs.forEach(output => {
      const file = path.join(staged, output.file + '.map')
      const map = JSON.parse(fs.readFileSync(file, 'utf8'))
      const ownSource = map.sources.findIndex(source => path.resolve(path.dirname(file), source) === path.join(staged, 'src/index.js'))
      assert(ownSource >= 0, 'Source map must resolve to the packaged component source')
      assert.strictEqual(map.sourcesContent[ownSource], fs.readFileSync(path.join(staged, 'src/index.js'), 'utf8'))
    })
    return { directory, package: staged, cleanup: () => remove(directory) }
  } catch (error) {
    remove(directory)
    throw error
  }
}

function promote(staged, destination) {
  const backup = path.join(staged.directory, 'previous-dist')
  let previous = false
  let cleanup = true
  try {
    if (fs.existsSync(destination)) {
      fs.renameSync(destination, backup)
      previous = true
    }
    try {
      fs.renameSync(path.join(staged.package, 'dist'), destination)
    } catch (error) {
      if (previous) {
        try {
          fs.renameSync(backup, destination)
        } catch (restoreError) {
          cleanup = false
          throw new Error('Could not restore dist; previous output is retained at ' + backup + ': ' + restoreError.message)
        }
      }
      throw error
    }
  } finally {
    if (cleanup) staged.cleanup()
  }
}

async function build() {
  promote(await stagePackage(), path.join(root, 'dist'))
  console.log('Built and promoted both verified package formats')
}

module.exports = { stagePackage, remove, copy, promote, build }
if (require.main === module) {
  process.chdir(root)
  build().catch(error => { console.error(error.stack); process.exitCode = 1 })
}
