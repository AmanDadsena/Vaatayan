import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      eqeqeq: ["error", "always"],
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-var": "error",
      "prefer-const": "error",
      "object-shorthand": "error",
      "no-implicit-coercion": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    // Application code: keep files and functions small, and never assert away null checks.
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "error",
      complexity: ["error", 15],
      "max-lines": ["error", { max: 200, skipBlankLines: true, skipComments: true }],
      "max-depth": ["error", 4],
    },
  },
  {
    // Generated images render through next/og (Satori), which supports only plain <img>, not next/image.
    files: ["src/app/**/apple-icon.tsx", "src/app/**/opengraph-image.tsx"],
    rules: { "@next/next/no-img-element": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]),
]);

export default eslintConfig;
