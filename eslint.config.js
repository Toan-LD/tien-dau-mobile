// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const eslintPluginPrettierRecommended = require("eslint-plugin-prettier/recommended");

module.exports = defineConfig([
    expoConfig,
    eslintPluginPrettierRecommended,
    {
        rules: {
            "no-console": ["error", { allow: ["error", "warn"] }],
        },
    },
    {
        ignores: [
            "dist/*",
            "src/lib/database.types.ts",
            "supabase/functions/**",
        ],
    },
]);
