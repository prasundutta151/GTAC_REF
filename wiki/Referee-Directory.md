# Referee Directory & Lookup Guide

> Comprehensive operational guide for the GTAC Referee Directory and Search Platform (`referees.html` / `lookup.html`).

---

## 🚀 Live Access

The Referee Directory is live and publicly accessible:

* 🔍 **Direct Web App Link**: [https://prasundutta151.github.io/GTAC_REF/referees.html](https://prasundutta151.github.io/GTAC_REF/referees.html)  
* 📝 **Registration & Suggestion Form**: [https://prasundutta151.github.io/GTAC_REF/](https://prasundutta151.github.io/GTAC_REF/)  
* 📖 **Interactive HTML Documentation**: [https://prasundutta151.github.io/GTAC_REF/doc/README.html](https://prasundutta151.github.io/GTAC_REF/doc/README.html)

---

## 🎯 Purpose & Overview

The **GTAC Referee Directory & Lookup** tool enables Time Allocation Committee (GTAC) members, session chairs, and administrators to quickly browse, query, and evaluate potential proposal reviewers from the database (`Referee_database_A.csv`).

Key capabilities include:
1. **Interactive Multi-Filter Card**: Real-time filtering by any combination of Name, Email, Affiliation, Career Status, and Scientific Expertise.
2. **Human-Readable Taxonomy Mapping**: Translates raw database codes (`AFF_001`, `EXP_01;EXP_14`, `CAR_04`) into full institution names, career titles, and scientific domains.
3. **Rectangular Row Cards**: Every referee is rendered in a distinct rectangular card with clear visual hierarchy.
4. **Color-Coded Status Blocks**:
   * 🟠 **Orange**: **Verified Referees** (verified in database and available for proposal review).
   * 🟡 **Yellow**: **Suggested Referees** (suggested by submitters and available for review).
   * 🔴 **Red**: **Not Available** (unavailable for the current observing cycle).
5. **Purposeful Font Differentiation**: Uses distinct typefaces to distinguish between researcher identity, credentials, and institutional metadata.

---

## 🔎 Multi-Criteria Selection Form

Located at the top of the directory, the selection form allows users to specify one or multiple criteria simultaneously:

| Filter Field | Input Type | Matching & Filtering Behavior |
| :--- | :--- | :--- |
| **1. Referee Name** | Text Input | Real-time debounced filtering. Supports exact substrings and **fuzzy half-initials with full surname** (e.g., typing `Y. Gupta` finds `Yashwant Gupta`; typing `J. Chengalur` finds `Jayaram Chengalur`). Strips honorific titles automatically. |
| **2. Email Address / Domain** | Text Input | Case-insensitive substring matching on email and domain (e.g., typing `@ncra` or `iucaa`). |
| **3. Affiliation** | Dropdown | Dynamically populated with all institutions from `database/affiliations.txt`. Shows human-readable labels sorted alphabetically. |
| **4. Present Career Status** | Dropdown | Populated from `database/career_status.txt` (e.g., *Undergraduate Student*, *Post Doctoral Fellow*, *Faculty Member*, *Scientist*). |
| **5. Scientific Expertise** | Multi-Select Tag Chips | Allows selecting **one or multiple** research disciplines from `database/expertise.txt`. Selected topics appear as removable filter tags (`🏷️ Pulsars ✕`). Referees matching any selected expertise are displayed. |
| **Status Quick Filters** | Pill Buttons | Instant toggle buttons: `All Referees`, `🟠 Verified Only`, `🟡 Suggested Only`, `🔴 Not Available Only`. |
| **Reset Filters** | Button | One-click button (`↺ Reset Filters`) that clears all search criteria and restores the full directory view. |

---

## 🎨 Color-Coded Rectangular Cards (Rows)

Referees appear sequentially in horizontal rectangular row blocks. The color styling clearly conveys verification status and review availability:

### 1. 🟠 Orange Block (`card-verified`)
* **Status**: Verified in database and available (`referee_status: verified`, `available: true`).
* **Visual Accent**: Thick orange left stripe (`#ea580c`), orange card border (`#f97316`), and soft warm gradient background.
* **Badges**:
  * Status Pill: `🟠 VERIFIED REFEREE`
  * Availability Pill: `🟢 Available for Review`

### 2. 🟡 Yellow Block (`card-suggested`)
* **Status**: Peer-suggested referee and available (`referee_status: suggested`, `available: true`).
* **Visual Accent**: Yellow left stripe (`#ca8a04`), yellow card border (`#eab308`), and soft warm yellow background.
* **Badges**:
  * Status Pill: `🟡 SUGGESTED REFEREE`
  * Availability Pill: `🟢 Available for Review`

### 3. 🔴 Red Block (`card-unavailable`)
* **Status**: Reviewer unavailable for the current cycle (`available: false`).
* **Visual Accent**: Crimson left stripe (`#dc2626`), red card border (`#ef4444`), and soft red tinted background.
* **Badges**:
  * Status Pill: `🔴 NOT AVAILABLE`
  * Availability Pill: `⛔ Unavailable this Cycle`

---

## 🔤 Distinct Typography & Font Specifications

Information on each referee card is structured using distinct typography:

```
┌────────────────────────────────────────────────────────────────────────┐
│ [ACCENT BAR]                                                           │
│                                                                        │
│   [REF_0001]   Prof. Yashwant Gupta        [ 🟠 VERIFIED REFEREE ]     │
│                ygupta@ncra.tifr.res.in     [ 🟢 Available for Review ] │
│                                                                        │
│   ✉️ Email: ygupta@ncra.tifr.res.in                                    │
│   🏛️ Affiliation: National Centre for Radio Astrophysics (NCRA-TIFR)  │
│   🎓 Status: FACULTY MEMBER                                            │
│                                                                        │
│   🏷️ Expertise: [ Pulsars, Transients ] [ Interferometry Techniques ]  │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Referee Name**: Rendered in **`Space Grotesk`** (bold display serif/sans, `700` weight, `1.35rem`, dark slate `#0f172a`).
2. **Unique ID**: Rendered in **`JetBrains Mono`** (high-tech monospace, `600` weight, padded capsule background).
3. **Email Address**: Rendered in **`JetBrains Mono`** (monospace, clickable `mailto:` link in sky blue `#0284c7`).
4. **Affiliation**: Rendered in **`Inter`** (`600` weight, dark slate `#1e293b`) with institutional building icon `🏛️`.
5. **Career Status**: Rendered in **`Inter`** (`700` weight, uppercase tracked pill badge in violet `#5b21b6`).
6. **Scientific Expertise**: Rendered as distinct rounded tag chips with borders (`#cbd5e1`) and scientific tag icon `🏷️`.

---

## ⚡ Execution Modes

The directory operates in two complementary environments:

1. **Live REST Server Mode (`./util --serve`)**:
   * Queries `GET /api/database` dynamically.
   * Any newly submitted referees or new institutions added via the registration form appear immediately upon refresh.
2. **Standalone / Offline / GitHub Pages Mode**:
   * Mounts the pre-bundled dataset in `db_data.js` via `window.GTAC_DATABASE`.
   * Requires zero backend server, zero database setup, and runs out of the box under GitHub Pages or local `file://` double-click.
