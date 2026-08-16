import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// User data lives in PostgreSQL, reached through an API route. Client
// storage (localStorage, sessionStorage, document.cookie) is for interface
// preference only. See docs/architecture/client-storage.md.
//
// These selectors catch both the bare global (`localStorage.getItem(...)`)
// and the `window.`-qualified form (`window.localStorage.getItem(...)`),
// since the latter is a MemberExpression whose object is itself a
// MemberExpression, not an Identifier — a plain `no-restricted-properties`
// object/property pair cannot match it.
const clientStorageRestrictions = [
  {
    selector: "MemberExpression[object.name='localStorage']",
    message:
      "Do not use localStorage. User data lives in PostgreSQL, reached through an API route. See docs/architecture/client-storage.md.",
  },
  {
    selector: "MemberExpression[property.name='localStorage']",
    message:
      "Do not use localStorage. User data lives in PostgreSQL, reached through an API route. See docs/architecture/client-storage.md.",
  },
  {
    selector: "MemberExpression[object.name='sessionStorage']",
    message:
      "Do not use sessionStorage. User data lives in PostgreSQL, reached through an API route. See docs/architecture/client-storage.md.",
  },
  {
    selector: "MemberExpression[property.name='sessionStorage']",
    message:
      "Do not use sessionStorage. User data lives in PostgreSQL, reached through an API route. See docs/architecture/client-storage.md.",
  },
  {
    selector:
      "MemberExpression[property.name='cookie'][object.name='document']",
    message:
      "Do not use document.cookie. User data lives in PostgreSQL, reached through an API route. See docs/architecture/client-storage.md.",
  },
];

// The only two files allowed to touch client storage, and only because they
// hold interface preference, not user data.
const clientStorageAllowList = [
  "src/components/doctor/sidebar-collapsed-storage.ts",
  "src/components/shell/theme-toggle.tsx",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    ignores: clientStorageAllowList,
    rules: {
      "no-restricted-syntax": [
        "error",
        ...clientStorageRestrictions,
      ],
      // A leading underscore is this codebase's existing convention for an
      // intentionally-unused parameter (e.g. a compatibility stub whose
      // signature must match a real caller but whose body ignores the
      // argument) — this just makes the linter aware of it.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
