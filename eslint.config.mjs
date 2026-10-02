import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'

export default [
  { ignores: ['dist/**'] },
  js.configs.recommended,
  stylistic.configs.customize({
    indent: 2,
    quotes: 'single',
    semi: false,
    commaDangle: 'never',
    arrowParens: false,
    braceStyle: '1tbs',
    jsx: true
  }),
  {
    rules: {
      '@stylistic/arrow-parens': ['error', 'as-needed'],
      '@stylistic/quote-props': ['error', 'as-needed'],
      '@stylistic/space-before-function-paren': ['error', 'always']
    }
  },
  {
    files: ['src/index.js'],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: {
      // React and Shape are consumed by JSX, whose names are not JS references.
      'no-unused-vars': ['error', { varsIgnorePattern: '^(React|Shape)$' }],
      '@stylistic/space-before-function-paren': 'off'
    }
  },
  {
    files: ['test/**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        __dirname: 'readonly', document: 'readonly', global: 'readonly',
        process: 'readonly', setTimeout: 'readonly'
      }
    }
  }
]
