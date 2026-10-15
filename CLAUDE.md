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
  main.tsx, App.tsx    entry point; App shows the board in a 16:9 stage
  board/               the board data model: pure TypeScript, no React
    types.ts           Board, Team, Player, Ball, Arrow, PitchPosition
    pitch.ts           pitch dimensions and position helpers
    defaultBoard.ts    createDefaultBoard(): both teams lined up for kick-off
    validate.ts        validateBoard(): invariants the types can't express
  components/          React components (Pitch renders a Board as SVG)
  test/                Vitest setup and shared test helpers
e2e/                   Playwright specs (*.spec.ts)
```

## Board model

- The whole board (both teams, ball, arrows) is **one plain JSON-serialisable object**
  (`Board` in `src/board/types.ts`). No classes, `Date`s, functions or `undefined` values;
  `JSON.parse(JSON.stringify(board))` must equal the original. Bump `version` on breaking
  changes.
- Positions are **percentages of the pitch**, never pixels or metres: `x` 0–100 from the left
  goal line to the right, `y` 0–100 from the top touchline to the bottom. Convert only when
  rendering (`toPitchPoint` gives metres, which the SVG uses as user units).
- `home` defends the left goal and attacks right; `away` is the reverse. Write formations for
  a team attacking right and use `mirrorPosition` for the away side.
- Teams have exactly 11 players; shirt numbers are 1–99 and unique within a team; ids are
  unique across the board; colours are `#rrggbb`. `validateBoard` checks all of this. Keep it
  in step with any model change.
- Model code is pure functions over plain data. Treat boards as immutable in app code and
  return new objects rather than mutating (tests may mutate fresh boards to set up cases).

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
