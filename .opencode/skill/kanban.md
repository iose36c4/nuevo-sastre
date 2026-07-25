# Kanban CLI Skill

Use this skill when working with the project task board. It teaches you how to interact with the Kanban system via CLI commands.

## PRINCIPLE

**Never read `kanban.json` directly.** Always use CLI commands. The CLI handles concurrency, validation, and atomic writes. Reading the file directly risks stale data, race conditions, and corrupted state.

---

## COMPLETE WORKFLOW

Every task follows this sequence:

### 1. Discover available tasks

```bash
sastre kanban ready --json
```

Returns tasks whose dependencies are all complete (or have no dependencies). Filter by `priority` or `phase` to decide what to work on first.

### 2. Get operational context

```bash
sastre kanban context <id> --json --level 3
```

This returns everything you need to work: the task definition, parent, dependencies, dependents, tests, and acceptance criteria. Use `--level` to control depth (see Context Levels below).

### 3. Start the task

```bash
sastre kanban start <id>
```

Sets status to `in_progress`. Only one agent should start a task at a time.

### 4. Break down large tasks (optional)

If the task is too large, create subtasks:

```bash
sastre kanban add-child <id> --title "Subtask title" --type feature --priority high
```

Link dependencies between subtasks:

```bash
sastre kanban add-dependency <taskId> <dependencyId>
```

### 5. Complete the task

```bash
sastre kanban complete <id> --evidence "Ran tests, all passing. Files created: src/foo.ts, src/foo.test.ts"
```

The CLI validates: all acceptance criteria addressed, tests pass, dependencies complete. If validation fails, it reports what's missing.

### 6. Block if stuck

```bash
sastre kanban block <id> --reason "Cannot proceed: upstream API not available"
```

Unblock later when the issue is resolved:

```bash
sastre kanban unblock <id>
```

---

## CONTEXT LEVELS

The `context` command accepts `--level <1-5>` to control how much information is returned:

| Level | Includes | Use when |
|-------|----------|----------|
| 1 | Task fields only | Quick status check, verifying a single field |
| 2 | + parent + direct dependencies | Understanding immediate relationships |
| 3 (default) | + dependents + tests + acceptance criteria | **Normal work** - this is what you need to implement the task |
| 4 | + relevant architectural decisions | Task involves design choices, needs historical context |
| 5 | + architecture sections | Deep understanding needed, complex integration work |

**Always start with level 3.** Only go higher if you find yourself needing design context or architecture rationale.

---

## CLI COMMANDS REFERENCE

### Query Commands (read-only, safe to run anytime)

| Command | Description | Example |
|---------|-------------|---------|
| `ready` | Tasks with all deps satisfied | `sastre kanban ready --json` |
| `next` | Alias for `ready` | `sastre kanban next --json` |
| `show <id>` | Full task fields | `sastre kanban show FND-001 --json` |
| `context <id>` | Operational context with context level | `sastre kanban context FND-001 --json --level 3` |
| `deps <id>` | What this task depends on | `sastre kanban deps FND-005 --json` |
| `dependents <id>` | What depends on this task | `sastre kanban dependents FND-001 --json` |
| `tree <id>` | Subtask tree (recursive) | `sastre kanban tree FND-001 --json` |
| `search <q>` | Search by title/description | `sastre kanban search "ESLint" --json` |
| `validate` | Check kanban.json integrity | `sastre kanban validate --json` |
| `history [id]` | Mutation audit log | `sastre kanban history FND-001 --json --limit 20` |

### Mutation Commands (modify state, require care)

| Command | Description | Example |
|---------|-------------|---------|
| `start <id>` | Set status to `in_progress` | `sastre kanban start FND-001` |
| `complete <id>` | Complete with validation | `sastre kanban complete FND-001 --evidence "Tests pass"` |
| `block <id>` | Block with reason | `sastre kanban block FND-001 --reason "Blocked by X"` |
| `unblock <id>` | Unblock, auto-set status | `sastre kanban unblock FND-001` |
| `add` | Create new root task | `sastre kanban add --title "New feature" --type feature --phase PHASE-01` |
| `add-child <parentId>` | Create subtask | `sastre kanban add-child FND-001 --title "Subtask" --type feature` |
| `add-dependency <id> <depId>` | Link dependency | `sastre kanban add-dependency FND-005 FND-004` |
| `remove-dependency <id> <depId>` | Unlink dependency | `sastre kanban remove-dependency FND-005 FND-004` |
| `update <id>` | Update task fields | `sastre kanban update FND-001 --priority critical --title "New title"` |

