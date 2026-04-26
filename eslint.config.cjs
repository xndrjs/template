const baseConfig = require("@features/config-eslint").default;

/*
  To extend this configuration for some specific package/app:

  1. add lint scripts in package.json of the specific app/package
      "lint": "eslint .",
      "lint:fix": "eslint . --fix",

  2. add eslint.config.cjs configuration in the specific app/package
  // path/to/some-package/eslint.config.cjs
  const baseConfig = require("@features/config-eslint").default;

  module.exports = [
    ...baseConfig,
    {
      files: ["...pattern..."],
      rules: {
        ...customRules
      },
    },
  ];
 */

module.exports = [
  // { ignores: ["path/to/some-package/**"] }, // to exclude from root config
  ...baseConfig,
];
