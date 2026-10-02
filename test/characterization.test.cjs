const { test } = require('node:test')
const assert = require('node:assert/strict')
const { installDOM, loadSource } = require('./helpers.cjs')
const dom = installDOM()
const React = require('react')
const ReactDOM = require('react-dom')

function fixture () {
  const calls = []
  function makeType (name) {
    return class {
      constructor (container, options) {
        this.container = container
        this.options = options
        this.value = () => 0.25
        calls.push(['construct', name, container, options, this])
      }

      animate (value, options) {
        calls.push(options === undefined ? ['animate', value] : ['animate', value, options])
      }

      set (value) { calls.push(['set', value]) }
      destroy () { calls.push(['destroy']) }
    }
  }
  const library = { Circle: makeType('Circle'), Line: makeType('Line'), SemiCircle: makeType('SemiCircle') }
  return { calls, library, exports: loadSource(library) }
}

function mount (element) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  ReactDOM.render(element, container)
  return {
    container,
    update (next) { ReactDOM.render(next, container) },
    unmount () {
      ReactDOM.unmountComponentAtNode(container)
      container.remove()
    }
  }
}

test('exports exactly the three shapes and constructs the matching real DOM container', () => {
  const f = fixture()
  assert.deepEqual(Object.keys(f.exports).sort(), ['Circle', 'Line', 'SemiCircle'])
  for (const name of Object.keys(f.library)) {
    const view = mount(React.createElement(f.exports[name], { progress: 0.5 }))
    const [kind, type, container, options] = f.calls.at(-2)
    assert.equal(kind, 'construct')
    assert.equal(type, name)
    assert.equal(container, view.container.firstChild)
    assert.deepEqual(options, {})
    assert.deepEqual(f.calls.at(-1), ['animate', 0.5])
    assert.equal(view.container.innerHTML, '<div></div>')
    view.unmount()
  }
})

test('passes documented options, applies options last, and strips only undefined values', () => {
  const f = fixture()
  const step = () => {}
  const props = {
    color: 'red', strokeWidth: 4, trailColor: 'pink', trailWidth: 2,
    svgStyle: null, text: { value: 'label' }, fill: null, duration: 0,
    easing: 'linear', from: { x: 0 }, to: { x: 1 }, step, warnings: false,
    options: { color: 'blue', trailWidth: undefined, custom: 5 }, progress: 0
  }
  const view = mount(React.createElement(f.exports.Circle, props))
  const expected = { ...props, color: 'blue', custom: 5 }
  for (const key of ['options', 'progress', 'trailWidth']) delete expected[key]
  assert.deepEqual(f.calls[0][3], expected)
  assert.equal(f.calls.length, 1)
  view.unmount()
})

test('initial progress is animated only when truthy', () => {
  for (const progress of [undefined, null, 0, false, '', 0.5, 1, -1]) {
    const f = fixture()
    const view = mount(React.createElement(f.exports.Line, { progress }))
    assert.deepEqual(f.calls.slice(1), progress ? [['animate', progress]] : [])
    view.unmount()
  }
})

test('updates animate zero and undefined, assign text, and do not rebuild shape options', () => {
  const f = fixture()
  const view = mount(React.createElement(f.exports.Circle, { progress: 0.2, color: 'red' }))
  const shape = f.calls[0][4]
  view.update(React.createElement(f.exports.Circle, { progress: 0, color: 'blue', text: 'new' }))
  assert.deepEqual(f.calls.at(-1), ['animate', 0])
  assert.equal(shape.text, 'new')
  assert.deepEqual(shape.options, { color: 'red' })
  view.update(React.createElement(f.exports.Circle))
  assert.deepEqual(f.calls.at(-1), ['animate', undefined])
  assert.equal(shape.text, '')
  assert.equal(f.calls.filter(call => call[0] === 'construct').length, 1)
  view.unmount()
})

test('characterizes existing missing DOM prop forwarding and unmount cleanup', () => {
  const f = fixture()
  const view = mount(React.createElement(f.exports.Line, {
    id: 'expected-id', className: 'expected-class', style: { width: '200px' }, 'data-test': 'value'
  }))
  assert.equal(view.container.innerHTML, '<div></div>')
  view.update(React.createElement(f.exports.Line, { id: 'updated' }))
  assert.equal(view.container.innerHTML, '<div></div>')
  view.unmount()
  assert.equal(f.calls.filter(call => call[0] === 'destroy').length, 0)
})

test('characterizes existing imperative methods, including value returning the function', () => {
  const f = fixture()
  const Shape = f.exports.Circle({}).type
  let instance
  const view = mount(React.createElement(Shape, {
    Type: f.library.Circle,
    ref: value => { instance = value }
  }))
  const shape = f.calls[0][4]
  assert.equal(instance.value(), shape.value)
  instance.set(0.8)
  instance.animate(0.4)
  instance.setText('updated')
  assert.deepEqual(f.calls.slice(1), [['set', 0.8], ['animate', 0.4]])
  assert.equal(shape.text, 'updated')
  instance.destroy()
  instance.destroy()
  assert.equal(instance.shape, null)
  assert.equal(f.calls.filter(call => call[0] === 'destroy').length, 1)
  view.unmount()
})

test('Type prop continues to override the wrapper default', () => {
  const f = fixture()
  const view = mount(React.createElement(f.exports.Circle, { Type: f.library.Line }))
  assert.equal(f.calls[0][1], 'Line')
  view.unmount()
})

test('server rendering does not load the browser-only progressbar entry', () => {
  const server = require('react-dom/server')
  const browserOnly = new Proxy({}, {
    get () { throw new Error('The browser library must not be used during SSR') }
  })
  const shapes = loadSource(browserOnly)
  for (const name of ['Circle', 'Line', 'SemiCircle']) {
    assert.match(server.renderToString(React.createElement(shapes[name], { progress: 0.5 })), /^<div.*><\/div>$/)
  }
})

test('zero duration keeps the animation path, including options precedence', () => {
  const f = fixture()
  const view = mount(React.createElement(f.exports.Line, { duration: 100, options: { duration: 0 }, progress: 0.5 }))
  assert.deepEqual(f.calls.at(-1), ['animate', 0.5, { duration: Number.MIN_VALUE }])
  view.update(React.createElement(f.exports.Line, { progress: 0 }))
  assert.deepEqual(f.calls.at(-1), ['animate', 0, { duration: Number.MIN_VALUE }])
  assert.equal(f.calls.filter(call => call[0] === 'set').length, 0)
  view.unmount()
})

test.after(() => dom.window.close())
