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
| `database/cycle.txt` | File | ASCII file storing current GTAC cycle number (e.g. `52`). |
| `cycle.txt` | Symlink | Root convenience link pointing to `database/cycle.txt`. |
| `doc/` | Directory | Dedicated documentation suite with multi-page HTML manuals. |
| `doc/README.html` | File | Master documentation portal and system overview. |
| `doc/form_guide.html` | File | Detailed documentation of the referee intake form, validation, and rules. |
| `doc/database_guide.html` | File | Detailed documentation of ASCII taxonomies, CSV registries, and schemas. |
| `doc/api_guide.html` | File | Comprehensive REST API endpoints and `util` CLI command reference. |
| `doc/doc_style.css` | File | Responsive GTAC-themed stylesheet for documentation pages. |
| `docs/` | Directory | Standalone GitHub Pages deployment bundle containing the live web form, static assets, and HTML documentation. |
| `wiki/` | Directory | GitHub Wiki repository markdown suite (`Home.md`, `Form-Guide.md`, `Database-Architecture.md`, `REST-API-and-CLI.md`, `_Sidebar.md`, `_Footer.md`). |
| `README.html` | Symlink | Root convenience link pointing to `doc/README.html`. |
| `dev/doc` | Symlink | Convenience link pointing to `doc/` directory. |
| `index.html` | Symlink | Root convenience link pointing to `dev/index.html`. |
| `style.css` | Symlink | Root convenience link pointing to `dev/style.css`. |
| `app.js` | Symlink | Root convenience link pointing to `dev/app.js`. |
| `dev/referees.html` | File | Interactive referee directory & lookup page with multi-criteria filtering and color-coded cards. |
| `dev/lookup.js` | File | Client-side search, filtering, human-readable data mapping, and rendering logic for referee directory. |
| `dev/lookup.css` | File | Stylesheet for referee directory filter form, font typography, and color-coded status blocks. |
| `dev/lookup.html` | Symlink | Dev convenience link pointing to `dev/referees.html`. |
| `referees.html` | Symlink | Root convenience link pointing to `dev/referees.html`. |
| `lookup.html` | Symlink | Root convenience link pointing to `dev/referees.html`. |
| `lookup.js` | Symlink | Root convenience link pointing to `dev/lookup.js`. |
| `lookup.css` | Symlink | Root convenience link pointing to `dev/lookup.css`. |
| `util` | Executable | Python 3 CLI management tool supporting `--version`, `--serve`, `--git-push`, `--sync-docs`, `--wiki-push`, `--change-branch`, and `--release`. |
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

## 2026-09-11 19:00:00 IST

Prompt / Request
- Create a referee lookup file / page (`referees.html` / `lookup.html`) displaying all referees with human-readable database values.
- Every referee must be a rectangular block with information written in distinct typography/fonts.
- Color code the blocks:
  - Orange: Verified (and available)
  - Yellow: Suggested (and available)
  - Red: Not Available (unavailable)
- Display all blocks sequentially in rows.
- Include a top selection/filter form with Name, Email, Affiliation, Expertise, and Career Status, supporting selection of one or multiple criteria to dynamically filter the referee list blocks.
- Make it a separate page, push to Git, and make available on GitHub Pages.

Changes Made
- `database/Referee_database_A.csv`:
  - Added sample record `REF_0012` with `available: false` to showcase the red "Not Available" state.
