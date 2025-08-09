module.exports = {
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  env: {
    node: true,
  },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: [
    'eslint:recommended',
    'standard',
    'plugin:prettier/recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    'prettier/prettier': [
      'error',
      {
        singleQuote: true,
        semi: false,
        printWidth: 100,
        tabWidth: 2, // 超过最大值换行
      },
    ],
    'no-new': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'no-useless-constructor': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/no-namespace': 'off',
    'no-use-before-define': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    'no-constant-condition': 'off',
    'no-duplicate-case': 'off',
    camelcase: 'off',
    'no-case-declarations': 'off',
    'no-useless-return': 'off',
    'import/first': 'off',
  },
}
