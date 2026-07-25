# AGENTS.md — SASTRE

## Project Identity

SASTRE is a TypeScript ESM project (`sastre` v0.3.0). The current codebase is a **Kanban project-management engine for AI agents**. The clothing-pattern DSL described in `package.json` is planned/future work tracked in the kanban itself.

## Tech Stack

- TypeScript 5.4+, strict mode (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`, etc.)
- ESM (`"type": "module"`), target ES2022, `moduleResolution: "bundler"`
- Node >= 20
- Vitest for testing, ESLint for linting, Commander.js for CLI
- No Prettier

## Commands

```bash
npm install              # install deps
npm run build            # tsc (produces dist/)
npm test                 # vitest --run (single run)
npm run test:watch       # vitest (watch mode)
npm run test:coverage    # vitest --run --coverage
npm run lint             # eslint src/**/*.ts (tests not linted)
npm run typecheck        # tsc --noEmit
npm run validate:kanban  # tsx scripts/validate-kanban.ts
npm run kanban           # tsx src/cli/index.ts kanban
npm run dev              # tsx watch src/cli/index.ts
```

### Validation order (CI sequence)

```
npm run build → npm test → npm run lint → npm run validate:kanban
```

Always run at least `build + test + lint` before considering a change complete.

## Repository Structure

```
src/
├── cli/
│   ├── index.ts                  # Commander.js entry point
│   └── commands/kanban.ts        # 18 CLI subcommands + getEngine() wiring
└── kanban/engine/                # Core engine (11 files total)
    ├── types.ts                  # Domain types, enums, state machine
    ├── loader.ts                 # Singleton JSON loader with cache
    ├── repository.ts             # Map-based data access layer
    ├── queries.ts                # Read-only operations (CQRS query side)
    ├── mutations.ts              # Write operations (CQRS mutation side)
    ├── persistence.ts            # File writes with pre-write validation
    ├── history.ts                # Append-only NDJSON audit log
    ├── context.ts                # Multi-level task context builder (1-5)
    ├── dependency-graph.ts       # Cycle detection, topological sort
    └── json-schemas.ts           # DTO/serialization layer

tests/
├── unit/kanban/                  # 10 unit test files + fixtures.ts
└── integration/                  # 4 integration tests (engine API, CLI, E2E, validation)

planning/
├── kanban.json                   # Source of truth: all tasks, phases, milestones, decisions
└── *.md                          # Architecture docs, decisions, risks

scripts/
└── validate-kanban.ts            # Standalone validation (runs in CI)

.opencode/skills/kanban/SKILL.md  # Kanban CLI skill (detailed workflow reference)
```

## Architecture (High Level)

```
CLI (Commander.js)
  └─ getEngine() wires:
       KanbanLoader (singleton, loads planning/kanban.json)
       → KanbanRepository (Map-based access)
       → createQueries(repo)        [read]
       → createMutations(repo, model, persist)  [write]
        → KanbanPersistence          [file I/O + validation]
       → KanbanHistory              [audit log]
       → ContextBuilder             [progressive context]
```

Data flows: `kanban.json → Loader → Model (Maps) → Repository → Queries/Mutations → Persistence → kanban.json`

Mutations are wrapped to record history entries automatically in the CLI layer.

## Key Rule: Kanban Interaction

For **normal task management** (discovering tasks, checking status, starting, completing, blocking), always use the CLI or engine API. The CLI handles validation and writes through the engine. Loading `kanban.json` directly is unnecessary and risks stale data for these operations.

**Direct access is legitimate** when the task itself is: developing the Kanban engine, debugging the loader, investigating corruption, implementing migrations, modifying the schema, or maintaining the system that uses that file.

For the full Kanban workflow, context levels, and CLI reference, load the **kanban skill** (`.opencode/skills/kanban/SKILL.md`).

### Quick Kanban Commands

The CLI is invoked locally via `npm run kanban --`. After `npm link`, `sastre kanban` also works.

```bash
npm run kanban -- ready --json                    # discover available tasks
npm run kanban -- context <id> --json --level 3   # get working context
npm run kanban -- start <id>                      # claim a task
npm run kanban -- complete <id> --evidence "..."   # finish with evidence
npm run kanban -- block <id> --reason "..."       # block if stuck
npm run kanban -- validate --json                 # check kanban.json integrity
```

## TypeScript Conventions

- `verbatimModuleSyntax` is on: use `import type` for type-only imports
- `noUncheckedIndexedAccess`: array/object index access returns `T | undefined`
- Tests are excluded from `tsconfig.json` compilation (but Vitest handles them)
- Path alias `@` → `./src` is configured in `vitest.config.ts` (not in tsconfig)
- Tests import `describe/it/expect` from `'vitest'` even though `globals: true` is set

## Testing

- Unit tests: `tests/unit/kanban/` — one file per engine module
- Integration tests: `tests/integration/` — engine workflow, CLI via execSync, E2E agent workflow
- Shared fixtures: `tests/unit/kanban/fixtures.ts` (`makeTask`, `makeKanbanData`, `buildModel`)
- Run a single test file: `npx vitest --run tests/unit/kanban/mutations.test.ts`
- Integration tests use `execSync` against the built `dist/cli/index.js` — **build first**

## Lint

- ESLint 8.x with `.eslintrc.json` (legacy format)
- Only `src/**/*.ts` is linted — tests are excluded
- `no-console: off` (CLI tool), `no-explicit-any: warn`

## Task Status State Machine

```
backlog → todo → ready → in_progress → review → done
                          ↓   ↑           ↓
                        blocked ──────────┘
                          ↓
                        backlog | todo

backlog, todo, in_progress → cancelled (terminal)
```

Valid transitions enforced by `STATUS_TRANSITIONS` in `src/kanban/engine/types.ts`.

## Multi-Agent Rules

- Check `ready` before starting; only claim tasks that are not `in_progress`
- Verify status with `show` before mutations (task may have changed)
- Complete atomically: all file changes, then `complete`
- Block early if stuck so other agents know
- Use `history` to see recent mutations by other agents
- Tasks in the same `parallel_group` can be worked simultaneously

## Data Files

| File | Purpose | Edit directly? |
|------|---------|----------------|
| `planning/kanban.json` | Task/phase/milestone source of truth | **No** — use CLI |
| `.kanban-history.json` | Append-only audit log (NDJSON) | **No** — managed by CLI |
| `dist/` | Compiled output | **No** — regenerate with `npm run build` |

## Common Pitfalls

- `npm run lint` only lints `src/` — test files are not checked by ESLint
- `tsconfig.json` excludes `tests/` and `scripts/` from type-checking
- Integration tests require a prior `npm run build` (they run `dist/cli/index.js`)
- The `@` path alias only works in Vitest, not in the main `tsc` compilation
- `kanban.json` is ~6400 lines — never read it fully; use CLI queries instead
- Do not manually edit `.kanban-history.json` to fix normal operations — use the CLI/API
