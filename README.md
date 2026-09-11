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
  - `database/form_submissions.csv`: Proposal submissions log.
- `util`: Standalone CLI utility for project operations.
- `VERSION`: Plaintext tracking file maintaining the active version in `ZZ.YY.XX` format.
- `AGENT_RULES.md`: Development guidelines and multi-agent coordination standards.
- `.gitignore`: Standard project ignore patterns.

## Running the Web Application

Start the local server with the `util` script:

```bash
# Launch server (default port 8080) and open http://localhost:8080/
./util --serve

# Or specify a custom port:
./util --serve 9000
```

## Utility Commands

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

# View status:
./util --status
```
