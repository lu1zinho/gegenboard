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
  main.tsx, App.tsx    entry point; App holds the board history and shows the board in a
                       16:9 stage
  storage.ts           getLocalStorage() and helpers shared by everything kept in storage
  board/               the board data model: pure TypeScript, no React
    types.ts           Board, Team, Player, Ball, Arrow, PitchPosition
    pitch.ts           pitch dimensions and position helpers
    defaultBoard.ts    createDefaultBoard(): both teams lined up for kick-off
    validate.ts        validateBoard(): invariants the types can't express
    savedBoards.ts     save, rename and delete named boards (SavedBoard)
    storage.ts         readBoard(), autosave and named boards in localStorage
  history/             generic undo/redo
    history.ts         History<T>: past, present and future states; pure, no React
    useHistory.ts      useHistory(): a value with change, undo and redo
    useHistoryShortcuts.ts  Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y
  roster/              team rosters: pure TypeScript, no React
    types.ts           Roster, RosterPlayer, SquadEntry
    squadList.ts       parseSquadList(): pasted "10 Name" lines to players and line errors
    roster.ts          create, edit and validate rosters (validateRoster)
    storage.ts         save and load rosters in localStorage
  components/          React components (Pitch renders a Board as SVG; RosterPanel manages
                       rosters; BoardsPanel manages named boards)
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
  in step with any model change, and `readBoard` too: it rebuilds stored boards field by field,
  so a field it doesn't know is dropped on load.
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
  `getLocalStorage` (in `src/storage.ts`), which wrap every storage access in try/catch and
  never throw, rather than using `localStorage` directly in app code. Unit tests get a cleared
  `localStorage` after each test.

## Undo and redo

- `App` keeps the board in `useHistory` (`src/history/`): past states, the present board and
  undone states to redo. **Change the board only through `board.change(update)`**, with a pure
  `update` that takes the present board and returns a new one (or the same object to change
  nothing). Then the change can be undone and redone and is autosaved, with no extra work.
  Never keep a copy of the board in other state.
- A new change clears redo. At most `HISTORY_LIMIT` (100) undo steps are kept.
- For gestures that change the board many times, such as a drag or typing in a field, pass
  the same `group` to each change (`board.change(update, { group: 'drag-3' })`) so the gesture
  undoes in one step. Use a new group per gesture; undo and redo end a group.
- Ctrl+Z undoes; Ctrl+Shift+Z and Ctrl+Y redo (⌘ for Ctrl on a Mac). Inside text fields the
  shortcuts are left to the field, so they undo typing as usual.
- `History<T>` and `useHistory` are generic: use them for other undoable state too.

## Saved boards

- The board on screen is autosaved as JSON under `gegenboard.board` after every change
  (undo and redo included) and restored on start. Nothing is written until the board changes.
- Named boards are stored under `gegenboard.savedBoards` as `{ version, boards }`, each
  `{ id, name, board }`. Names are unique ignoring case: saving under an existing name replaces
  that board; renaming to a taken name is refused. Loading a named board is an undoable change.
- Every stored board carries `Board.version`; the list has its own
  `SAVED_BOARDS_SCHEMA_VERSION`. On a breaking board change bump `Board.version` and
  `BOARD_SCHEMA_VERSION` together and convert older boards in `readBoard`. Boards that can't be
  read (damaged, newer, or breaking `validateBoard`) are skipped, never loaded.
- Go through the functions in `src/board/storage.ts`, which never throw, as for rosters.

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