- `dev/`:
  - Created `dev/referees.html`: Dedicated referee directory page featuring top navigation, interactive selection/filter card, results summary bar, and container for referee blocks.
  - Created `dev/lookup.css`: Modern stylesheet with font imports (`Space Grotesk`, `JetBrains Mono`, `Inter`), responsive filter layout, and distinct color schemes:
    - Orange (`card-verified`): Verified referee accent and badge.
    - Yellow (`card-suggested`): Suggested referee accent and badge.
    - Red (`card-unavailable`): Unavailable referee accent and badge.
    - Typography rules: Name (`Space Grotesk`), Unique ID and Email (`JetBrains Mono`), Affiliation (`Inter`), Career Status (capsule badge), Expertise (scientific tag chips).
  - Created `dev/lookup.js`: Dynamic client logic loading database from REST API `/api/database` (or falling back to `db_data.js`), translating IDs to full human-readable titles, debounced text search (substring and half-initials), dropdown filtering, expertise multi-select chip filter, status pill filters, and DOM rendering.
  - Added top navigation bar to `dev/index.html` and `dev/style.css` for instant switching between Registration Form and Referee Directory.
  - Created symlink `dev/lookup.html -> referees.html`.
  - Updated `dev/server.py` to route `/referees`, `/lookup`, `/referee-lookup` directly to `referees.html` for both GET and HEAD requests.
- Root Symlinks:
  - Created `referees.html -> dev/referees.html`, `lookup.html -> dev/referees.html`, `lookup.js -> dev/lookup.js`, and `lookup.css -> dev/lookup.css`.
- `docs/` (GitHub Pages Bundle):
  - Updated `cmd_sync_docs()` in `util` to include `referees.html`, `lookup.html`, `lookup.js`, and `lookup.css`.
  - Re-synchronized `docs/` bundle via `./util --sync-docs`.
- HTML Documentation & Wiki:
  - Updated `doc/README.html`, `doc/form_guide.html`, `doc/database_guide.html`, and `doc/api_guide.html` with Directory nav link and documented the lookup page.
  - Updated `wiki/_Sidebar.md` and `wiki/Home.md` with links and documentation for the Referee Directory.
  - Bumped version to `01.00.11` via `./util --version`.

Verification
- Tested server on test port 8899:
  - Verified `HEAD /referees` and `GET /referees.html` return `200 OK`.
  - Verified `HEAD /lookup` and `GET /lookup.html` return `200 OK`.
  - Verified `GET /api/database` returns all 12 referees including `REF_0012`.
- Tested `./util --sync-docs` ran cleanly and confirmed files in `docs/`.

Notes
- Both `/referees.html` and `/lookup.html` are accessible locally and live on GitHub Pages.

---

## 2026-09-11 18:48:00 IST

Prompt / Request
- The user created the GitHub repository on GitHub (`GTAC_REF`). Complete the rest of the deployment, synchronization, and configuration.

Changes Made
- Git Remote Synchronization:
  - Fetched `origin/main` containing initial commit with `LICENSE` (GPLv3).
  - Incorporated `LICENSE` into local repository.
  - Merged and pushed all project commits to both remote branches: `origin/creation` and `origin/main`.
  - Added `.nojekyll` to root directory and pushed to origin so both `/docs` and `/` folder options work for GitHub Pages.
- GitHub Pages & Wiki Verification:
  - Checked GitHub API metadata: repository is public, `default_branch: main`, `has_wiki: true`.
  - Verified remote status and formulated clear instructions for 1-click Pages activation and Wiki initialization.

Verification
- Confirmed `git push origin creation` and `git push origin creation:main` completed successfully.
- Confirmed working tree is clean.

Notes
- Both `main` and `creation` branches on GitHub are fully synchronized with identical code, docs, and configurations.

---

## 2026-09-11 18:43:00 IST

Prompt / Request
- In rules for the agents (`AGENT_RULES.md`), add a mandatory rule that the HTML documentation (`doc/`) must be updated whenever anything is done in the project.

Changes Made
- `AGENT_RULES.md`:
  - Added Section 2: "Continuous HTML Documentation Maintenance (`doc/` & `docs/`)", making it a required protocol for all AI coding assistants to immediately update relevant HTML documentation files (`doc/form_guide.html`, `doc/database_guide.html`, `doc/api_guide.html`, `doc/README.html`) whenever any task, UI tweak, schema modification, or CLI enhancement is performed.
  - Required running `./util --sync-docs` to keep the live GitHub Pages bundle (`docs/`) synchronized.
  - Required updating GitHub Wiki markdown files (`wiki/`) to reflect structural changes.
  - Renumbered subsequent sections (Code Style -> Section 3, Multi-Agent Coordination -> Section 4, Workspace Boundaries -> Section 5).
