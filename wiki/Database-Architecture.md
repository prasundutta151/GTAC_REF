# Database Architecture

> Technical specification of the GTAC Referee plain-text ASCII taxonomies, relational CSV registries, and offline data layer.

---

## 1. Directory Structure

All database files reside in `database/`:

```text
database/
├── cycle.txt                 # Active proposal cycle integer (e.g. 52)
├── affiliations.txt          # Pipe-delimited observatory and university taxonomy
├── expertise.txt             # Pipe-delimited radio astronomy expertise taxonomy
├── career_status.txt         # Pipe-delimited seniority classification taxonomy
├── Referee_database_A.csv    # Authoritative registry of all GTAC referees
└── form_submissions.csv      # Immutable audit trail of completed submissions
```

---

## 2. Cycle Configuration (`cycle.txt`)

Stores the active proposal cycle number as a plain string:

```text
52
```

* Updated by editing the text file.
* Immediately reflected on the web form and REST API endpoint (`/api/cycle`) without restarting the server.

---

## 3. ASCII Pipe-Delimited Taxonomies

Controlled vocabularies use the standard format: `ID | Description`.

### `affiliations.txt`
Maps sequential identifiers (`AFF_001`, `AFF_002`, ...) to institutions:
```text
AFF_001 | National Centre for Radio Astrophysics (NCRA-TIFR), Pune
AFF_002 | Inter-University Centre for Astronomy and Astrophysics (IUCAA), Pune
AFF_003 | Raman Research Institute (RRI), Bengaluru
AFF_004 | Indian Institute of Science (IISc), Bengaluru
AFF_005 | Tata Institute of Fundamental Research (TIFR), Mumbai
...
```
* **Dynamic Expansion**: When a submitter selects "+ Others", entering a new institution appends the next identifier (e.g. `AFF_031`) automatically upon submission.

### `expertise.txt`
Maps domain identifiers (`EXP_01`, `EXP_02`, ...) to astronomy fields:
```text
EXP_01 | Pulsars, Transients and Fast Radio Bursts
EXP_02 | Cosmology, Epoch of Reionization and 21cm
EXP_03 | Neutral Hydrogen (HI) in Galaxies
EXP_04 | Active Galactic Nuclei, Jets and Quasars
EXP_05 | Galaxy Clusters, Relics, Halos and Cosmic Rays
...
```

### `career_status.txt`
Maps career levels (`CAR_01` to `CAR_07`):
```text
CAR_01 | Undergraduate Student
CAR_02 | PhD Student / Graduate Student
CAR_03 | Post-Doctoral Fellow
CAR_04 | Faculty Member (Assistant / Associate / Full Professor)
CAR_05 | Scientist / Staff Astronomer
CAR_06 | Engineer / Technical Staff
CAR_07 | Others
```

---

## 4. Primary Referee Registry (`Referee_database_A.csv`)

Authoritative table of all verified and suggested referees:

| Column | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `unique_id` | `REF_XXXX` | Unique auto-incrementing ID | `REF_0001` |
| `referee_name` | String | Title-stripped researcher name | `Yashwant Gupta` |
| `email` | String | Academic contact email | `ygupta@ncra.tifr.res.in` |
| `affiliation` | String | Institution ID or custom name | `AFF_001` |
| `expertise` | Semicolon List | Expertise IDs | `EXP_01;EXP_14` |
| `career_status` | String | Career status ID | `CAR_04` |
| `referee_status` | Enum | `verified` or `suggested` | `verified` |
| `available` | Boolean | `true` or `false` | `true` |
| `cycle_stats` | Semicolon List | Historical review performance (`cycle:suggested/accepted/submitted`) | `52:3/2/2;51:4/4/4` |
| `suggested_or_verified_by` | String | Nominator or verification authority | `Prasun Dutta` / `GTAC Committee` |
| `date_time` | `DD/MM/YY\|HH:MM` | Timestamp of suggestion or verification | `12/09/26\|17:30` |

### Title Stripping Protocol:
All honorific prefixes (`Dr`, `Dr.`, `Prof`, `Prof.`, `Professor`, `Mr`, `Ms`, `Mrs`, `Shri`, `Smt`) are stripped prior to writing to this file.

---

## 5. Audit Log (`form_submissions.csv`)

Records each submission transaction:

| Column | Description | Example |
| :--- | :--- | :--- |
| `submission_id` | Timestamped submission ID | `SUB_1789130888` |
| `timestamp` | ISO-8601 UTC timestamp | `2026-09-11T12:48:08Z` |
| `user_name` | Cleaned submitter name | `Prasun Dutta` |
| `user_email` | Submitter email address | `pdutta@iucaa.in` |
| `user_affiliation` | Submitter affiliation ID | `AFF_002` |
| `user_career_status` | Submitter career ID | `CAR_04` |
| `user_expertise` | Submitter expertise IDs | `EXP_02;EXP_07` |
| `review_this_cycle` | Availability for current cycle | `yes` |
| `review_future_cycles`| Availability for future cycles | `no` |
| `suggested_referees` | JSON array of referee IDs | `["REF_0011"]` |

---

## 6. Offline Standalone Bundle (`dev/db_data.js`)

To enable standalone local browser viewing without web server requirements, `dev/server.py` automatically exports the database to `dev/db_data.js`:

```javascript
window.GTAC_DATABASE = {
  "cycle": "52",
  "affiliations": [ ... ],
  "expertise": [ ... ],
  "career_status": [ ... ],
  "referees": [ ... ]
};
```
