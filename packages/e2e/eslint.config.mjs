import base from '../../eslint.config.js';

export default [
  ...base,
  { languageOptions: { parserOptions: { project: true, tsconfigRootDir: import.meta.dirname } } },
];
