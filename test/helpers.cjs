const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { transformSync } = require('@babel/core')
const { JSDOM } = require('jsdom')

function installDOM () {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    pretendToBeVisual: true,
    url: 'http://localhost/'
  })
  global.window = dom.window
  global.self = dom.window
  global.document = dom.window.document
  // React 16's scheduler otherwise selects Node's persistent MessageChannel.
  global.MessageChannel = dom.window.MessageChannel
  // jsdom does not implement SVG geometry. Tests exercise actual progressbar.js
  // DOM/style behavior using a deterministic path length, not geometric accuracy.
  dom.window.SVGElement.prototype.getTotalLength = () => 100
  return dom
}

function loadSource (progressbar) {
  const filename = path.resolve(__dirname, '../src/index.js')
  const code = transformSync(fs.readFileSync(filename, 'utf8'), {
    filename,
    babelrc: false,
    configFile: false,
    plugins: [
      '@babel/plugin-transform-react-jsx',
      '@babel/plugin-transform-class-properties',
      '@babel/plugin-transform-object-rest-spread',
      '@babel/plugin-transform-modules-commonjs'
    ]
  }).code
  const module = { exports: {} }
  const scopedRequire = name => name === 'progressbar.js' && progressbar
    ? progressbar
    : require(name)
  vm.runInThisContext('(function (require, module, exports) {' + code + '\n})', { filename })(
    scopedRequire, module, module.exports
  )
  return module.exports
}

module.exports = { installDOM, loadSource }