### Task Types

- `feature` - Implementation work (should have tests)
- `test` - Test-only tasks
- `setup` - Configuration, scaffolding, tooling
- `documentation` - Docs, README, comments

### Priority Levels

- `critical` - Must be done first
- `high` - Important, do soon
- `medium` - Normal priority (default)
- `low` - Nice to have

---

## MULTI-AGENT PROTOCOL

When multiple agents work on the same project:

1. **Check before starting.** Run `sastre kanban ready --json` and only start tasks that are NOT `in_progress`.
2. **Never start a task another agent has started.** If a task shows `in_progress`, do not touch it unless explicitly coordinating.
3. **Use `show` to verify status before mutations.** A task might have changed between your `ready` check and your `start` call.
4. **Complete atomically.** Do all your file changes, then call `complete`. If you modify files but don't complete the task, other agents may be confused about what's done.
5. **Block early.** If you're stuck, `block` immediately so other agents know not to depend on your task being done soon.
6. **Use `history` to coordinate.** Before starting shared work, check `sastre kanban history --json --limit 10` to see recent mutations by other agents.

### Parallel Groups

Tasks in the same `parallel_group` can be worked on simultaneously by different agents, as long as their individual dependencies are met. Tasks in different parallel groups should be sequenced carefully.

---

## ERROR HANDLING

### Validation errors on `complete`

The CLI validates before completing. Common failures:

- **"Acceptance criteria not met"** - Review the criteria from `context`, make sure you've addressed each one, then retry.
- **"Dependencies not complete"** - Run `sastre kanban deps <id> --json` to see which deps are blocking, complete them first.
- **"Tests failing"** - Fix the tests, then retry `complete`.

### Conflict errors (status changed)

If you get a conflict error on `start` or `complete`, it means another agent modified the task. Steps:

1. `sastre kanban show <id> --json` - See current state.
2. If another agent started it, don't proceed. Pick a different task from `ready`.
3. If you were completing and it got blocked, check `history` to understand what happened.

### Blocked tasks

If you call `complete` on a task and it's blocked:

1. `sastre kanban show <id> --json` - Check the block reason.
2. Resolve the blocking issue.
3. `sastre kanban unblock <id>` - Unblock.
4. `sastre kanban complete <id> --evidence "..."` - Retry completion.

### Circular dependency detection

`add-dependency` will reject if it would create a cycle. If you need to restructure dependencies, use `remove-dependency` first to break the cycle, then add the new edges.

### Integrity validation

Run periodically to catch structural issues:

```bash
sastre kanban validate --json
```

This checks: unique IDs, valid dependency references, no cycles, milestone validity.

---

## QUICK REFERENCE: Common Sequences

### Start a new feature from scratch

```bash
sastre kanban ready --json                          # find what's available
sastre kanban context FND-001 --json --level 3      # understand the task
sastre kanban start FND-001                         # claim it
# ... do the work ...
sastre kanban complete FND-001 --evidence "..."     # finish it
```

### Task is too big, break it down

```bash
sastre kanban context FND-001 --json --level 3      # understand the task
sastre kanban start FND-001                         # claim it
sastre kanban add-child FND-001 --title "Part A" --type feature
sastre kanban add-child FND-001 --title "Part B" --type feature
sastre kanban add-dependency FND-001-002 FND-001-001  # Part B depends on Part A
# ... complete subtasks one by one ...
sastre kanban complete FND-001 --evidence "All subtasks done"
```

### Get unblocked

```bash
sastre kanban show FND-001 --json                   # check why blocked
sastre kanban unblock FND-001                       # unblock
sastre kanban start FND-001                         # resume
```
