# GTAC_REF Developer Notes

This document serves as the running developer log and directory manifest for the **GTAC Referee Form (`GTAC_REF`)** project. All development occurs inside the `dev/` directory.

---

## Directory & File Manifest

The following table summarizes all files and directories in this repository and what they do:

| Path | Type | Description |
| :--- | :--- | :--- |
| `dev/` | Directory | Dedicated development workspace where all project development, module creation, and experimentation take place. |
| `dev/DEV_NOTES.md` | File | Running developer activity log, file manifest, task records, and verification history (legacy notes from prior projects removed). |
| `dev/DEV_NOTES` | Symlink | Convenience link pointing to `dev/DEV_NOTES.md`. |
| `dev/util` | Symlink | Convenience link pointing to the root `util` CLI script. |
| `util` | Executable | Python 3 CLI management script supporting `--version`, `--git-push`, `--change-branch`, and `--release`. |
| `VERSION` | File | Plaintext file containing the current release version in `ZZ.YY.XX` format (initialized at `01.00.00`). |
| `AGENT_RULES.md` | File | Coding agent guidelines, prompt logging protocols, and multi-agent coordination standards for `GTAC_REF`. |
| `README.md` | File | Project overview, directory layout, and developer onboarding instructions. |
| `.gitignore` | File | Git ignore specifications for temporary files, python cache artifacts, OS files, and release archives. |

---

## Developer Activity Log

```text
## YYYY-MM-DD HH:MM:SS TZ

Prompt / Request
- Refined and structured summary of what was requested.

Changes Made
- Concrete summary of code, documentation, or configuration changes.

Verification
- Exact test commands and verification steps executed.

Notes
- Relevant context, edge cases, or next steps.
```

---

## 2026-09-11 15:52:00 IST

Prompt / Request
- Create `dev` folder as the designated development workspace.
- Create `DEV_NOTES` inside `dev/` listing all repository files and explaining their functionality, removing all legacy notes from the previous project.
- Initialize a Git repository with `GTAC_REF` on branch `creation` with all creation commits on this branch.
- Create an executable `util` script supporting `--version` (automatic increment of `XX` in `ZZ.YY.XX` or explicit version), `--git-push`, `--change-branch`, `--release` (creating a release tarball), and related utilities.

Changes Made
- Created `dev/` directory and initialized `dev/DEV_NOTES.md` with file manifest and documentation.
- Created symlinks `dev/DEV_NOTES` -> `DEV_NOTES.md` and `dev/util` -> `../util`.
- Removed legacy 332KB `DEV_NOTES.md` from the GMRTCAL project.
- Updated `README.md` and `AGENT_RULES.md` to reflect `GTAC_REF` and the `/Users/prasun/Documents/GTAC/Referee_Form` workspace.
- Initialized `VERSION` file with version `01.00.00`.
- Created `.gitignore` to ignore build files, Python caches, macOS artifacts, and release archives.
- Implemented standalone executable CLI `util` in Python 3 with `--version`, `--git-push`, `--change-branch`, `--release`, and `--status` options.
- Initialized Git repository on branch `creation`, configured remote `GTAC_REF`, and committed project setup.

Verification
- Executed `python3 -m py_compile util` to confirm clean syntax.
- Verified `./util --help` displays all CLI commands.
- Verified `./util --version` increments `01.00.00` -> `01.00.01` and resets cleanly.
- Verified `./util --release` creates distribution tarball in `versions/`.
- Verified `./util --change-branch` lists and switches branches.
- Verified `git branch --show-current` confirms branch `creation`.

Notes
- Remote origin points to `git@github.com:prasundutta151/GTAC_REF.git`.
- Release tarballs exclude `dev/`, `.git/`, and build artifacts.
