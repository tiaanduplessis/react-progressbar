const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const acorn = require('acorn')
const { installDOM } = require('./helpers.cjs')
const dom = installDOM()
const React = require('react')
const ReactDOM = require('react-dom')
const root = path.resolve(__dirname, '..')

test('both distribution formats parse at the Node 8 / ES2017 syntax level', () => {
  for (const [file, sourceType] of [['dist/index.js', 'script'], ['dist/index.es.js', 'module']]) {
    const code = fs.readFileSync(path.join(root, file), 'utf8')
    acorn.parse(code, { ecmaVersion: 2017, sourceType })
    assert.match(code, sourceType === 'module' ? /from 'react'/ : /require\('react'\)/)
    assert.doesNotMatch(code, /react\.production\.min|react\.development\.js/)
    const map = JSON.parse(fs.readFileSync(path.join(root, file + '.map'), 'utf8'))
    assert.ok(map.sources.some(source => source.endsWith('src/index.js')))
  }
})

test('CJS and native ESM imports expose named shapes with real SVG rendering', async () => {
  // Keep the documented .es.js filename; .mjs selects native ESM semantics in
  // this test without changing the package's longstanding CommonJS default.
  const esmPath = path.join(root, 'dist/.consumer-test.mjs')
  fs.copyFileSync(path.join(root, 'dist/index.es.js'), esmPath)
  try {
    const modules = [require('../dist/index.js'), await import(pathToFileURL(esmPath).href)]
    for (const exports of modules) {
      assert.deepEqual(Object.keys(exports).sort(), ['Circle', 'Line', 'SemiCircle'])
      for (const name of Object.keys(exports)) {
        const container = document.createElement('div')
        document.body.appendChild(container)
        ReactDOM.render(React.createElement(exports[name], { color: '#123456' }), container)
        assert.equal(container.querySelectorAll('svg').length, 1)
        assert.ok(container.querySelector('path[stroke="#123456"]'))
        ReactDOM.unmountComponentAtNode(container)
        container.remove()
      }
    }
  } finally {
    fs.unlinkSync(esmPath)
  }
})

test.after(() => dom.window.close())
