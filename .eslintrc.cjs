/* ESLint base config for Node 20 + ESM */
module.exports = {
  root: true,
  env: { node: true, es2023: true },
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  extends: [
    "eslint:recommended",
    "plugin:import/recommended",
    "plugin:n/recommended",
    "plugin:promise/recommended",
    // этот пресет отключит конфликтующие правила и включит ошибку,
    // если код не отформатирован по Prettier:
    "plugin:prettier/recommended",
  ],
  settings: {
    "import/resolver": { node: { extensions: [".js", ".mjs", ".cjs"] } },
  },
  rules: {
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "n/no-unsupported-features/es-syntax": "off",
  },
};
