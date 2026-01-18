module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    ecmaVersion: 'latest',
    parser: '@typescript-eslint/parser',
    sourceType: 'module',
  },
  plugins: ['vue', '@typescript-eslint'],
  rules: {
    'vue/multi-word-component-names': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'warn',
    // 允许使用 any
    '@typescript-eslint/no-explicit-any': 'off',
    // 允许使用 @ts-ignore
    '@typescript-eslint/ban-ts-comment': 'off',
    // 允许非空断言
    '@typescript-eslint/no-non-null-assertion': 'off',
    // 关闭未使用的变量检查 (由 typescript 处理)
    '@typescript-eslint/no-unused-vars': 'off',
    // vue props 解构
    'vue/no-setup-props-destructure': 'off',
  },
};
