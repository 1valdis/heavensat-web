import { Linter } from 'eslint'
import neostandard from 'neostandard'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import sonarjs from 'eslint-plugin-sonarjs'
import json from 'eslint-plugin-json'
import * as reactCompiler from 'eslint-plugin-react-compiler'

export default [
  {
    ignores: ['node_modules/**']
  },
  {
    plugins: {
      react,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly'
      },
    },
    rules: {
      'react/jsx-uses-react': 0,
      'react/jsx-uses-vars': 'error',
      'react/react-in-jsx-scope': 0,
      'react/prop-types': 0,
    }
  },
  ...neostandard({ ts: true, env: ['browser', 'es2025'] }),
  reactHooks.configs['recommended-latest'],
  sonarjs.configs.recommended,
  {
    files: ['**/*.json'],
    ...json.configs['recommended']
  },
  {
    rules: {
      'sonarjs/no-nested-assignment': 0,
      'sonarjs/no-commented-code': 0
    }
  },
  reactCompiler.configs.recommended,
] satisfies Linter.Config[]
