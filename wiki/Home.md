# Welcome to the GTAC Referee System Wiki

> **Giant Metrewave Radio Telescope Time Allocation Committee (GTAC)**  
> National Centre for Radio Astrophysics (NCRA-TIFR), Pune, India

The **GTAC Referee Registration and Suggestion System** (`GTAC_REF`) is a dedicated intake platform and referee database manager. It streamlines volunteer referee intake, peer reviewer suggestions, institutional validation, and automated registry synchronization for GMRT observing proposal cycles.

---

## 🚀 Live Access & Sharing Links

Anyone can access and use the form or browse the documentation via these public URLs:

| Resource | Public URL | Description |
| :--- | :--- | :--- |
| **Live Interactive Form** | [https://prasundutta151.github.io/GTAC_REF/](https://prasundutta151.github.io/GTAC_REF/) | The full, live, interactive HTML5 referee registration & suggestion form. |
| **Referee Directory & Lookup** | [https://prasundutta151.github.io/GTAC_REF/referees.html](https://prasundutta151.github.io/GTAC_REF/referees.html) | Live searchable registry with human-readable values and color-coded status blocks (Orange, Yellow, Red). |
| **Interactive HTML Docs** | [https://prasundutta151.github.io/GTAC_REF/doc/README.html](https://prasundutta151.github.io/GTAC_REF/doc/README.html) | Rich multi-page documentation with search, responsive sidebar, and guides. |
| **GitHub Repository** | [https://github.com/prasundutta151/GTAC_REF](https://github.com/prasundutta151/GTAC_REF) | Main source code repository. |

---

## 📚 Wiki Contents

1. **[[Form-Guide|📋 Form System Guide]]**: Detailed breakdown of every input field, Question 6 review volunteering, dark add-bar interaction, real-time Gemini validation, half-initials matching, and ordered submission summaries.
2. **[[Referee-Directory|🔍 Referee Directory & Lookup]]**: Comprehensive guide for the live reviewer registry, multi-criteria filtering (Name, Email, Affiliation, Career, Expertise), color-coded row cards (Orange, Yellow, Red), and font typography.
3. **[[Database-Architecture|🗄️ Database Architecture]]**: Overview of plain-text ASCII taxonomies (`affiliations.txt`, `expertise.txt`, `career_status.txt`, `cycle.txt`), relational CSV registries (`Referee_database_A.csv`, `form_submissions.csv`), and offline bundles (`db_data.js`).
4. **[[REST-API-and-CLI|⚡ REST API & CLI Reference]]**: Detailed documentation of the Python backend REST API and the `util` developer command-line tool.

---

## 🌟 Key System Capabilities

* **✨ Gemini AI Auto-Validation by Default**: As soon as a referee or submitter name/email is entered, the system validates the credentials against Gemini AI / institutional heuristics and displays a green `✓ Validated email` notice.
* **🔓 Full Editability Guarantee**: Even after successful database verification or Gemini validation, **all referee card inputs remain completely editable**. No fields are locked into a disabled state.
* **🔄 Dynamic GTAC Cycle Reading**: Question 6 dynamically displays `For Cycle: 52` loaded from `database/cycle.txt` without hardcoded cycle text.
* **🔘 Full-Length Dark Add-Bar**: Positioned directly beneath all active cards, sequentially handling Own Entry (Block 1) followed by peer suggestions (Others Entry).
* **🧹 Automatic Title Stripping**: Honorific prefixes (`Dr`, `Prof`, `Mr`, etc.) are cleanly stripped prior to database indexing.
* **🔍 Half-Initials Matching**: Cross-checks entered names like `Y. Gupta`, `J. Chengalur`, or `P. Dutta` against full database records (`Yashwant Gupta`, `Jayaram Chengalur`, `Prasun Dutta`).
* **⭐ Submitter Self-Entry Preference**: Submitter's own entries authoritatively update database records and are never overwritten by existing suggestions.
* **📋 Clean Post-Submission Summary**: Nicely ordered summary of all submitted data without leaking internal file storage paths.

---

## ⚡ Quick Start for Developers

```bash
# Clone the repository
git clone git@github.com:prasundutta151/GTAC_REF.git
cd GTAC_REF

# Start local server (default: port 8080)
./util --serve

# Open in browser
open http://localhost:8080
```
