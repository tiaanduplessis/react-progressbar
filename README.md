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
corrects the Node export shape without changing its animation source from 2.9.0.
The direct development dependency and root Yarn resolution keep npm and Yarn
builds on that audited dependency pair.

A build-only Rollup plugin handles the exact Shifty cancellation record at
progressbar.js's existing promise chain. It keeps `stop(false)`: canceled
completion callbacks stay uncalled, while unexpected rejection reasons and
completion-callback errors remain observable. It does not change component
source, duration-zero handling, attachment identity, or the React peer range.
The plugin also removes Shifty's audited trailing source-map URL in memory to
avoid a Rollup 1 cached-output inconsistency, preserving mappings to original
source bytes. Installed dependency files are never patched.

The guard verifies exact source/entry hashes, metadata, actual dependency graph,
and executable handler output. Dependency changes fail closed and need review.
After any dependency/metadata guard failure, restart the build process, even
when restoring the files: the legacy resolver can retain stale data after a
failed watch build. `npm start` output is development-only and must not be used
as a packaging input.

`npm run build` writes both formats into clean staging, then transactionally
replaces `dist` only after both succeed. A failed promotion restores the prior
directory; if restoration itself fails, the error reports a retained backup.
`npm run test:package` packs a separate fresh staging snapshot, so stale root
or watch output cannot enter that qualification archive. Do not bypass normal
build/prepare checks when preparing a package for release.

The generated CommonJS and ESM files bundle progressbar.js and Shifty; React
remains a peer. Root Yarn resolutions do not propagate to installing projects.
The compatibility patch applies to generated bundles, not a consumer's separate
dependency tree or direct `src` imports.

Run `npm run test:build` for guard, cache/watch, source-map and staging-failure
checks. Run `npm run test:package` for actual packed CJS and Rollup-consumed ESM,
SSR, interrupted/completed animations, callback/error visibility, zero duration
and attachment identity. Packed qualification requires Node 14+ and POSIX `tar`.
It uses JSDOM with synthetic SVG geometry; native-browser and historical Node
verification remain separate. Direct native Node loading of the ESM file is not
supported by the existing React 16 CommonJS named-export arrangement; it is checked via
the advertised bundler consumption path.

For an explicit published-artifact comparison, obtain the original 1.0.0 archive
with `npm pack @tiaanduplessis/react-progressbar@1.0.0 --ignore-scripts`, then run
`npm run test:package -- --baseline /absolute/path/to/archive.tgz`. This optional
control verifies the archive's known integrity before testing its cancellation
behavior and recording its historical missing ESM entry. The tests themselves
do not download packages.

Existing text, option-update and unmount limitations remain unchanged. These
focused checks do not claim additional React support or release readiness.

## License

MIT © [tiaanduplessis](https://github.com/tiaanduplessis)

---

Created using [create-react-hook](https://github.com/hermanya/create-react-hook).