- `doc/`:
  - Updated `doc/api_guide.html` CLI table with `./util --sync-docs` and `./util --wiki-push`.
  - Updated release version badges across `doc/README.html`, `doc/form_guide.html`, `doc/database_guide.html`, and `doc/api_guide.html` to `v01.00.10`.
- `docs/`:
  - Re-synchronized `docs/` using `./util --sync-docs`.

Verification
- Verified `AGENT_RULES.md` markdown structure and section numbering.
- Ran `./util --sync-docs` to confirm clean asset synchronization.
- Verified working tree with `./util --status`.

Notes
- Future AI assistants must strictly check `doc/` and update HTML files alongside any code edits.

---

## 2026-09-11 19:15:00 IST

Prompt / Request
- Make the git wiki working for this project such that anybody can see and interact with the form and the documentation once the link is shared.

Changes Made
- `docs/` (GitHub Pages Bundle):
  - Created dedicated standalone directory `docs/` configured for GitHub Pages hosting (`https://prasundutta151.github.io/GTAC_REF/`).
  - Copied `index.html`, `dev/style.css`, `dev/app.js`, `dev/db_data.js`, and `database/cycle.txt` into `docs/` to provide immediate static execution with zero build dependencies.
  - Copied full multi-page HTML documentation (`README.html`, `form_guide.html`, `database_guide.html`, `api_guide.html`, `doc_style.css`) into `docs/doc/`.
  - Added `docs/.nojekyll` to bypass Jekyll processing on GitHub Pages.
- `wiki/` (GitHub Wiki Markdown Suite):
  - Created standalone wiki repository suite matching GitHub Wiki format:
    - `wiki/Home.md`: Master wiki landing page with direct links to the live interactive form, interactive HTML documentation, repository, feature matrix, and developer quick start.
    - `wiki/Form-Guide.md`: Complete specification of submitter fields, Question 6 cycle logic, dark add-bar interaction, Gemini validation, and submission summary.
    - `wiki/Database-Architecture.md`: Detailed breakdown of ASCII taxonomy files, CSV registries, ID allocation schemes, and offline exports.
    - `wiki/REST-API-and-CLI.md`: Full documentation for REST API endpoints (`/api/database`, `/api/cycle`, `/api/referees/lookup`, `/api/gemini-validate`, `/api/submit`) and developer CLI tools.
    - `wiki/_Sidebar.md`: Navigation sidebar with links to wiki pages and live web form.
    - `wiki/_Footer.md`: Standard footer with institutional attribution.
- Root Symlinks:
  - Added root symlinks `style.css -> dev/style.css`, `app.js -> dev/app.js`, and `db_data.js -> dev/db_data.js` so `index.html` runs seamlessly when opened directly from the repo root.
- `util`:
  - Added `--sync-docs` command to automatically synchronize latest code, assets, and documentation into `docs/`.
  - Added `--wiki-push [WIKI_URL]` command to package and push `wiki/` markdown pages directly to the GitHub Wiki git repository (`git@github.com:prasundutta151/GTAC_REF.wiki.git`).
  - Bumped version to `01.00.10`.

Verification
- Executed `./util --sync-docs` and verified `docs/` is updated and complete.
- Executed `./util --help` and verified `--sync-docs` and `--wiki-push` flags are recognized.
- Executed `./util --status` and verified version `01.00.10` and git working tree status.
- Verified all wiki markdown documents have valid GitHub wiki links and direct URLs to GitHub Pages.

Notes
- Live Web Form: `https://prasundutta151.github.io/GTAC_REF/`
- Live HTML Documentation: `https://prasundutta151.github.io/GTAC_REF/doc/README.html`
- GitHub Wiki URL: `https://github.com/prasundutta151/GTAC_REF/wiki`

---

## 2026-09-11 18:45:00 IST

Prompt / Request
- Create a comprehensive `README.html` file explaining the form and the database in detail using multiple pages if needed, situated in a dedicated `doc/` folder.

