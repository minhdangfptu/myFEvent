import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
      plugins: [
        'react',
        'react-hooks',
        'react-refresh'
      ],
    },
    rules: {
      'react-refresh/only-export-components': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/prop-types': 0, // Disable type cua props
      'react/display-name': 0, // Disable display-name rule as it can be noisy in some cases
      'no-console': 1, // Warn on console statements
      'no-lonely-if': 1, // Warn on lonely if statements
      'no-unused-vars': 1, // Warn on unused variables
      'no-trailing-spaces': 1, // Warn on dau cach
      'no-multi-spaces': 1, // Warn on multiple spaces
      'no-multiple-empty-lines': 1, // Warn on multiple empty lines
      'space-before-blocks': ['error', 'always'], // Require space before blocks
      'object-curly-spacing': [1, 'always'], // Require spaces inside curly braces
      'indent': ['warn', 2], // Use 2 spaces for indentation
      'semi': [1, 'never'], //Khong su dung dau cham phay
      'quotes': ['warn', 'single'], //Dung ''
      'array-bracket-spacing': 1,
      'linebreak-style': 0,
      'no-unexpected-multiline': 'warn',
      'keyword-spacing': 1,
      'comma-dangle': 1,
      'comma-spacing': 1,
      'arrow-spacing': 1,
      "no-restricted-imports": [
        "error",
        {
          "patterns": [{ "regex": "^@mui/[^/]+$" }]
        }
      ]
    }
  },
])
