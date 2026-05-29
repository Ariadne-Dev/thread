# thread

Explain git diffs for **learning and review**. Offline. No API key. No cloud.

Part of [Ariadne](https://github.com/Ariadne-Dev).

## Why

Pair programming ends. The chat closes. You're alone with a diff again.

`thread` turns that diff into a structured walkthrough: summary, risk flags, per-file notes, and a review checklist — so the next reader (or future you) can find the way without re-reading every hunk blind.

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

# Markdown for PR descriptions
pnpm dev explain --range main...HEAD --format markdown

# JSON for tooling
pnpm dev explain --staged --format json
```

## Example output

```
Diff: main...HEAD
────────────────────────────────────────────────────────

SUMMARY
3 files changed (+87/−12). Most changes are in source files (2). 1 new file.

RISKS
  [!] Dependency manifest changed
      · package.json

FILES
  · src/cli.ts (source, +45/−8) [imports added, error handling]
    Mostly additive refactor (+45/−8).
  · package.json (config, +3/−1)
    Balanced edit (+3/−1).
  · README.md (docs, +39/−3) [new file]
    New file with 39 lines.

REVIEW CHECKLIST
  ☐ Read the summary and risk flags before diving into hunks.
  ☐ Config changed — confirm env vars, deploy steps, and local dev still work.
  ...
```

## How it works

Pure heuristics — path patterns, line counts, keyword detection in hunks. No LLM, no network. Fast and predictable.

Optional local LLM enhancement may come later; the default path will always work offline.

## License

MIT · [Ariadne](https://github.com/Ariadne-Dev) · ariadne@pablovallejo.dev
