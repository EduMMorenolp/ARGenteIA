import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettierConfig from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
    globalIgnores(['dist', 'node_modules', 'ui', 'memoryUser', 'skills']),
    {
        files: ['src/**/*.ts'],
        extends: [
            js.configs.recommended,
            tseslint.configs.recommended,
            prettierConfig,
        ],
        languageOptions: {
            ecmaVersion: 2022,
            globals: globals.node,
        },
        rules: {
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/no-explicit-any': 'warn',
            'no-console': 'off',
        },
    },
]);