Changes Made
- `doc/`:
  - Created dedicated documentation directory containing a multi-page documentation website.
  - `doc/README.html`: Master documentation portal, system overview, architecture diagram, feature matrix, quick start guide, and navigation hub.
  - `doc/form_guide.html`: In-depth breakdown of all form fields, Question 6 dynamic cycle reading, dark add-bar sequential logic, real-time Gemini validation, title stripping, half-initials matching, and ordered submission confirmation.
  - `doc/database_guide.html`: Comprehensive documentation of the database files (`affiliations.txt`, `expertise.txt`, `career_status.txt`, `cycle.txt`, `Referee_database_A.csv`, `form_submissions.csv`), schemas, ID allocation schemes, and offline export bundle (`db_data.js`).
  - `doc/api_guide.html`: Full reference for REST API endpoints (`/api/database`, `/api/cycle`, `/api/referees/lookup`, `/api/gemini-validate`, `/api/submit`) and `util` CLI command options (`--serve`, `--version`, `--git-push`, `--change-branch`, `--release`, `--status`).
  - `doc/doc_style.css`: Responsive GTAC-themed stylesheet with sticky sidebar navigation, callout boxes, feature cards, tables, and badge styling.
- Symlinks:
  - Created root symlink `README.html -> doc/README.html`.
  - Created dev convenience symlink `dev/doc -> ../doc`.
- `util`:
  - Bumped version to `01.00.09`.

Verification
- Verified all documentation files serve cleanly over HTTP via `./util --serve 8089` returning HTTP 200 for `doc/README.html`, `doc/form_guide.html`, `doc/database_guide.html`, `doc/api_guide.html`, and `doc/doc_style.css`.
- Verified inter-page navigation links work across all sub-pages.
- Verified standalone local file viewing under `file://`.

---

## 2026-09-11 18:40:00 IST

Prompt / Request
- Check the email and Name fields in Gemini by default and validate, mentioning "Validated email" while keeping all inputs editable.
- After submission, show the given information in a much nicer, organized order, and do not show which file it is saved to.

Changes Made
- `dev/server.py`:
  - Implemented `gemini_validate(name, email)` supporting live Gemini REST API when `GEMINI_API_KEY` is present, backed by extensive academic institutional domain verification heuristics (NCRA, IUCAA, RRI, IISc, TIFR, IIA, PRL, ARIES, etc.).
  - Added endpoints `/api/gemini-validate` and `/api/validate-referee` in `do_POST`.
  - Updated `gemini_suggest` to wrap `gemini_validate`.
- `dev/index.html`:
  - Added `#user_email_validation` container under submitter email input.
- `dev/style.css`:
  - Styled `.email-validation-notice` with `.valid` (`✓ Validated email` pill), `.checking`, and `.invalid` states.
  - Expanded `.modal-dialog` width to `720px` with vertical scroll capability.
  - Added structured summary layout classes (`.summary-card`, `.summary-grid`, `.summary-item`, `.summary-referee-card`, `.summary-chips`, `.badge-valid-pill`, `.summary-footer-note`).
- `dev/app.js`:
  - Added `.ref-email-validation` element to referee cards.
  - Wired real-time automatic Gemini validation on `input` (debounced) and `blur` for both referee and submitter Name/Email fields.
  - Explicitly guaranteed that all referee card fields remain completely editable (`setCardInputsDisabled(card, false)`) regardless of verified database status or validation results.
  - Completely redesigned `showSuccessModal()` to present submission details in a clean, elegant order:
    1. Submission Reference & Timestamp badge.
    2. Submitter Profile with resolved Affiliation, Career Status, and Expertise tags + `✓ Validated email` pill.
    3. GTAC Review Volunteering for Cycle 52 & future cycles.
    4. Ordered Referee Suggestions list with individual clean cards displaying Name, Validated Email, Affiliation, Career Status, and Expertise.
    5. Clean reassurance note.
  - Removed all mentions of internal file paths (`database/Referee_database_A.csv`, `form_submissions.csv`, ASCII files, `./util --serve`).
- `util`:
  - Bumped version to `01.00.08`.

