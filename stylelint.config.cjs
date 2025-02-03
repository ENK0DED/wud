module.exports = {
  extends: ['stylelint-config-standard-vue'],
  ignoreFiles: ['public/**/*.css'],
  plugins: ['stylelint-order'],
  // add your custom config here
  // https://stylelint.io/user-guide/configuration
  rules: {
    'at-rule-no-unknown': [true, { ignoreAtRules: ['apply', 'layer', 'config', 'variants', 'responsive', 'screen'] }],
    'function-no-unknown': [true, { ignoreFunctions: ['theme'] }],
    'selector-class-pattern': undefined,
    'selector-type-no-unknown': [true, { ignoreTypes: [/^\^+/] }],
  },
};
