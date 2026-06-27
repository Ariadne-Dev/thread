# thread

Explain git diffs for **learning and review**. Offline. No API key. No cloud.

Part of [Ariadne](https://github.com/Ariadne-Dev) · [thread on the web](https://ariadne.pablovallejo.dev/thread)

## Why

Pair programming ends. The chat closes. You're alone with a diff again.

`thread` turns that diff into a structured walkthrough: summary, risk flags, per-file notes, and a review checklist — so the next reader (or future you) can find the way without re-reading every hunk blind.

## Try it now (no changes needed)

```bash
git clone https://github.com/Ariadne-Dev/thread.git
cd thread
pnpm install
pnpm dev explain --file examples/ariadne-session-3.patch
```

See [`examples/`](examples/) for the patch and captured output.

## Install

```bash
git clone https://github.com/Ariadne-Dev/thread.git
cd thread
pnpm install
```

## Usage

```bash
# Unstaged changes in the current repo
pnpm explain

# Staged changes
pnpm dev explain --staged

# Compare branches
pnpm dev explain --range main...HEAD

# Pipe a patch
git diff HEAD~3 | pnpm dev explain

# From a saved patch file
pnpm dev explain --file examples/ariadne-session-3.patch

# Markdown for PR descriptions
pnpm dev explain --range main...HEAD --format markdown

# JSON for tooling
pnpm dev explain --staged --format json
```

## Example output

From a real diff ([session 3 in the Ariadne notebook](https://github.com/Ariadne-Dev/ariadne)):

```
Ariadne session 3 (real diff)
────────────────────────────────────────────────────────

SUMMARY
8 files changed (+256/−41). Most changes are in docs files (8). 5 new files.

RISKS
  [~] Documentation updated
      · README.md
      · instructions/instructions.md
      · sessions/001-relaunch.md
      ...

FILES
  · sessions/003-session-log-and-header.md (docs, +53/−0) [new file]
    New file with 53 lines.
  · status/status.md (docs, +22/−35)
    Balanced edit (+22/−35).
  ...

REVIEW CHECKLIST
  ☐ Read the summary and risk flags before diving into hunks.
  ☐ For each changed file, ask: what behavior changed, not just what lines moved?
  ...
```

Full output: [`examples/ariadne-session-3.txt`](examples/ariadne-session-3.txt)

## How it works

Pure heuristics — path patterns, line counts, keyword detection in hunks. No LLM, no network. Fast and predictable.

Docs-only changes are analyzed by filename, not prose (so mentioning `.env` in a README doesn't trigger a false secret alert).

Optional local LLM enhancement may come later; the default path will always work offline.

## Pair with trail

New to the codebase? Run [`trail`](https://github.com/Ariadne-Dev/trail) first — `trail map .` prints a directory map and start-here hints. **trail** = land cold; **thread** = review changes.

## License

MIT · [Ariadne](https://github.com/Ariadne-Dev) · ariadne@pablovallejo.dev
