# REST API & CLI Reference

> Technical reference for the GTAC Referee System Python 3 backend REST API and the developer CLI tool (`util`).

---

## ⚡ Backend REST API

The backend server is implemented in `dev/server.py` using Python 3's built-in standard library (`http.server`, `urllib`, `json`, `csv`). It requires zero third-party dependencies and runs out of the box on any system with Python 3.8+.

Start the server locally:
```bash
./util --serve 8080
# or directly:
python3 dev/server.py 8080
```

---

### 1. `GET /api/database`

Returns a complete snapshot of taxonomies and current referee database records.

* **Method**: `GET`
* **URL**: `/api/database`
* **Query Parameters**: None
* **Response Status**: `200 OK`
* **Response Content-Type**: `application/json`

#### Example Request:
```bash
curl -s http://localhost:8080/api/database
```

#### Example Response:
```json
{
  "cycle": "52",
  "affiliations": [
    { "id": "AFF_001", "label": "National Centre for Radio Astrophysics (NCRA-TIFR), Pune" },
    { "id": "AFF_002", "label": "Inter-University Centre for Astronomy and Astrophysics (IUCAA), Pune" }
  ],
  "expertise": [
    { "id": "EXP_01", "label": "Pulsars, Transients and Fast Radio Bursts" },
    { "id": "EXP_02", "label": "Galaxies and Active Galactic Nuclei (AGN)" }
  ],
  "career_status": [
    { "id": "CAR_01", "label": "Undergraduate Student" },
    { "id": "CAR_04", "label": "Faculty Member" }
  ],
  "referees": [
    {
      "unique_id": "REF_0001",
      "referee_name": "Yashwant Gupta",
      "email": "ygupta@ncra.tifr.res.in",
      "affiliation": "AFF_001",
      "expertise": "EXP_01;EXP_14",
      "career_status": "CAR_04",
      "referee_status": "verified",
      "available": "true"
    }
  ]
}
```

---

### 2. `GET /api/cycle` (and `/cycle.txt`)

Returns the current active GTAC proposal cycle number from `database/cycle.txt`.

* **Method**: `GET`
* **URL**: `/api/cycle` or `/cycle.txt`
* **Response Status**: `200 OK`
* **Response Body**: `52` (text/plain)

---

### 3. `GET /api/referees/lookup`

Cross-checks names or email addresses against `database/Referee_database_A.csv`. Performs exact substring matching as well as **half-initials with full surname matching** (e.g. `Y. Gupta` matches `Yashwant Gupta`).

* **Method**: `GET`
* **URL**: `/api/referees/lookup?q={query}`
* **Response Status**: `200 OK`
* **Response Content-Type**: `application/json`

#### Example Request:
```bash
curl -s "http://localhost:8080/api/referees/lookup?q=P.+Dutta"
```

#### Example Response:
```json
{
  "matches": [
    {
      "unique_id": "REF_0011",
      "referee_name": "Prasun Dutta",
      "email": "pdutta@iucaa.in",
      "affiliation": "AFF_002",
      "expertise": "EXP_02;EXP_07",
      "career_status": "CAR_04",
      "referee_status": "verified",
      "available": "true"
    }
  ]
}
```

---

### 4. `POST /api/gemini-validate`

Validates researcher credentials using the Google Gemini API (if `GEMINI_API_KEY` is configured) or falls back to intelligent institutional domain heuristics.

* **Method**: `POST`
* **URL**: `/api/gemini-validate`
* **Request Header**: `Content-Type: application/json`

#### Example Request:
```bash
curl -s -X POST http://localhost:8080/api/gemini-validate \
  -H "Content-Type: application/json" \
  -d '{"name": "Jayaram Chengalur", "email": "chengalur@ncra.tifr.res.in"}'
```

#### Example Response:
```json
{
  "valid_email": true,
  "mention": "Validated email",
  "message": "Validated email: Verified institutional domain (ncra.tifr.res.in)",
  "affiliation": "AFF_001",
  "email_domain": "ncra.tifr.res.in",
  "expertise": ["EXP_01", "EXP_03", "EXP_11", "EXP_14"],
  "clean_name": "Jayaram Chengalur",
  "email": "chengalur@ncra.tifr.res.in",
  "source": "Smart Knowledge Base"
}
```

---

### 5. `POST /api/submit`

Ingests form submissions, appends newly added affiliations/expertise to taxonomy files, registers new referees in `database/Referee_database_A.csv`, and records audit trails in `database/form_submissions.csv`.

* **Method**: `POST`
* **URL**: `/api/submit`
* **Request Header**: `Content-Type: application/json`

#### Key Ingestion Rules:
1. Strips all honorific titles (`Dr`, `Prof`, `Mr`, etc.) from names.
2. If submitter is volunteering (`is_self: true`), submitter data takes precedence and updates any existing record.
3. Automatically generates sequential `REF_XXXX` identifiers for new referees.
4. Generates a unique `SUB_<timestamp>` submission identifier.

---

## 🛠️ Developer CLI Reference (`util`)

The `util` command-line executable automates daily operations, release packaging, GitHub Pages synchronization, and GitHub Wiki synchronization.

### CLI Command Summary

| Command | Arguments | Description |
| :--- | :--- | :--- |
| `./util --serve` | `[PORT]` | Launch local HTTP server (default port: `8080`). |
| `./util --version` | `[VERSION / bump / xx / yy / zz]` | Bump or set project version in `VERSION`. |
| `./util --show-version` | — | Display current version string. |
| `./util --status` | — | Display project version, current git branch, and git status. |
| `./util --change-branch` | `[BRANCH]` | List branches or switch/create branch. |
| `./util --git-push` | `[-m "Message"]` | Stage all project changes, commit, and push to origin. |
| `./util --sync-docs` | — | Synchronize latest code and guides into `docs/` for GitHub Pages. |
| `./util --wiki-push` | `[WIKI_URL]` | Push markdown files from `wiki/` to GitHub Wiki repository. |
| `./util --release` | — | Package clean release tarball into `versions/`. |

---

### Examples

#### Synchronize GitHub Pages Bundle
```bash
./util --sync-docs
```
Copies `index.html`, `dev/style.css`, `dev/app.js`, `dev/db_data.js`, `database/cycle.txt`, and `doc/` guides into `docs/` with `.nojekyll` for immediate hosting.

#### Push Documentation to GitHub Wiki
```bash
./util --wiki-push
```
Initializes a clean commit of all files in `wiki/` and pushes directly to `git@github.com:prasundutta151/GTAC_REF.wiki.git` on branch `master`.

#### Bump Version & Commit
```bash
./util --version bump
./util --git-push -m "docs: complete git wiki and github pages integration"
```
