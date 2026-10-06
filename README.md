# react-progressbar

> Little React wrapper around progressbar.js

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm install --save @tiaanduplessis/react-progressbar
```

## Usage

```jsx
import React from 'react'
import { Circle, Line, SemiCircle } from '@tiaanduplessis/react-progressbar'
const Example = () => {
  return <>
          <Circle
            style={{ width: '200px' }}
            progress={10 / 100}
            color={'red'}
            trailColor={'pink'}
            strokeWidth={4}
            easing='easeInOut'
            text={{
              value: 'Example',
              style: {
                color: '#515251',
                position: 'absolute',
                left: '50%',
                top: '50%',
                textAlign: 'center',
                padding: 0,
                margin: 0,
                transform: {
                  prefix: true,
                  value: 'translate(-50%, -50%)'
                }
              }
            }}
          />


        <Line
          progress={10/100}
          strokeWidth={4}
          easing='easeInOut'
          color={'blue'}
          trailColor='orange'
          svgStyle={{
            display: 'block',
            width: '100%',
            'max-height': '1em',
            'border-radius': '20px'
          }}
          text={{
            className: 'dashboard-tile-line-progress-text',
            style: {
              color: '#515251',
              padding: 0,
              margin: 0
            }
          }}
        />


        <SemiCircle
          progress={10 / 100}
          strokeWidth={6}
          color={'#FFEA82'}
          trailColor='#eee'
          trailWidth={1}
          easing='easeInOut'
          duration={1400}
          svgStyle={null}
          text={{
            value: '',
            alignToBottom: false
          }}
        />
  </>
}

```

## Props

<table width="80%">
    <tr>
        <th>Property</th>
        <th>Type</th>
        <th>Description</th>
        <th>Default Value</th>
    </tr>
    <tr>
        <td><code>color</code></td>
        <td><code>string</code></td>
        <td>Stroke color</td>
        <td><code>'#555'</code></td>
    </tr>
    <tr>
        <td><code>strokeWidth</code></td>
        <td><code>number</code></td>
        <td>Width of the stroke</td>
        <td><code>1.0</code></td>
    </tr>
    <tr>
        <td><code>trailColor</code></td>
        <td><code>string</code></td>
        <td>Color for lighter trail stroke</td>
        <td><code>'#f4f4f4'</code></td>
    </tr>
    <tr>
        <td><code>trailWidth</code></td>
        <td><code>number</code></td>
        <td>Width of the trail stroke. Trail is always centered relative to actual progress path.</td>
        <td>same as <code>strokeWidth</code></td>
    </tr>
    <tr>
        <td><code>svgStyle</code></td>
        <td><code>object</code></td>
        <td>Inline CSS styles for the created SVG element</td>
        <td><code>null</code></td>
    </tr>
    <tr>
        <td><code>text</code></td>
        <td><code>object</code></td>
        <td>Text options</td>
        <td><code>null</code></td>
    </tr>
    <tr>
        <td><code>fill</code></td>
        <td><code>string</code></td>
        <td>Fill color for the shape. If null, no fill.</td>
        <td><code>null</code></td>
    </tr>
    <tr>
        <td><code>duration</code></td>
        <td><code>number</code></td>
        <td>Duration for animation in milliseconds</td>
        <td><code>800</code></td>
    </tr>
    <tr>
        <td><code>easing</code></td>
        <td><code>string</code></td>
        <td>Easing for animation</td>
        <td><code>'linear'</code></td>
    </tr>
    <tr>
        <td><code>from</code></td>
        <td><code>object</code></td>
        <td>For custom animations: Built-in shape passes reference to itself and a custom attachment object to step function</td>
        <td><code>none</code></td>
    </tr>
    <tr>
        <td><code>to</code></td>
        <td><code>object</code></td>
        <td>For custom animations: Built-in shape passes reference to itself and a custom attachment object to step function</td>
        <td><code>none</code></td>
    </tr>
    <tr>
        <td><code>step</code></td>
        <td><code>function</code></td>
        <td>For custom animations: Built-in shape passes reference to itself and a custom attachment object to step function</td>
        <td><code>none</code></td>
    </tr>
    <tr>
        <td><code>warnings</code></td>
        <td><code>boolean</code></td>
        <td>Enable console warnings when progressbar.js detects potentially incorrect usage</td>
        <td><code>false</code></td>
    </tr>
</table>

## Development builds

Development builds pin progressbar.js 1.1.0 and Shifty 2.9.1. Shifty 2.9.1
corrects the Node export shape used by the build without changing its animation
source from 2.9.0. The direct development dependency and root Yarn resolution
keep fresh npm and Yarn development installs on that same build dependency.

The generated CommonJS and ESM files bundle progressbar.js and Shifty; React
remains a peer dependency. Root Yarn resolutions do not propagate to projects
installing this package. They are build controls, not a guarantee about a
consumer's independently installed Shifty version or direct imports of `src`.

Run `npm run test:package` after installing development dependencies. This
builds both formats, packs with lifecycle scripts disabled, and checks the
extracted package with only its React peer available. It requires POSIX `tar`.
The checks cover both advertised entry files, server rendering, and real shape
creation and completed animations in JSDOM with synthetic SVG geometry.

Interrupted animations are not covered by that smoke pass: progressbar.js 1.1.0
leaves a rejected promise unhandled when a running animation is replaced. The
existing text, option-update, and unmount behavior is also unchanged. Native
browser verification and broader runtime compatibility work remain separate;
these build checks do not expand the supported React peer range.

## License

MIT © [tiaanduplessis](https://github.com/tiaanduplessis)

---

Created using [create-react-hook](https://github.com/hermanya/create-react-hook).
