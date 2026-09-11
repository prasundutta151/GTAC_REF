# GTAC_REF Developer Notes

This document serves as the running developer log and directory manifest for the **GTAC Referee Form (`GTAC_REF`)** project. All development occurs inside the `dev/` directory.

---

## Directory & File Manifest

The following table summarizes all files and directories in this repository and what they do:

| Path | Type | Description |
| :--- | :--- | :--- |
| `dev/` | Directory | Dedicated development workspace where all active development and experimentation take place. |
| `dev/index.html` | File | Main responsive HTML5 form for GTAC referee registration and suggestions. |
| `dev/style.css` | File | Modern stylesheet featuring GTAC branding, card layouts, and verified/suggested status badges. |
| `dev/app.js` | File | Client-side application logic: dynamic referee cards, self-referee auto-fill & locking, and live DB lookup. |
| `dev/db_data.js` | File | Standalone database export bundle providing instant offline/file:// protocol support. |
| `dev/server.py` | Executable | Lightweight zero-dependency Python 3 HTTP & REST API server handling static assets, lookup, and submissions. |
| `dev/DEV_NOTES.md` | File | Running developer activity log, file manifest, task records, and verification history (legacy notes removed). |
| `dev/DEV_NOTES` | Symlink | Convenience link pointing to `dev/DEV_NOTES.md`. |
| `dev/util` | Symlink | Convenience link pointing to root `util` CLI script. |
| `dev/database` | Symlink | Convenience link pointing to the `database/` directory. |
| `database/` | Directory | Data storage directory containing ASCII lists and CSV databases. |
| `database/affiliations.txt` | File | ASCII file mapping affiliation IDs (`AFF_XXX`) to institutions/observatories; extendable via "Others". |
| `database/expertise.txt` | File | ASCII file mapping expertise IDs (`EXP_XX`) to astronomy/instrumentation fields; extendable via "Others". |
| `database/career_status.txt` | File | ASCII file listing career stages (`CAR_XX`) from Undergraduate to Faculty and Others. |
| `database/Referee_database_A.csv` | File | Primary referee registry (`unique_id`, `referee_name`, `email`, `affiliation`, `expertise`, `career_status`, `referee_status`, `available`). |
| `database/form_submissions.csv` | File | Audit log of all referee registration and suggestion submissions. |
| `index.html` | Symlink | Root convenience link pointing to `dev/index.html`. |
| `util` | Executable | Python 3 CLI management tool supporting `--version`, `--serve`, `--git-push`, `--change-branch`, and `--release`. |
| `VERSION` | File | Plaintext file containing current release version in `ZZ.YY.XX` format. |
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

## 2026-09-11 18:15:00 IST

Prompt / Request
- Address browser "Load failed" error when opening the form and clarify whether the database already exists.

Changes Made
- Resolved cause of "Load failed": Browsers (especially Safari on macOS) block relative `fetch('/api/database')` requests under the `file://` scheme when opening `index.html` directly from the filesystem without the local server running.
- `dev/db_data.js`:
  - Created standalone auto-generated database export bundle (`window.GTAC_DATABASE`) containing the complete database from disk (all 30 affiliations, all 18 expertise topics, all 7 career statuses, and all 10 referees).
- `dev/index.html`:
  - Included `<script src="db_data.js"></script>` before `app.js`.
  - Added `#connection-status-badge` to header dynamically showing connection state.
- `dev/style.css`:
  - Added `.connection-badge`, `.status-online`, `.status-offline`, and `.status-checking` styling.
- `dev/app.js`:
  - Detects `file://` protocol or server unreachable and seamlessly uses the full embedded database without triggering network errors.
  - Added local submission handling (`localStorage`) with unique `REF_XXXX` ID assignment when in `file://` mode.
  - Added client-side heuristic suggestion fallback when in `file://` mode.
- `dev/server.py`:
  - Added `sync_db_data_js()` to automatically re-sync `dev/db_data.js` whenever disk database files change or on server start.
- `util`:
  - Bumped version to `01.00.04`.

Verification
- Verified `dev/db_data.js` contains 30 affiliations, 18 expertise topics, and 10 referees.
- Verified `python3 dev/server.py 8080` serves correctly with HTTP 200 and `/api/database` returns full dataset.
- Verified opening via `file://` operates seamlessly without throwing "Load failed".

Notes
- The database exists in `database/` (`affiliations.txt`, `expertise.txt`, `career_status.txt`, `Referee_database_A.csv`, `form_submissions.csv`).
- The form now works seamlessly in BOTH modes:
  1. Direct double-click `index.html` (`file://` local file mode).
  2. Local server mode (`http://localhost:8080`) via `./util --serve`.

---

## 2026-09-11 16:20:00 IST

Prompt / Request
- Update the expertise area to be a select-from-list dropdown menu, similar to the affiliation selector.

Changes Made
- `dev/index.html`:
  - Replaced checkbox tag grid with `<select id="user_expertise">` dropdown loaded dynamically from `database/expertise.txt`.
  - Added `#user_expertise_selected` container for selected expertise chips with individual remove buttons.
  - Retained dynamic `+ Others` text box for entering custom expertise topics into the database.
- `dev/style.css`:
  - Added modern styling for `.tag-chip` with hover delete controls, locked states for verified/self reviewers, and `.selected-tags-container`.
- `dev/app.js`:
  - Implemented modular `ExpertisePicker` class managing dropdown selection, dynamic badge creation, removal, and "Others" expansion.
  - Updated referee cards to use `ExpertisePicker` for both submitter and referee blocks.
  - Linked self-referee synchronization and verified referee locking with `expPicker.setDisabled(true)` and locked tags.
