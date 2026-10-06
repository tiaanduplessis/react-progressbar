/* eslint-env node */
const babel = require('rollup-plugin-babel')
const commonjs = require('rollup-plugin-commonjs')
const external = require('rollup-plugin-peer-deps-external')
const resolve = require('rollup-plugin-node-resolve')
const url = require('rollup-plugin-url')
const cancellation = require('./scripts/progressbar-cancellation-plugin')
const pkg = require('./package.json')

module.exports = function config() {
  return {
    input: 'src/index.js',
    output: [
      { file: pkg.main, format: 'cjs', sourcemap: true },
      { file: pkg.module, format: 'es', sourcemap: true }
    ],
    plugins: [
      external(),
      cancellation(__dirname),
      url({ exclude: ['**/*.svg'] }),
      babel({ exclude: 'node_modules/**' }),
      resolve(),
      commonjs()
    ]
  }
}
