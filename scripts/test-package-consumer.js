/* eslint-env node */
const assert = require('assert')
const React = require('react')
const entry = process.argv[2]
const mode = process.argv[3]
const names = ['Circle', 'Line', 'SemiCircle']

if (mode === 'ssr') {
  const ReactDOMServer = require('react-dom/server')
  const shapes = require(entry)
  assert.strictEqual(typeof global.window, 'undefined')
  assert.deepStrictEqual(Object.keys(shapes).sort(), names)
  names.forEach(name => {
    assert(/^<div/.test(ReactDOMServer.renderToString(React.createElement(shapes[name], { progress: 0.5 }))))
  })
  console.log('PASS no-DOM import and server rendering: ' + entry)
} else {
  const { JSDOM } = require('jsdom')
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { pretendToBeVisual: true })
  global.window = dom.window
  global.document = dom.window.document
  Object.defineProperty(global, 'navigator', { configurable: true, value: window.navigator })
  global.requestAnimationFrame = window.requestAnimationFrame.bind(window)
  global.cancelAnimationFrame = window.cancelAnimationFrame.bind(window)
  // Keep React's scheduler in the same DOM environment. Modern Node exposes a
  // MessageChannel whose worker ports otherwise keep this old React alive.
  global.MessageChannel = window.MessageChannel
  // JSDOM does not implement native SVG geometry. This checks real dependency
  // execution and generated elements, not browser layout or rendering quality.
  window.SVGElement.prototype.getTotalLength = () => 100
  window.SVGElement.prototype.getBoundingClientRect = () => ({ width: 100, height: 100 })
  const ReactDOM = require('react-dom')
  const shapes = require(entry)
  const container = document.getElementById('root')

  const delay = () => {
    return new Promise(resolve => setTimeout(resolve, 10))
  }

  const settle = async (shape, expected) => {
    const deadline = Date.now() + 2000
    while (Date.now() < deadline) {
      const tween = shape._progressPath._tweenable
      if (shape.value() === expected && tween && !tween.isPlaying()) return
      await delay()
    }
    throw new Error('Animation did not finish at ' + expected)
  }

  const checkShapes = async () => {
    for (const name of names) {
      let shape
      let steps = 0
      const props = {
        progress: 0.25,
        options: {
          duration: 30,
          step: (state, reference) => { shape = reference; steps++ }
        }
      }
      ReactDOM.render(React.createElement(shapes[name], props), container)
      assert(shape, name + ': real dependency should initialize the shape')
      await settle(shape, 0.25)
      assert(steps > 1, name + ': expected real animation callbacks')
      const first = shape
      const node = shape.path
      const text = shape.text
      assert.strictEqual(container.querySelectorAll('svg').length, 1)
      assert.strictEqual(container.querySelectorAll('path').length, 1)
      ReactDOM.render(React.createElement(shapes[name], Object.assign({}, props, { progress: 0.75 })), container)
      await settle(shape, 0.75)
      assert.strictEqual(shape, first)
      assert.strictEqual(shape.path, node)
      ReactDOM.unmountComponentAtNode(container)
      // Existing component lifecycle does not destroy its shape. The test owns
      // cleanup after completion; it never interrupts a running animation.
      // Restore the original text node after the wrapper's existing assignment.
      shape.text = text
      shape.destroy()
    }
    console.log('PASS three real shapes and completed animations: ' + entry)
  }

  checkShapes().then(() => dom.window.close(), error => {
    console.error(error.stack)
    process.exitCode = 1
    dom.window.close()
  })
}
