import React from 'react'
import { render, cleanup } from '@testing-library/react'

import { Circle, Line, SemiCircle } from '../'

afterEach(cleanup)

jest.mock('progressbar.js')

describe('Circle', () => {
  it('should render the progress circle', () => {
    const circle = render(<Circle progress={0.5} />)
    expect(circle).toMatchSnapshot()
  })
})

describe('Line', () => {
  it('should render the progress line', () => {
    const line = render(<Line progress={0.5} />)
    expect(line).toMatchSnapshot()
  })
})

describe('SemiCircle', () => {
  it('should render the progress semi circle', () => {
    const semi = render(<SemiCircle progress={0.5} />)
    expect(semi).toMatchSnapshot()
  })
})