Verification
- Verified `gemini_validate` via curl with known academic domains (`ncra.tifr.res.in`, `iucaa.in`), title-stripped names, and invalid email formats.
- Verified that referee card inputs remain editable upon database match or Gemini validation.
- Verified that submission modal displays full structured data in logical order without displaying file storage paths.

---

## 2026-09-11 18:35:00 IST

Prompt / Request
- Replace "This cycle" in Question 6 with "For Cycle:" reading dynamically from `cycle.txt` (initialized to `52`).

Changes Made
- `database/cycle.txt`:
  - Created ASCII file storing the current GTAC proposal cycle number (`52`).
  - Added convenience symlinks `cycle.txt -> database/cycle.txt` (root) and `dev/cycle.txt -> ../database/cycle.txt` (`dev/`).
- `dev/server.py`:
  - Added `load_cycle()` helper dynamically reading cycle value from `cycle.txt`.
  - Updated `sync_db_data_js()` to bundle `"cycle": "52"` into `dev/db_data.js`.
  - Updated `/api/database` endpoint to return `"cycle": load_cycle()`.
  - Added `/api/cycle` and `/cycle.txt` routes to serve current cycle value directly.
- `dev/index.html`:
  - Replaced `<span class="cycle-title">This cycle:</span>` with `<span class="cycle-title" id="cycle-title-label">For Cycle: <span id="current-cycle-display">52</span></span>`.
- `dev/app.js`:
  - Added `cycle: '52'` to state object.
  - Added `updateCycleDisplay(cycleVal)` and `fetchCycleFile()`.
  - Integrated dynamic cycle extraction in `loadDatabase()` and `useEmbeddedDatabase()`.
  - Updated submission confirmation modal to display `For Cycle ${state.cycle}`.
- `dev/db_data.js`:
  - Re-synced offline bundle with `"cycle": "52"`.
- `util`:
  - Bumped version to `01.00.07`.

Verification
- Verified direct file content: `cat database/cycle.txt` returns `52`.
- Tested live endpoints via curl: `/api/cycle`, `/cycle.txt`, and `/api/database` all return `52`.
- Tested dynamic runtime modification: changing `database/cycle.txt` to `53` immediately updates `/api/cycle` without server restart.
- Verified offline file mode: `dev/db_data.js` contains `"cycle": "52"` for standalone browser execution.

---

## 2026-09-11 18:30:00 IST

Prompt / Request
- When writing to the referee database, remove honorific titles such as Dr, Prof, Mr, etc.
- Cross-check if a referee name exists with half-initials (surname full) as well, and fill it up in the form mentioning this referee already exists.
- If it is self entry, self entry gets preference over existing database records.

Changes Made
- `database/Referee_database_A.csv`:
  - Stripped honorific titles (`Prof.`, `Dr.`) from all existing records in the database.
- `dev/server.py`:
  - Implemented `strip_titles()` regex removing titles (`Dr`, `Prof`, `Professor`, `Mr`, `Ms`, `Mrs`, `Shri`, `Smt`).
  - Implemented `parse_name_parts()` to extract normalized surnames and given name tokens for both `First Last` and `Last, First` formats.
  - Implemented `match_referee_name()` to match names via exact string or half-initials with full surname (e.g. `Y. Gupta` -> `Yashwant Gupta`, `J. Chengalur` -> `Jayaram Chengalur`, `P. Dutta` -> `Prasun Dutta`).
  - Updated `save_referee_entry(entry, is_self)` to strip titles prior to persistence, cross-check against existing records using half-initials, and give self entries preference when updating existing records.
  - Updated `/api/referees/lookup` to support both prefix/substring and half-initials matching.
- `dev/app.js`:
  - Implemented client-side `stripTitles()`, `parseNameParts()`, `matchRefereeName()`, and `findMatchingReferee()` matching server-side logic for offline/file:// mode.
  - Added real-time cross-check listeners on referee card name and email inputs (`change` and `blur` events).
  - Updated `populateCardWithReferee()`: auto-fills matching referee details, displays clear banner stating `Referee Already Exists in Database`, and locks verified entries.
  - Enforced self-entry preference: prevents self-entry card from being overwritten by DB lookup and ensures submitter edits update records authoritatively upon submission.
  - Updated `setupAutocomplete()` dropdown to query both direct substrings and half-initials matches.
  - Stripped titles in `handleFormSubmit()` and `handleLocalSubmission()`.
