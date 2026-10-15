# Gegenboard

A football tactics board web app built for live-streaming. Desktop first, rendered for 16:9
stream output (1920×1080), 11-a-side. There is no backend: everything runs in the browser.

## Stack

- **Vite 8 + React 19 + TypeScript 6** (`strict`, `noUncheckedIndexedAccess`)
- **Vitest 5 + React Testing Library + jest-dom** in jsdom for unit and component tests
- **Playwright** (Chromium, 1920×1080 viewport) for end-to-end tests against the production
  build served by `vite preview`
- **ESLint 10** flat config with type-aware `typescript-eslint` strict rules, React Hooks and
  React Refresh plugins
- **Prettier** for formatting (ESLint stylistic rules are turned off via `eslint-config-prettier`)
- **GitHub Actions** (`.github/workflows/ci.yml`) runs lint, format check, typecheck, unit tests
  and Playwright on every pull request and on pushes to `main`
- Node 22 (`.nvmrc`), npm with a committed `package-lock.json`

## Commands

| Command                | What it does                                                 |
| ---------------------- | ------------------------------------------------------------ |
| `npm ci`               | Install exact dependencies from the lockfile                 |
| `npm run dev`          | Start the Vite dev server                                    |
| `npm run build`        | Typecheck (`tsc -b`) and build to `dist/`                    |
| `npm run preview`      | Serve the production build                                   |
| `npm run typecheck`    | Typecheck app, tests and config files                        |
| `npm run lint`         | ESLint                                                       |
| `npm run format`       | Format everything with Prettier                              |
| `npm run format:check` | Check formatting without writing                             |
| `npm test`             | Run unit and component tests once                            |
| `npm run test:watch`   | Run Vitest in watch mode                                     |
| `npm run test:e2e`     | Build, serve and run Playwright tests (needs Chromium below) |

Playwright needs a browser: run `npx playwright install --with-deps chromium` once. Where a
Chromium is already installed (e.g. a sandboxed container), set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable instead.

Before pushing, run what CI runs:
`npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:e2e`.

## Layout

```
src/
  main.tsx, App.tsx    entry point and top-level component
  test/setup.ts        Vitest setup (jest-dom matchers, RTL cleanup)
e2e/                   Playwright specs (*.spec.ts)
```

## Conventions

- Prettier style: no semicolons, single quotes, trailing commas, 100-column lines. Don't
  hand-format; run `npm run format`.
- No `any`, no non-null assertions (`!`), no unhandled promises: the lint config enforces
  these. Narrow types properly instead of casting.
- Function components only. A `.tsx` file that exports a component exports only components
  (React Refresh); put shared constants and helpers in `.ts` files.
- Unit/component tests sit next to the code as `*.test.ts(x)`. Import `describe`/`it`/`expect`
  from `vitest` explicitly (no globals).
- In tests, query by role and accessible name (`getByRole('list', { name: 'Home players' })`),
  not by CSS class or test id. Give SVG elements roles/labels so they are queryable.
- End-to-end specs live in `e2e/` and cover what only a real browser can check (layout,
  sizing, the built app actually loading). Don't use screenshot comparisons: local and CI
  browsers differ.
- No backend, no network calls, no runtime dependencies beyond React without a good reason.
- Commits are small and focused, with an imperative subject line.
