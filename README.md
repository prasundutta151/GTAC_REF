# GTAC_REF - GTAC Referee Form

This repository is dedicated to the development and maintenance of the **GTAC Referee Form (`GTAC_REF`)** system for the Giant Metrewave Radio Telescope Time Allocation Committee.

## Project Structure

- `dev/`: The designated development workspace.
  - `dev/index.html`: Responsive GTAC registration and referee recommendation form.
  - `dev/style.css`: Clean stylesheet with GTAC theme and referee status indicators.
  - `dev/app.js`: Dynamic form logic, self-reviewer locking, and database lookup.
  - `dev/server.py`: Python 3 HTTP and REST API server.
  - `dev/DEV_NOTES.md`: Running developer log, task specifications, change tracking, and file manifest.
  - `dev/util`: Symlink to root `util` script.
  - `dev/database`: Symlink to `database/`.
- `database/`: Data storage directory:
  - `database/affiliations.txt`: ASCII list of institutions/observatories (extendable via "Others").
  - `database/expertise.txt`: ASCII list of astrophysics/instrumentation topics (extendable via "Others").
  - `database/career_status.txt`: ASCII list of career stages.
  - `database/Referee_database_A.csv`: Main referee registry (`unique_id`, `referee_name`, `email`, `affiliation`, `expertise`, `career_status`, `referee_status`, `available`).
  - `database/form_submissions.csv`: Referee registration and suggestion submissions log.
- `util`: Standalone CLI utility for project operations.
- `VERSION`: Plaintext tracking file maintaining the active version in `ZZ.YY.XX` format.
- `AGENT_RULES.md`: Development guidelines and multi-agent coordination standards.
- `.gitignore`: Standard project ignore patterns.

## 🌐 Live Application & Documentation

- **Live Application Form**: [https://prasundutta151.github.io/GTAC_REF/](https://prasundutta151.github.io/GTAC_REF/)
- **Referee Directory & Lookup**: [https://prasundutta151.github.io/GTAC_REF/referees.html](https://prasundutta151.github.io/GTAC_REF/referees.html)
- **Interactive Documentation**: [https://prasundutta151.github.io/GTAC_REF/doc/README.html](https://prasundutta151.github.io/GTAC_REF/doc/README.html)
- **GitHub Wiki**: [https://github.com/prasundutta151/GTAC_REF/wiki](https://github.com/prasundutta151/GTAC_REF/wiki)

## Running the Web Application

Start the local server with the `util` script:

```bash
# Launch server (default port 8080) and open http://localhost:8080/
./util --serve

# Or specify a custom port:
./util --serve 9000
```

## 🚀 Production Deployment & Central Database Setup Options

When hosted on GitHub Pages, the application runs as a static client with client-side verification and fallback session storage (`localStorage`). To collect all submissions globally into an authoritative central database (`database/Referee_database_A.csv` and `database/form_submissions.csv`), choose one of the following production architectures:

### Option 1: NCRA / Institutional Linux Server (Recommended)
Deploy `server.py` directly on an NCRA-TIFR virtual machine or server under `systemd` with an Nginx reverse proxy and SSL certificate:
- **Service**: Run `python3 dev/server.py 8080` managed by `systemd` (`gtac-ref.service`).
- **Reverse Proxy**: Nginx proxying HTTPS traffic from `https://gtac-ref.ncra.tifr.res.in` to `http://127.0.0.1:8080`.
- **Database Persistence**: Submissions write directly to institutional disk storage.

### Option 2: Cloud Container Hosting (Render / Railway / Docker)
Package the application into a Docker container with a persistent volume mounted to `/app/database`:
```bash
docker build -t gtac-ref .
docker run -d -p 8080:8080 -v /data/gtac_db:/app/database --name gtac-ref gtac-ref
```

### Option 3: GTAC Secretariat Email & JSON Dispatch
Zero-server architecture. The static web form generates an automated `submission_SUB_XXXXXX.json` payload and opens a pre-formatted email to `gtac@ncra.tifr.res.in` with the proposal details.

### Option 4: GitHub Actions & Webhook Automation
Connect form submissions to a webhook or GitHub Repository Dispatch. An automated GitHub Action script ingests the JSON payload, assigns sequential `REF_XXXX` identifiers, and commits new rows directly to `database/Referee_database_A.csv` in Git.

### Connecting Frontend to Remote Backend
In `dev/app.js`, set the `API_BASE_URL` constant:
```javascript
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? '' 
  : 'https://gtac-ref.ncra.tifr.res.in';
```

## Utility Commands

```bash
# Bump minor version (XX) in ZZ.YY.XX:
./util --version

# Set explicit version:
./util --version 01.01.00

# Synchronize GitHub Pages bundle (docs/):
./util --sync-docs

# Push markdown documentation to GitHub Wiki:
./util --wiki-push

# Package a release tarball into versions/:
./util --release

# Switch or create branch:
./util --change-branch <branch-name>

# Stage, commit, and push changes:
./util --git-push -m "Commit message"

# View status:
./util --status
```
