# GTAC_REF - GTAC Referee Form

This repository is dedicated to the development and maintenance of the **GTAC Referee Form (`GTAC_REF`)** system.

## Project Structure

- `dev/`: The designated workspace where all active development, implementation, and experimentation occur.
  - `dev/DEV_NOTES.md`: Running developer log, task specifications, change tracking, and file manifest.
  - `dev/util`: Symlink to root `util` script for convenient execution inside `dev/`.
- `util`: Standalone CLI utility for project operations (version bumping, release packaging, branch management, and git pushing).
- `VERSION`: Plaintext tracking file maintaining the active version in `ZZ.YY.XX` format.
- `AGENT_RULES.md`: Development guidelines, multi-agent coordination rules, and commit policies.
- `.gitignore`: Standard project ignore patterns.

## Utility Tooling

The repository includes a top-level `util` script (also linked inside `dev/util`):

```bash
# Bump minor version (XX) in ZZ.YY.XX:
./util --version

# Set explicit version:
./util --version 01.01.00

# Package a release tarball into versions/:
./util --release

# Switch or create branch:
./util --change-branch <branch-name>

# Stage, commit, and push changes:
./util --git-push -m "Commit message"
```

## Development Workflow

All new features, scripts, and module development should be housed within the `dev/` directory. All changes, prompts, and verification steps must be recorded in `dev/DEV_NOTES.md`.
