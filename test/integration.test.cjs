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

test('zero-duration updates preserve animation step state without the default delay', async () => {
  for (const name of ['Circle', 'Line', 'SemiCircle']) {
    const Shape = shapes[name]({}).type
    const Type = shapes[name]({}).props.Type
    const container = document.createElement('div')
    document.body.appendChild(container)
    let instance
    const steps = []
    const attachment = { label: 'custom-data' }
    const step = (state, shape, data) => {
      steps.push({ state: { ...state }, shape, data })
    }
    const ref = value => {
      instance = value
    }
    ReactDOM.render(React.createElement(Shape, {
      Type, duration: 100, options: { duration: 0, attachment },
      progress: 0.5, from: { x: 0 }, to: { x: 1 }, step, ref
    }), container)
    // Explicitly characterize the draft's upstream timing change: no final
    // animation step runs synchronously before the next frame.
    assert.deepEqual(steps.map(call => call.state), [{ x: 0 }])
    await new Promise(resolve => setTimeout(resolve, 50))
    assert.equal(instance.shape.value(), 0.5)
    assert.deepEqual(steps[0].state, { x: 0 })
    assert.deepEqual(steps.at(-1).state, { offset: 50, x: 0.5 })
    assert.equal(steps.at(-1).shape, instance.shape)
    assert.deepEqual(steps.at(-1).data, attachment)
    // progressbar.js 1.1.1's pollution fix deep-merges options, cloning this value.
    assert.notEqual(steps.at(-1).data, attachment)
    const textNode = instance.shape.text
    ReactDOM.render(React.createElement(Shape, { Type, progress: 0.75, ref }), container)
    await new Promise(resolve => setTimeout(resolve, 50))
    assert.equal(instance.shape.value(), 0.75)
    assert.deepEqual(steps.at(-1).state, { offset: 25, x: 0.75 })
    for (const progress of [0.1, 0.4, 0.9]) {
      ReactDOM.render(React.createElement(Shape, { Type, progress, ref }), container)
    }
    await new Promise(resolve => setTimeout(resolve, 50))
    assert.equal(instance.shape.value(), 0.9)
    assert.deepEqual(steps.at(-1).state, { offset: 10, x: 0.9 })
    assert.equal(steps.at(-1).shape, instance.shape)
    assert.deepEqual(steps.at(-1).data, attachment)
    // Keep this dependency-compatibility assertion separate from the known text bug.
    instance.shape.text = textNode
    instance.destroy()
    ReactDOM.unmountComponentAtNode(container)
    container.remove()
  }
})

test.after(() => dom.window.close())