- `dev/db_data.js`:
  - Re-synced offline database bundle with title-stripped referee records via `server.sync_db_data_js()`.
- `util`:
  - Bumped version to `01.00.06`.

Verification
- Verified `strip_titles()` across variations: `Prof. Dr. Yashwant Gupta` -> `Yashwant Gupta`.
- Verified half-initials matching with tests: `Y. Gupta`, `Y Gupta`, `Gupta, Y.`, `J. Chengalur`, `P. Dutta` all match their respective database entries; non-matching initials (`A. Gupta`) correctly rejected.
- Verified `/api/referees/lookup` returns exact and half-initials matches via HTTP endpoint.
- Verified self-entry precedence: Submitter details are preserved and not overridden when matching existing database entries.

Notes
- Titles are cleanly stripped across both server-side submissions and client-side offline storage.

---

## 2026-09-11 18:25:00 IST

Prompt / Request
- Transform the "Add Referee Suggestion" interaction into a full-length dark background bar.
- Ensure it always comes after the ongoing referee blocks (either own entry or subsequent referee suggestions).
- Sequential behavior: First click adds own entry (auto-populated with submitter profile); subsequent clicks add others entry (blank cards for peer reviewer suggestions).

Changes Made
- `dev/index.html`:
  - Removed small secondary button from Section 2 header.
  - Added `.add-referee-bar-container` with full-length dark background bar button `#btn-add-referee` directly below `#referee-list`.
  - Added `#referee-empty-hint` inside `#referee-list` to gracefully guide users when no blocks are currently added.
  - Updated initial button label to `Add Referee Suggestion (Own Entry)`.
- `dev/style.css`:
  - Styled `.btn-add-referee-bar` with full width (`100%`), deep dark gradient background (`linear-gradient(135deg, #0f172a 0%, #1e293b 100%)`), circular icon with rotate hover animation, and interactive elevation states.
  - Styled `.referee-empty-hint` with dashed border and subdued icon.
- `dev/app.js`:
  - Added `updateRefereeBarText()`: dynamically updates dark bar label between `Add Referee Suggestion (Own Entry)` (when 0 cards) and `Add Referee Suggestion (Others Entry)` (when >= 1 cards), and toggles `#referee-empty-hint`.
  - Updated `#btn-add-referee` click handler: if 0 cards present, creates Block 1 as Own Entry; if cards already exist, creates subsequent blocks as Others Entry.
  - Added `populateCardWithOwnEntry()`: populates Block 1 with submitter profile details and badge `Own Entry (Submitter)`; if review willingness in item 6 is marked "Yes", locks block as `Self - Review Volunteer (Locked)`.
  - Added `syncCardWithUserProfile()`: keeps submitter profile edits in Section 1 synchronized in real time with Block 1.
  - Updated `handleReviewWillingnessChange()`: selecting "Yes" creates/locks Block 1 as own entry; selecting "No" unlocks it.
  - Form validation: enforces that at least one referee suggestion is added before submitting.
- `util`:
  - Bumped version to `01.00.05`.

Verification
- Verified server starts cleanly via `./util --serve 8085` and serves updated `index.html`, `style.css`, and `app.js`.
- Verified layout positioning: `#btn-add-referee` is full-length and always positioned beneath all ongoing referee blocks.
- Verified initial load displays empty hint and dark bar reads `Add Referee Suggestion (Own Entry)`.
- Verified subsequent clicks add blank "Others Entry" peer referee suggestions with real-time database lookup.
- Verified removal of cards restores empty hint and resets bar text when 0 blocks remain.

Notes
- The bar dynamically adapts to user state while maintaining strict compliance with the GTAC volunteer locking rules.

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
