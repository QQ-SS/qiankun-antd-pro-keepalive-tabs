module.exports = {
  extends: [
    require.resolve('@umijs/lint/dist/config/eslint'),
    'plugin:react-hooks/recommended',
    'plugin:react/recommended',
  ],

  globals: {
    page: true,
    REACT_APP_ENV: true,
    API_ENV: true,
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-shadow': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/consistent-type-imports': 'warn',
  },
};
