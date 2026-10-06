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

## Development

Use Node 22.22.2+ (22.x) or Node 24.15.0+ (24.x) and Yarn 1.22.22 for
contributing. The published library still supports Node >=8 and React ^16.8.6;
these newer Node versions are requirements of the development tools only.

```sh
yarn install --frozen-lockfile --ignore-scripts
yarn run check
```

`check` runs non-mutating lint, both builds, component characterization tests,
real progressbar.js/jsdom integration, and CJS/ESM distribution checks. Tests use
a deterministic SVG path-length shim because jsdom does not implement SVG
geometry; this is not a cross-browser rendering test. React 16's existing
`componentWillReceiveProps` warning is expected.

The repository uses one authoritative lockfile, `yarn.lock`. The existing
`prepare` hook builds the package during a normal installation; using
`--ignore-scripts` above makes that execution explicit. To inspect the package
without rerunning lifecycle scripts after `yarn run check`:

```sh
npm pack --ignore-scripts
```

The package includes `dist/index.js`, `dist/index.es.js`, their source maps, and
`src/index.js`. React is external in both builds. The `.es.js` file is intended
for ESM-aware bundlers; the filename and CommonJS package default are unchanged.

See [the dependency refresh notes](DEPENDENCY_REFRESH.md) for security evidence,
compatibility tests, known pre-existing component limitations, and the exact
old dependency-PR mapping. The legacy Travis file is unchanged and is not a
modern Node 22/24 validation gate.

## License

MIT © [tiaanduplessis](https://github.com/tiaanduplessis)

---

Created using [create-react-hook](https://github.com/hermanya/create-react-hook).
