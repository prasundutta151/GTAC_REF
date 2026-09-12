# Form System Guide

> Detailed operational specification for the GTAC Referee Registration and Suggestion Form.

---

## 1. Submitter Profile (Section 1)

The submitter profile establishes the identity of the researcher completing the form.

| Field | Input Type | Behavior & Validation Rules |
| :--- | :--- | :--- |
| **1. Your Name** | Text | Required. Automatically stripped of honorific titles (`Dr`, `Prof`, etc.). Synchronizes in real time to Block 1 if review volunteering is enabled. |
| **2. Your Email ID** | Email | Required. Verified by Gemini AI / institutional domain heuristics in real time. Shows a green `✓ Validated email` notice. |
| **3. Your Affiliation** | Dropdown | Dynamically loaded from `database/affiliations.txt`. Includes `+ Others` to register new institutions on the fly. |
| **4. Your Career Status** | Dropdown | Populated from `database/career_status.txt` (Undergraduate to Faculty / Scientist / Engineer / Others). |
| **5. Your Expertise** | Multi-Select Chips | Powered by `ExpertisePicker`. Selecting topics adds removable chips. Includes `+ Others` to add new research domains. |

![Submitter Profile Overview](images/screenshot_01_form_overview.png)
*Figure 1: Submitter profile form with active GTAC proposal cycle badge and institutional taxonomy dropdowns.*

---

## 2. Question 6: GTAC Review Volunteering

Captures whether the submitter wishes to volunteer as a reviewer:

* **For Cycle: 52** (Yes / No radio) — The cycle number is read dynamically from `database/cycle.txt`.
* **Future cycles** (Yes / No radio)

### Linking & Recommendation Logic:
* **Volunteering ("Yes" for either cycle)**: Designates and locks Block 1 as the submitter's Own Entry (`Self - Review Volunteer (Locked)`). Submitter profile changes in Section 1 mirror into Block 1. Additional clicks on the add-bar append peer recommendations (`Add Referee Suggestion (Others Entry)`).
* **Non-Volunteering ("No" for both cycles)**: Submitters can recommend colleagues without volunteering themselves. No self-entry block is created or locked; the add-bar displays `Add Referee Recommendation`. Clicking it creates clean, blank peer recommendation cards with zero locks. The submitter's name is stored as attribution (`suggested_or_verified_by`) with a `DD/MM/YY|HH:MM` timestamp and is never added as a reviewer.

![Validation and Question 6 Volunteering](images/screenshot_02_validation_and_volunteering.png)
*Figure 2: Real-time Gemini email validation badge (`✓ Validated email`) and dynamic Question 6 volunteering for Cycle 52.*

---

## 3. Full-Length Dark Background Bar

Positioned directly after the last active referee block:

```
┌─────────────────────────────────────────────────────────────┐
│    ＋  Add Referee Recommendation / Suggestions             │
└─────────────────────────────────────────────────────────────┘
```

* **When not volunteering (Question 6 is "No")**: Label reads `Add Referee Recommendation`. Clicking appends clean, blank peer recommendation cards.
* **When volunteering (Question 6 is "Yes")**: Block 1 holds the volunteer's own entry, and the label reads `Add Referee Suggestion (Others Entry)`. Clicking appends peer recommendation cards.

---

## 4. Referee Suggestion Cards

Each referee card requires Name, Email, Affiliation, Career Status, and Expertise:

### Real-Time Cross-Checking & Badges:
* **Verified in DB**: Matches an existing verified referee record. Pre-fills fields from the database.
* **Already in DB**: Matches an existing suggested referee record. Pre-fills fields.
* **New Suggestion**: No database match found. Sequentially assigns a new `REF_XXXX` ID upon submission.

### Half-Initials Matching:
The matching engine resolves:
* `Y. Gupta`, `Y Gupta`, `Gupta, Y.` &rarr; matches `Yashwant Gupta`
* `J. Chengalur`, `Prof. J. Chengalur` &rarr; matches `Jayaram Chengalur`
* `P. Dutta` &rarr; matches `Prasun Dutta`

### Editability Guarantee:
> **Important:** All referee card input fields **always remain completely editable**. No inputs are locked into read-only, allowing full freedom to adjust email addresses, institutions, or expertise topics.

![Referee Suggestion Cards & Add Bar](images/screenshot_03_referee_suggestion_cards.png)
*Figure 3: Referee cards showing Self-Entry (Block 1) and Peer Entry (Block 2) with the full-length dark add-bar.*

---

## 5. Gemini AI Auto-Validation

Entering a name or email automatically triggers credential validation:
* Validates RFC email format and institutional domains (e.g. `ncra.tifr.res.in`, `iucaa.in`, `rri.res.in`, `iisc.ac.in`, `.edu`, `.ac.in`).
* Displays a prominent green status pill: `✓ Validated email (Verified institutional domain)`.
* Pre-fills matching affiliation and expertise if not yet selected.

---

## 6. Post-Submission Confirmation

Submissions open a clean, beautifully formatted modal presenting:
1. **Submission Metadata**: Reference ID (`SUB_XXXXXXXX`) and formatted timestamp.
2. **Submitter Profile**: Full name, validated email, affiliation, career status, and expertise.
3. **Review Volunteering**: Selected availability for Cycle 52 and Future Cycles.
4. **Referee Registrations**: Individual cards for each referee with unique ID, type, validated email, and affiliation.
5. **Zero File Path Leaks**: Internal storage paths are completely omitted for a professional presentation.

![Post-Submission Summary Modal](images/screenshot_04_submission_summary.png)
*Figure 4: Post-submission confirmation modal showing structured submission summary and assigned referee IDs.*
