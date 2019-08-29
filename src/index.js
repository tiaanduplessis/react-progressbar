import React, { Component, createRef } from 'react'
import ProgressBar from 'progressbar.js'

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

    if (progress) {
      this.shape.animate(progress)
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
    this.shape.animate(progress)
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

export const Circle = props => <Shape Type={ProgressBar.Circle} {...props} />

export const Line = props => <Shape Type={ProgressBar.Line} {...props} />

export const SemiCircle = props => (
  <Shape Type={ProgressBar.SemiCircle} {...props} />
)
