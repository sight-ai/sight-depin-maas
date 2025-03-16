import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "react-hooks/exhaustive-deps": "off",  // Turn off the warning about missing dependencies in useEffect
      "import/no-anonymous-default-export": "off",  // Allow anonymous default exports
      "react/display-name": "off",  // Allow components without display names
      "@typescript-eslint/no-unused-vars": "off",  // Disable the rule for unused variables
      "prefer-const": "off",  // Allow `let` even for variables that don't change
      "@typescript-eslint/no-explicit-any": "off"  // Disable the rule for using `any` type in TypeScript
    }
  }
];

export default eslintConfig;
