import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import typescript from "typescript-eslint";

export default defineConfig([
  globalIgnores(["node_modules/**", "recordings/**"]),
  js.configs.recommended,
  ...typescript.configs.recommended,
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: { globals: { console: "readonly", process: "readonly" } },
  },
]);
