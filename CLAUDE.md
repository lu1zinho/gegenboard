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
  roster/              team rosters: pure TypeScript, no React
    types.ts           Roster, RosterPlayer, SquadEntry
    squadList.ts       parseSquadList(): pasted "10 Name" lines to players and line errors
    roster.ts          create, edit and validate rosters (validateRoster)
    storage.ts         save and load rosters in localStorage
  stream/              stream view options: parseStreamOptions() (?bg=transparent) and the
                       usePresentationMode() hook (P key)
  components/          React components (Pitch renders a Board as SVG; RosterPanel manages
                       rosters)
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

## Rosters

- A roster is a saved squad (`Roster` in `src/roster/types.ts`): a team name, colours and any
  number of players with a shirt number (1–99, unique) and a name, but no positions. Rosters
  aren't wired into the board yet; picking a board team from a roster is a later step.
- Rosters follow the board's rules: plain JSON-serialisable data, pure functions returning new
  objects, and `validateRoster` kept in step with any model change.
- `parseSquadList` never throws: unreadable lines and repeated shirt numbers come back as
  `errors` with a line number and reason, and the readable lines are still used.
- Rosters are stored in localStorage under `gegenboard.rosters` as `{ version, rosters }`,
  apart from anything else the app saves. Bump `ROSTERS_SCHEMA_VERSION` on breaking changes
  and migrate older data in `deserialiseRosters`. Go through `loadRosters`/`saveRosters`/
  `getLocalStorage`, which wrap every storage access in try/catch and never throw, rather than
  using `localStorage` directly in app code. Unit tests get a cleared `localStorage` after
  each test.

## Stream view

- The stage is the largest 16:9 frame that fits the window. The pitch (viewBox 105×68, no
  margin) fills the frame's full height and is centred; the spare width on each side holds a
  `Bench` (substitutes list, empty for now). Layout is plain CSS, so the pitch proportions hold at
  any window size and nothing scrolls.
- `P` toggles presentation mode, which hides every control (the `.controls` wrapper in `App`,
  kept mounted so panel state survives). New controls go inside that wrapper. `P` is ignored
  while typing in a field.
- `?bg=transparent` sets `data-bg="transparent"` on `<html>` so OBS shows what is behind the
  page.

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
