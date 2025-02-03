import enk0ded from 'eslint-config-enk0ded';

export default [
  ...enk0ded,
  { ignores: ['@OLD/**', 'dist/**', 'node_modules/**', '*.config.*js'] },
  { languageOptions: { parserOptions: { project: true, tsconfigRootDir: import.meta.dirname } } },
];
