# Examples

Real diffs and captured output — run them locally without making changes in your repo.

## Try in 30 seconds

```bash
git clone https://github.com/Ariadne-Dev/thread.git
cd thread
pnpm install
pnpm dev explain --file examples/ariadne-session-3.patch
```

## Files

| File | Description |
|------|-------------|
| [`ariadne-session-3.patch`](ariadne-session-3.patch) | Real diff from [Ariadne session 3](https://github.com/Ariadne-Dev/ariadne/commit/d78e5e9) — session logs + workflow docs |
| [`ariadne-session-3.txt`](ariadne-session-3.txt) | Captured terminal output |
| [`ariadne-session-3.md`](ariadne-session-3.md) | Same analysis in Markdown (paste into a PR description) |

## What to notice

- **Docs-only change** → risks stay low; no false alarms from prose mentioning `.env` or credentials.
- **Per-file notes** → line counts, tags like `new file`, short summaries.
- **Review checklist** → prompts you to think, not just read hunks.

Heuristics aren't magic — they flag patterns. Always read the actual diff for auth, secrets, and behavior changes.