- `util`:
  - Bumped version to `01.00.03`.

Verification
- Verified HTML rendering with `<select id="user_expertise">` and referee `<select class="ref-exp-select">`.
- Confirmed CSS chip and remove button styling.
- Bumped version to `01.00.03`.

Notes
- Allows clean, intuitive selection of multiple expertise areas from a dropdown list while maintaining the ability to add new entries via "Others".

---

## 2026-09-11 16:18:00 IST

Prompt / Request
- Remove the proposal references so the form is dedicated purely as the "GTAC Referee Registration / Suggestion Form".

Changes Made
- `dev/index.html`:
  - Updated page title to `GTAC Referee Registration / Suggestion Form`.
  - Updated main heading to `GTAC Referee Registration / Suggestion Form`.
  - Updated subtitle to `Giant Metrewave Radio Telescope Time Allocation Committee (GTAC)`.
  - Updated question 6 prompt to `6. Do you wish to review for GTAC?`.
  - Updated submit button to `Submit Referee Registration / Suggestions`.
- `dev/app.js`:
  - Updated submit button label in the completion handler to `Submit Referee Registration / Suggestions`.
- `README.md`:
  - Updated `database/form_submissions.csv` description to reflect referee registration and suggestions.
- `util`:
  - Bumped version to `01.00.02`.

Verification
- Inspected HTML markup and verified zero remaining mentions of "proposal".
- Verified `./util --status` reflects clean updated version `01.00.02`.

Notes
- The form is now exclusively dedicated to GTAC referee registration, volunteer profiling, and peer suggestions.

---

## 2026-09-11 16:15:00 IST

Prompt / Request
- Implement an HTML form with submitter fields: Name, Email, Affiliation (dropdown from ASCII file with "Others" extension), Career Status (Undergraduate, PhD Student, Postdoc, Faculty, Scientist, Engineer, Others), Expertise (dropdown/multi-select from ASCII file with "Others" extension), and Review Willingness (This cycle: yes/no, Future cycles: yes/no).
- Add dynamic "Referee Suggestions" section:
  - If review willingness is "yes" for either this or future cycle, automatically populate "Referee Suggestion - 1" with submitter's info and lock it (non-editable).
  - Provide a `+` button to dynamically append new referee cards ("Referee Suggestion - 2", "3", etc.).
  - Each referee card requires Name, Email, Affiliation, and Expertise.
  - Integrate real-time verification against `Referee_database_A`:
    - If referee exists and is verified: auto-fill all fields and lock as non-editable with verified notice.
    - If referee exists and is suggested: auto-fill fields as suggestions, leaving them editable.
    - If referee is new: allow manual entry or AI (Gemini) suggestion, assigning a unique ID on submission.
- Create the `database/` folder with ASCII files (`affiliations.txt`, `expertise.txt`, `career_status.txt`), `Referee_database_A.csv`, and `form_submissions.csv`.
- Update `util` to support `--serve` to run the application locally.

Changes Made
- `database/`:
  - Created `database/affiliations.txt` with 30 initial observatories/universities and `AFF_XXX` IDs.
  - Created `database/expertise.txt` with 18 radio astronomy/astrophysics domains and `EXP_XX` IDs.
  - Created `database/career_status.txt` with career stage entries and `CAR_XX` IDs.
  - Created `database/Referee_database_A.csv` containing columns `unique_id,referee_name,email,affiliation,expertise,career_status,referee_status,available` with sample verified and suggested referees.
  - Created `database/form_submissions.csv` to track proposal submissions.
  - Created symlink `dev/database -> ../database`.
- `dev/`:
  - Created `dev/index.html`: Complete form interface with submitter fields, willingness options, dynamic referee cards, autocomplete wrappers, and submission modal.
  - Created `dev/style.css`: Clean, responsive UI with GTAC styling, distinct badges for verified/suggested/self/new statuses, and modal dialog.
  - Created `dev/app.js`: Interactive logic for ASCII data loading, "Others" field toggling, self-referee locking on review willingness, dynamic `+` addition/removal of referee cards, debounced database lookup, verified locking, and form submission.
  - Created `dev/server.py`: Python standard library HTTP/REST server providing `/api/database`, `/api/referees/lookup`, `/api/submit` (auto-incrementing unique referee IDs and appending new affiliations/expertise to ASCII files), and `/api/gemini-suggest`.
  - Created root symlink `index.html -> dev/index.html`.
- `util`:
  - Added `--serve [PORT]` (alias `--run [PORT]`) to start the server with `./util --serve` (default port 8080).
  - Bumped version to `01.00.01`.

Verification
- Started `dev/server.py` on test port 8899 in background.
- Verified `GET /api/database` returns parsed ASCII affiliations, expertise, career statuses, and referees.
- Verified `GET /api/referees/lookup?q=yashwant` correctly returns `REF_0001` with status `verified`.
- Verified `GET /api/referees/lookup?q=ananda` correctly returns `REF_0008` with status `suggested`.
- Verified `POST /api/gemini-suggest` provides affiliation, email domain, and expertise recommendations.
- Verified `POST /api/submit` records submission in `form_submissions.csv`, assigns `REF_0011` and `REF_0012` to new referees in `Referee_database_A.csv`, and appends new affiliation `AFF_031` to `affiliations.txt`.
- Reset test data in database files back to clean initial state.
- Checked `./util --help` displays `--serve [PORT]`.

Notes
- Gemini live suggestions use `GEMINI_API_KEY` when present; otherwise system falls back to smart knowledge base heuristics.
- All new referee suggestions submitted through the form receive unique sequential `REF_XXXX` IDs and status `suggested` with `available: true`.

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
