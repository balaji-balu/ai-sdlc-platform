# Drift-Monkey

Drift-Monkey is the RFC-0005 chaos engine for testing DriftGuard implementations. It injects controlled source-code, design, and dependency drift into a target workspace so the Observer–Evaluate–Correct loop can be verified.

## Install and run

```bash
npm install
npm link
drift-monkey --config ./monkey.yaml
```

Runs are dry-run by default. Use `--apply` only inside an isolated test workspace:

```bash
drift-monkey --config ./monkey.yaml --apply
```

The `seed` makes mutation selection reproducible. `intensity` is bounded to `0.0`–`1.0`. Each mutation is a pure transformation before the CLI decides whether to write it.

## Mutation layers

- `implementation`: drops a closing brace, semicolon, or parenthesis from JavaScript/TypeScript.
- `design`: appends intentionally nested control flow to increase complexity.
- `maintenance`: changes one exact dependency version to an unstable alpha range.

The engine is intentionally destructive when `--apply` is supplied. Use a disposable sandbox or clean Git worktree, and run the normal DriftGuard validation pipeline after every chaos loop.
