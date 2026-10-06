/* eslint-env node */
const assert = require('assert')
const React = require('react')
const entry = process.argv[2]
const mode = process.argv[3]
const names = ['Circle', 'Line', 'SemiCircle']

module.exports = async function run(loadShapes) {
  if (mode === 'ssr') {
    const ReactDOMServer = require('react-dom/server')
    const shapes = await loadShapes()
    assert.strictEqual(typeof global.window, 'undefined')
    assert.deepStrictEqual(Object.keys(shapes).sort(), names)
    names.forEach(name => {
      assert(/^<div/.test(ReactDOMServer.renderToString(React.createElement(shapes[name], { progress: 0.5 }))))
    })
    console.log('PASS no-DOM import and server rendering: ' + entry)
    return
  }
  const { JSDOM } = require('jsdom')
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { pretendToBeVisual: true })
  global.window = dom.window
  global.document = window.document
  Object.defineProperty(global, 'navigator', { configurable: true, value: window.navigator })
  global.requestAnimationFrame = window.requestAnimationFrame.bind(window)
  global.cancelAnimationFrame = window.cancelAnimationFrame.bind(window)
  // Keep the old React scheduler in JSDOM rather than Node's worker-port realm.
  global.MessageChannel = window.MessageChannel
  // Geometry is synthetic; the dependency, animation and promises are real.
  window.SVGElement.prototype.getTotalLength = () => 100
  window.SVGElement.prototype.getBoundingClientRect = () => ({ width: 100, height: 100 })
  const ReactDOM = require('react-dom')
  const shapes = await loadShapes()
  const container = document.getElementById('root')
  const render = (name, props) => {
    const element = React.createElement(shapes[name], props)
    ReactDOM.render(process.env.PROGRESSBAR_STRICT_MODE === '1' ? React.createElement(React.StrictMode, null, element) : element, container)
  }
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
  const settle = async (shape, expected) => {
    const deadline = Date.now() + 2000
    while (Date.now() < deadline) {
      const tween = shape._progressPath._tweenable
      if (shape.value() === expected && tween && !tween.isPlaying()) return
      await delay(10)
    }
    throw new Error('Animation did not finish at ' + expected)
  }
  try {
    for (const name of names) {
      const operations = mode === 'interrupt' || mode === 'published-cancel'
        ? ['replace', 'repeat', 'react-update', 'set', 'stop', 'destroy', 'unmount']
        : [mode]
      for (const operation of operations) {
        let shape
        let first = 0
        let second = 0
        const attachment = { sameObject: true }
        const attachments = []
        const props = {
          progress: 0,
          options: {
            duration: operation === 'zero' ? 0 : 120,
            attachment,
            step: (state, reference, data) => { shape = reference; attachments.push(data) }
          }
        }
        render(name, props)
        assert(shape, name + ': real shape initializes')
        const originalText = shape.text
        const node = shape.path
        assert.strictEqual(container.querySelectorAll('svg').length, 1)
        assert.strictEqual(container.querySelectorAll('path').length, 1)
        shape.animate(0.9, () => { first++ })
        const tween = shape._progressPath._tweenable
        if (operation === 'zero') {
          assert.strictEqual(tween._duration, 0)
          assert.strictEqual(shape.value(), 0.9)
          await delay(0)
          assert.strictEqual(first, 1)
        } else if (operation === 'callback-error' || operation === 'callback-record') {
          await settle(shape, 0.9)
          shape.animate(0.1, { duration: 0 }, () => {
            if (operation === 'callback-error') throw new Error('unexpected-completion-error')
            // Deliberately prove callback errors cannot be mistaken for cancellation.
            throw { error: 'stop() executed while tween isPlaying.', currentState: shape._progressPath._tweenable._currentState, attachment: undefined } // eslint-disable-line no-throw-literal
          })
          await delay(25)
          throw new Error('Expected callback failure did not terminate the strict child')
        } else if (operation === 'unexpected-rejection' || operation === 'similar-record') {
          tween._reject(operation === 'unexpected-rejection'
            ? new Error('unexpected-tween-rejection')
            : { error: 'stop() executed while tween isPlaying.', currentState: {}, attachment: undefined })
          await delay(25)
          throw new Error('Expected rejection did not terminate the strict child')
        } else if (operation === 'complete') {
          await settle(shape, 0.9)
          assert.strictEqual(first, 1)
          shape.animate(0.3, { duration: 30 }, () => { second++ })
          await settle(shape, 0.3)
          assert.strictEqual(second, 1)
        } else {
          await delay(20)
          assert(tween.isPlaying())
          const before = shape.value()
          const state = tween._currentState
          const retained = Object.assign({}, state)
          if (operation === 'replace' || operation === 'repeat') {
            shape.animate(0.3, { duration: 30 }, () => { second++ })
            if (operation === 'repeat') shape.animate(0.3, { duration: 30 }, () => { second++ })
          } else if (operation === 'react-update') {
            render(name, Object.assign({}, props, { progress: 0.2 }))
            render(name, Object.assign({}, props, { progress: 0.3 }))
          } else if (operation === 'set') shape.set(0.4)
          else if (operation === 'stop') shape.stop()
          else if (operation === 'destroy') shape.destroy()
          else ReactDOM.unmountComponentAtNode(container)
          if (['replace', 'repeat', 'react-update'].includes(operation)) await settle(shape, 0.3)
          else if (operation === 'unmount') await settle(shape, 0.9)
          else await delay(30)
          assert.strictEqual(first, operation === 'unmount' ? 1 : 0, 'Canceled completion callback must stay uncalled')
          assert.strictEqual(second, operation === 'replace' || operation === 'repeat' ? 1 : 0)
          if (operation !== 'unmount') assert.deepStrictEqual(state, retained, 'Cancellation must not finish the old state')
          if (operation === 'set') assert.strictEqual(shape.value(), 0.4)
          if (operation === 'stop') assert.strictEqual(shape.value(), before)
          if (operation === 'destroy') assert.strictEqual(shape.svg, null)
        }
        assert(attachments.every(data => data === attachment), 'Attachment identity changed')
        if (operation !== 'destroy') assert.strictEqual(shape.path, node)
        ReactDOM.unmountComponentAtNode(container)
        if (operation !== 'destroy') {
          shape.text = originalText
          shape.destroy()
        }
      }
    }
    console.log('PASS ' + mode + ': three shapes; ' + entry)
  } finally {
    dom.window.close()
  }
}

if (require.main === module) {
  module.exports(() => Promise.resolve(require(entry))).catch(error => {
    console.error(error.stack)
    process.exitCode = 1
  })
}
