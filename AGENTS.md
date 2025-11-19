# Project Guidelines

## Build/Lint/Test Commands
*No build system detected.*

## Architecture and Structure
*No codebase structure detected.*

## Code Style
*No code style detected.*

## Deep Search CLI (ds)

The `ds` CLI tool provides programmatic access to Sourcegraph Deep Search for AI-powered codebase analysis.

### Setup

Requires `SRC_ACCESS_TOKEN` environment variable. Optional: `SOURCEGRAPH_URL` (defaults to https://sourcegraph.sourcegraph.com)

### Common Usage Patterns

**Start a new conversation:**

```bash
ds start --question "Does the repo have authentication middleware?" | jq -r '.id'
```

**Continue existing conversation (using UUID from web UI):**

```bash
ds ask --id fb1f21bb-07e5-48ff-a4cf-77bd2502c8a8 --question "How does it handle JWT tokens?"
```

**Get conversation by ID or UUID:**

```bash
ds get --id 332  # numeric ID
ds get --id fb1f21bb-07e5-48ff-a4cf-77bd2502c8a8  # UUID from share_url
```

**List recent conversations:**

```bash
ds list --first 5 --sort -created_at
```

**Async mode for long-running queries:**

```bash
ds start --question "Complex question" --async | jq -r '.id'
# Poll for results
ds get --id <id>
```

### Best Practices

- Use `--async` for complex questions that search large codebases
- Parse JSON output with `jq` for extracting specific fields
- Save conversation IDs to continue multi-turn conversations
- UUIDs from web UI share URLs work directly with all commands

## Issue Tracking with bd (beads)

**IMPORTANT**: This project uses **bd (beads)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

### Why bd?

- Dependency-aware: Track blockers and relationships between issues
- Git-friendly: Auto-syncs to JSONL for version control
- Agent-optimized: JSON output, ready work detection, discovered-from links
- Prevents duplicate tracking systems and confusion

### Quick Start

**Check for ready work:**

```bash
bd ready --json
```

**Create new issues:**

```bash
bd create "Issue title" -t bug|feature|task -p 0-4 --json
bd create "Issue title" -p 1 --deps discovered-from:bd-123 --json
```

**Claim and update:**

```bash
bd update bd-42 --status in_progress --json
bd update bd-42 --priority 1 --json
```

**Complete work:**

```bash
bd close bd-42 --reason "Completed" --json
```

### Issue Types

- `bug` - Something broken
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Workflow for AI Agents

1. **Check ready work**: `bd ready` shows unblocked issues
2. **Claim your task**: `bd update <id> --status in_progress`
3. **Work on it**: Implement, test, document
4. **Discover new work?** Create linked issue:
   - `bd create "Found bug" -p 1 --deps discovered-from:<parent-id>`
5. **Complete**: `bd close <id> --reason "Done"`
6. **Commit together**: Always commit the `.beads/issues.jsonl` file together with the code changes so issue state stays in sync with code state

### Auto-Sync

bd automatically syncs with git:

- Exports to `.beads/issues.jsonl` after changes (5s debounce)
- Imports from JSONL when newer (e.g., after `git pull`)
- No manual export/import needed!

### Best Practices

- **One agent per module at a time.** Cross-module changes split into separate beads.
- Close beads as soon as work is complete (don't batch).
- Use `bd ready` to find unblocked work.
- Always update status to `in_progress` when starting work.
- Always use `--json` flag for programmatic use.
- Link discovered work with `discovered-from` dependencies.
- Check `bd ready` before asking "what should I work on?"

### Managing AI-Generated Planning Documents

AI assistants often create planning and design documents during development:

- PLAN.md, IMPLEMENTATION.md, ARCHITECTURE.md
- DESIGN.md, CODEBASE_SUMMARY.md, INTEGRATION_PLAN.md
- TESTING_GUIDE.md, TECHNICAL_DESIGN.md, and similar files

**Best Practice: Use a dedicated directory for these ephemeral files**

**Recommended approach:**

- Create a `history/` directory in the project root
- Store ALL AI-generated planning/design docs in `history/`
- Keep the repository root clean and focused on permanent project files
- Only access `history/` when explicitly asked to review past planning

**Example .gitignore entry (optional):**

```
# AI planning documents (ephemeral)
history/
```

**Benefits:**

- ✅ Clean repository root
- ✅ Clear separation between ephemeral and permanent documentation
- ✅ Easy to exclude from version control if desired
- ✅ Preserves planning history for archeological research
- ✅ Reduces noise when browsing the project

### Important Rules

- ✅ Use bd for ALL task tracking
- ✅ Always use `--json` flag for programmatic use
- ✅ Link discovered work with `discovered-from` dependencies
- ✅ Check `bd ready` before asking "what should I work on?"
- ✅ Store AI planning docs in `history/` directory
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems
- ❌ Do NOT clutter repo root with planning documents

### Landing the Plane

**When the user says "let's land the plane"**, follow this clean session-ending protocol:

1. **File beads issues for any remaining work** that needs follow-up
2. **Ensure all quality gates pass** (only if code changes were made) - run tests, linters, builds (file P0 issues if broken)
3. **Update beads issues** - close finished work, update status
4. **Sync the issue tracker carefully** - Work methodically to ensure both local and remote issues merge safely. This may require pulling, handling conflicts (sometimes accepting remote changes and re-importing), syncing the database, and verifying consistency. Be creative and patient - the goal is clean reconciliation where no issues are lost.
5. **Clean up git state** - Clear old stashes and prune dead remote branches:
   ```bash
   git stash clear                    # Remove old stashes
   git remote prune origin            # Clean up deleted remote branches
   ```
6. **Verify clean state** - Ensure all changes are committed and pushed, no untracked files remain
7. **Choose a follow-up issue for next session**
   - Provide a prompt for the user to give to you in the next session
   - Format: "Continue work on bd-X: [issue title]. [Brief context about what's been done and what's next]"

**Example "land the plane" session:**

```bash
# 1. File remaining work
bd create "Add integration tests" -t task -p 2

# 2. Run quality gates (only if code changes were made)
npm test
npm run build

# 3. Close finished issues
bd close bd-42 bd-43 --reason "Completed"

# 4. Sync carefully - example workflow (adapt as needed):
git pull --rebase
# If conflicts in .beads/issues.jsonl, resolve thoughtfully:
#   - Accept remote if needed
#   - Re-import if changed
bd sync

# 5. Verify clean state
git status

# 6. Choose next work
bd ready
```

Then provide the user with:

- Summary of what was completed this session
- What issues were filed for follow-up
- Status of quality gates (all passing / issues filed)
- Recommended prompt for next session

## Agent Best Practices

### General Rules

NEVER start development servers for applications you're working on.

### ACE Framework Integration (MANDATORY)

When working in projects with ACE (presence of `.ace.json`, `AGENTS.md`, or `logs/` directory):

#### Before Starting Work
1. **Check for learned patterns**: Run `ace get bullets --sort-by helpful --limit 10` to review relevant patterns
2. **Check delta queue**: Run `ace status` to see pending knowledge updates

#### During Task Execution
1. **After any build/test/lint failure**: Immediately capture the trace:
   ```bash
   # Create execution JSON with errors
   ace capture --bead <current-task-id> --exec <errors.json> --outcome failure
   ```
2. **Format execution JSON** as:
   ```json
   [{
     "runner": "tsc|vitest|eslint",
     "command": "npm run build",
     "status": "fail",
     "errors": [{
       "tool": "tsc",
       "severity": "error",
       "message": "Error message",
       "file": "path/to/file.ts",
       "line": 123
     }]
   }]
   ```

#### After Completing Work
1. **Always run `ace learn`**: After finishing any task:
   ```bash
   ace learn --beads <task-id> --min-confidence 0.8
   ```
2. **Review and apply deltas**: If deltas are generated, run `ace apply` to update knowledge base

#### Task Workflow with Beads
When using Beads (`bd` command available):
1. Start: `bd update <id> --status in_progress`
2. Work on task (tests auto-capture if ACE present)
3. **BEFORE** closing: `ace learn --beads <id> --min-confidence 0.8` (MANDATORY - do NOT skip)
4. Close: `bd close <id> --reason "Description"`

**CRITICAL:** Step 3 is NOT optional. You MUST run `ace learn` before closing ANY bead in ACE-enabled projects. This is how the system learns and improves.

### When to Use ACE Commands

| Situation | Command | Required |
|-----------|---------|----------|
| Before starting work | `ace get bullets` | Recommended |
| After build/test failure | `ace capture --bead <id> --exec <json>` | **MANDATORY** |
| After completing task | `ace learn --beads <id>` | **MANDATORY** |
| To see system status | `ace status` | Optional |
| To apply pending updates | `ace apply` | When prompted |

### Execution Trace Capture Examples

#### TypeScript Build Failure
```bash
# After npm run build fails
ace capture --bead bd-123 --exec build-errors.json --outcome failure
```

#### Test Failure
```bash
# After npm test fails
ace capture --bead bd-123 --exec test-errors.json --outcome failure
```

#### Successful Completion
```bash
# After all checks pass
ace capture --bead bd-123 --outcome success
```

### Key Principles
1. **Never skip `ace learn`** after completing work - this is how the system improves
2. **Always capture failures** - errors are valuable learning signals
3. **Consult learned patterns first** - avoid repeating past mistakes
4. **Trust the feedback loop** - the more traces captured, the better future performance
