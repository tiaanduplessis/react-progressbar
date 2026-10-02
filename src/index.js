import React from 'react'

const { Component, createRef } = React

// progressbar.js 1.1.1's browser entry requires `self` while being loaded.
// Delay loading until mount so importing/server-rendering stays safe in Node.
const createType = name => function (container, options) {
  const ProgressBar = require('progressbar.js')
  return new ProgressBar[name](container, options)
}

const CircleType = createType('Circle')
const LineType = createType('Line')
const SemiCircleType = createType('SemiCircle')

class Shape extends Component {
  constructor() {
    super()

    this.shape = null
    this.div = createRef()
    this.otherProps = {}
  }

  componentWillReceiveProps(nextProps) {
    this.animate(nextProps.progress)
    this.setText(nextProps.text)
  }

  shouldComponentUpdate() {
    return false
  }

  componentDidMount() {
    const {
      options,
      Type,
      color,
      strokeWidth,
      trailColor,
      trailWidth,
      svgStyle,
      text,
      fill,
      duration,
      easing,
      from,
      to,
      progress,
      step,
      warnings,
      ...otherProps
    } = this.props

    const opts = Object.assign(
      {
        color,
        strokeWidth,
        trailColor,
        trailWidth,
        svgStyle,
        text,
        fill,
        duration,
        easing,
        from,
        to,
        step,
        warnings
      },
      options
    )

    const keys = Object.keys(opts)

    // Strip undefined values
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      if (opts[key] === undefined) {
        delete opts[key]
      }
    }

    this.shape = new Type(this.div.current, opts)
    this.duration = opts.duration

    if (progress) {
      this.animate(progress)
    }

    this.otherProps = otherProps
  }

  destroy = () => {
    if (this.shape && this.shape.destroy) {
      this.shape.destroy()
      this.shape = null
    }
  }

  value = () => {
    return this.shape.value
  }

  animate = progress => {
    // Shifty treats zero as its default duration. A positive value below clock
    // precision keeps next-frame completion and the animation step state intact.
    if (this.duration === 0) {
      this.shape.animate(progress, { duration: Number.MIN_VALUE })
    } else {
      this.shape.animate(progress)
    }
  }

  set = progress => {
    this.shape.set(progress)
  }

  setText = (text = '') => {
    this.shape.text = text
  }

  render() {
    return <div ref={this.div} {...this.otherProps} />
  }
}

export const Circle = props => <Shape Type={CircleType} {...props} />

export const Line = props => <Shape Type={LineType} {...props} />

export const SemiCircle = props => (
  <Shape Type={SemiCircleType} {...props} />
)
