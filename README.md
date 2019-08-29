# react-progressbar

> Little React wrapper around progressbar.js

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm install --save @tiaanduplessis/react-progressbar
```

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
  </>
}


```

## License

MIT © [tiaanduplessis](https://github.com/tiaanduplessis)

---

Created using [create-react-hook](https://github.com/hermanya/create-react-hook).
