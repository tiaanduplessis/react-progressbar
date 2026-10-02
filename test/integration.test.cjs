const { test } = require('node:test')
const assert = require('node:assert/strict')
const { installDOM, loadSource } = require('./helpers.cjs')
const dom = installDOM()
const React = require('react')
const ReactDOM = require('react-dom')
const shapes = loadSource()

test('actual progressbar.js constructs SVG, applies options and animates all shapes', async () => {
  for (const name of ['Circle', 'Line', 'SemiCircle']) {
    const Shape = shapes[name]({}).type
    const Type = shapes[name]({}).props.Type
    const container = document.createElement('div')
    document.body.appendChild(container)
    let instance
    ReactDOM.render(React.createElement(Shape, {
      Type, color: '#ff0000', strokeWidth: 4, trailColor: '#eeeeee',
      duration: 1, progress: 0.5, text: { value: 'initial' },
      ref: value => { instance = value }
    }), container)
    await new Promise(resolve => setTimeout(resolve, 50))
    const shape = instance.shape
    assert.equal(container.querySelectorAll('svg').length, 1)
    assert.equal(shape.path.getAttribute('stroke'), '#ff0000')
    assert.equal(shape.path.getAttribute('stroke-width'), '4')
    assert.equal(shape.value(), 0.5)
    assert.equal(shape.path.style.strokeDashoffset, '50')
    assert.equal(shape.text.textContent, 'initial')
    instance.set(0.25)
    assert.equal(shape.value(), 0.25)
    assert.equal(shape.path.style.strokeDashoffset, '75')
    instance.destroy()
    assert.equal(container.querySelector('svg'), null)
    ReactDOM.unmountComponentAtNode(container)
    container.remove()
  }
})

test('actual-library text updates retain the existing DOM text bug', async () => {
  const Shape = shapes.Line({}).type
  const Type = shapes.Line({}).props.Type
  const container = document.createElement('div')
  document.body.appendChild(container)
  let instance
  const ref = value => {
    instance = value
  }
  ReactDOM.render(React.createElement(Shape, {
    Type, duration: 1, progress: 0.2, text: { value: 'initial' }, ref
  }), container)
  const shape = instance.shape
  const textNode = shape.text
  ReactDOM.render(React.createElement(Shape, { Type, duration: 1, progress: 0.75, text: 'updated', ref }), container)
  await new Promise(resolve => setTimeout(resolve, 50))
  assert.equal(shape.value(), 0.75)
  assert.equal(shape.text, 'updated')
  assert.equal(textNode.textContent, 'initial')
  // Restore the library's text-node pointer solely so the test can clean up.
  shape.text = textNode
  instance.destroy()
  ReactDOM.unmountComponentAtNode(container)
  container.remove()
})

test.after(() => dom.window.close())
