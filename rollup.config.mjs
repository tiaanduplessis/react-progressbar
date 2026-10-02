import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'

export default {
  input: 'src/index.js',
  external: ['react'],
  output: [
    { file: 'dist/index.js', format: 'cjs', exports: 'named', sourcemap: true },
    { file: 'dist/index.es.js', format: 'es', sourcemap: true }
  ],
  plugins: [
    babel({ babelHelpers: 'bundled', exclude: 'node_modules/**' }),
    nodeResolve(),
    commonjs()
  ]
}
