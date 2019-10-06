# react-progressbar

> Little React wrapper around progressbar.js

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm install --save @tiaanduplessis/react-progressbar
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
        <td>Function called when user taps the view area</td>
        <td><code>false</code></td>
    </tr>
</table>

## Usage

```jsx
import { Circle, Line } from '@tiaanduplessis/react-progressbar'
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
          strokeWidth={6},
          color={'#FFEA82'},
          trailColor='#eee',
          trailWidth={1},
          easing='easeInOut',
          duration={1400},
          svgStyle=null,
          text= {
            value: '',
            alignToBottom: false
          }
        />
  </>
}


```

## License

MIT © [tiaanduplessis](https://github.com/tiaanduplessis)

---

Created using [create-react-hook](https://github.com/hermanya/create-react-hook).
