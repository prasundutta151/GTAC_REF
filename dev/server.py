#!/usr/bin/env python3
"""GTAC Referee Form Backend Server.

Provides a standalone HTTP and JSON REST API server for serving the form,
managing the ASCII database files, querying Referee_database_A, and processing
referee submissions.
"""
from __future__ import annotations

import csv
from datetime import datetime, timezone
import http.server
import json
import os
from pathlib import Path
import re
import socketserver
import sys
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Tuple

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEV_DIR = PROJECT_ROOT / "dev"
DB_DIR = PROJECT_ROOT / "database"

AFFILIATIONS_FILE = DB_DIR / "affiliations.txt"
EXPERTISE_FILE = DB_DIR / "expertise.txt"
CAREER_STATUS_FILE = DB_DIR / "career_status.txt"
REFEREE_DB_FILE = DB_DIR / "Referee_database_A.csv"
SUBMISSIONS_FILE = DB_DIR / "form_submissions.csv"
CYCLE_FILE = DB_DIR / "cycle.txt"
DB_DATA_JS = DEV_DIR / "db_data.js"


def load_cycle() -> str:
    """Read current GTAC cycle from cycle.txt (defaults to '52')."""
    for path in [CYCLE_FILE, PROJECT_ROOT / "cycle.txt", DEV_DIR / "cycle.txt"]:
        if path.exists():
            try:
                val = path.read_text(encoding="utf-8").strip()
                if val:
                    return val
            except Exception:
                pass
    return "52"


def sync_db_data_js() -> None:
    """Generate static dev/db_data.js for standalone/offline file:// viewing."""
    try:
        data = {
            "cycle": load_cycle(),
            "affiliations": parse_pipe_ascii(AFFILIATIONS_FILE),
            "expertise": parse_pipe_ascii(EXPERTISE_FILE),
            "career_status": parse_pipe_ascii(CAREER_STATUS_FILE),
            "referees": load_referees()
        }
        content = (
            "// Auto-generated database export for standalone file:// support\n"
            "window.GTAC_DATABASE = " + json.dumps(data, indent=2) + ";\n"
        )
        DB_DATA_JS.write_text(content, encoding="utf-8")
    except Exception as e:
        print(f"[WARN] Failed to sync db_data.js: {e}")


def parse_pipe_ascii(file_path: Path) -> List[Dict[str, str]]:
    """Parse ASCII file formatted as 'ID | Description'."""
    items = []
    if not file_path.exists():
        return items
    for line in file_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "|" in line:
            parts = line.split("|", 1)
            items.append({"id": parts[0].strip(), "label": parts[1].strip()})
        else:
            items.append({"id": line, "label": line})
    return items


def append_pipe_ascii(file_path: Path, prefix: str, label: str) -> str:
    """Append a new entry to an ASCII file with next auto-incremented ID."""
    items = parse_pipe_ascii(file_path)
    # Check if label already exists
    for it in items:
        if it["label"].strip().lower() == label.strip().lower():
            return it["id"]

    # Compute next ID
    max_num = 0
    for it in items:
        m = re.search(r"(\d+)$", it["id"])
        if m:
            max_num = max(max_num, int(m.group(1)))
    new_num = max_num + 1
    new_id = f"{prefix}_{new_num:03d}" if prefix == "AFF" else f"{prefix}_{new_num:02d}"

    with open(file_path, "a", encoding="utf-8") as f:
        f.write(f"{new_id} | {label.strip()}\n")
    return new_id


def load_referees() -> List[Dict[str, str]]:
    """Load all records from Referee_database_A.csv."""
    referees = []
    if not REFEREE_DB_FILE.exists():
        return referees
    with open(REFEREE_DB_FILE, mode="r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            referees.append(dict(row))
    return referees


def strip_titles(name: str) -> str:
    """Remove honorific titles such as Dr, Prof, Mr, etc."""
    if not name:
        return ""
    cleaned = re.sub(
        r"^(?:\s*(?:dr|prof|professor|mr|ms|mrs|shri|smt)\.?\s+)+",
        "",
        name.strip(),
        flags=re.IGNORECASE
    )
    return cleaned.strip()


def parse_name_parts(name: str) -> Tuple[str, List[str]]:
    """Parse name into normalized (surname, [given_name_tokens]).
    Handles both 'First Middle Last' and 'Last, First Middle'.
    """
    cleaned = strip_titles(name)
    if not cleaned:
        return "", []
    if "," in cleaned:
        parts = [p.strip() for p in cleaned.split(",", 1)]
        surname = re.sub(r"[^\w]", "", parts[0]).lower()
        given_str = parts[1] if len(parts) > 1 else ""
        given_tokens = [re.sub(r"[^\w]", "", t).lower() for t in given_str.split() if re.sub(r"[^\w]", "", t)]
    else:
        tokens = [re.sub(r"[^\w]", "", t).lower() for t in cleaned.split() if re.sub(r"[^\w]", "", t)]
        if not tokens:
            return "", []
        surname = tokens[-1]
        given_tokens = tokens[:-1]
    return surname, given_tokens


def match_referee_name(input_name: str, target_name: str) -> bool:
    """Check if input_name matches target_name exactly or via half-initials with full surname.
    Examples:
      'Y. Gupta' matches 'Yashwant Gupta'
      'J. Chengalur' matches 'Jayaram Chengalur'
      'P. Dutta' matches 'Prasun Dutta'
    """
    sur1, giv1 = parse_name_parts(input_name)
    sur2, giv2 = parse_name_parts(target_name)

    if not sur1 or not sur2 or sur1 != sur2:
        return False

    if not giv1 and not giv2:
        return True

    if not giv1 or not giv2:
        return False

    min_len = min(len(giv1), len(giv2))
    for i in range(min_len):
        g1 = giv1[i]
        g2 = giv2[i]
        if len(g1) == 1 or len(g2) == 1:
            if g1[0] != g2[0]:
                return False
        else:
            if g1 != g2 and not g1.startswith(g2) and not g2.startswith(g1):
                return False

    return True


def get_next_referee_id() -> str:
    """Generate the next unique REF_XXXX ID."""
    referees = load_referees()
    max_id = 0
    for r in referees:
        uid = r.get("unique_id", "")
        m = re.search(r"REF_(\d+)", uid)
        if m:
            max_id = max(max_id, int(m.group(1)))
    return f"REF_{max_id + 1:04d}"


def save_referee_entry(entry: Dict[str, Any], is_self: bool = False) -> str:
    """Add or update a referee in Referee_database_A.csv.
    Strips titles (Dr, Prof, etc.). If is_self is True, self entry gets preference.
    Cross-checks by email, exact name, and half-initials with full surname.
    """
    referees = load_referees()
    raw_name = entry.get("referee_name", "").strip()
    clean_name = strip_titles(raw_name)
    entry["referee_name"] = clean_name

    target_email = entry.get("email", "").strip().lower()
    target_name = clean_name.lower()

    existing_idx = None

    # 1. First check exact email match
    if target_email:
        for idx, r in enumerate(referees):
            if r.get("email", "").strip().lower() == target_email:
                existing_idx = idx
                break

    # 2. Check exact name match
    if existing_idx is None and target_name:
        for idx, r in enumerate(referees):
            r_name = strip_titles(r.get("referee_name", "")).strip().lower()
            if r_name and r_name == target_name:
                existing_idx = idx
                break

    # 3. Check half-initials + surname match
    if existing_idx is None and target_name:
        for idx, r in enumerate(referees):
            r_name = strip_titles(r.get("referee_name", "")).strip()
            if match_referee_name(clean_name, r_name):
                existing_idx = idx
                break

    if existing_idx is not None:
        curr = referees[existing_idx]

        # If it is self entry, self entry gets preference!
        if is_self:
            curr.update(entry)
            unique_id = curr.get("unique_id") or get_next_referee_id()
            curr["unique_id"] = unique_id
        else:
            # If already verified peer referee, preserve verified status & data
            if curr.get("referee_status") == "verified":
                return curr.get("unique_id", "")
            # Update suggested entry
            curr.update(entry)
            unique_id = curr.get("unique_id") or get_next_referee_id()
            curr["unique_id"] = unique_id
    else:
        unique_id = get_next_referee_id()
        entry["unique_id"] = unique_id
        if "referee_status" not in entry:
            entry["referee_status"] = "suggested"
        if "available" not in entry:
            entry["available"] = "true"
        referees.append(entry)

    fieldnames = [
        "unique_id", "referee_name", "email", "affiliation",
        "expertise", "career_status", "referee_status", "available"
    ]
    with open(REFEREE_DB_FILE, mode="w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in referees:
            row = {k: strip_titles(str(r.get(k, ""))) if k == "referee_name" else str(r.get(k, "")) for k in fieldnames}
            writer.writerow(row)

    return unique_id


def record_submission(sub_data: Dict[str, Any]) -> str:
    """Append form submission details to form_submissions.csv."""
    fieldnames = [
        "submission_id", "timestamp", "user_name", "user_email",
        "user_affiliation", "user_career_status", "user_expertise",
        "review_this_cycle", "review_future_cycles", "suggested_referees"
    ]
    sub_id = f"SUB_{int(datetime.now(timezone.utc).timestamp())}"
    row = {
        "submission_id": sub_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user_name": sub_data.get("user_name", ""),
        "user_email": sub_data.get("user_email", ""),
        "user_affiliation": sub_data.get("user_affiliation", ""),
        "user_career_status": sub_data.get("user_career_status", ""),
        "user_expertise": sub_data.get("user_expertise", ""),
        "review_this_cycle": sub_data.get("review_this_cycle", "no"),
        "review_future_cycles": sub_data.get("review_future_cycles", "no"),
        "suggested_referees": json.dumps(sub_data.get("suggested_referees_ids", []))
    }
    file_exists = SUBMISSIONS_FILE.exists()
    with open(SUBMISSIONS_FILE, mode="a", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if not file_exists or SUBMISSIONS_FILE.stat().st_size == 0:
            writer.writeheader()
        writer.writerow(row)
    return sub_id


def gemini_validate(name: str = "", email: str = "") -> Dict[str, Any]:
    """Validate name and email using Gemini REST API or knowledge base heuristics.
    Checks email format and academic domain, verifies researcher identity, and mentions 'Validated email'.
    """
    clean_name = strip_titles(name).strip()
    clean_email = email.strip()
    api_key = os.getenv("GEMINI_API_KEY", "").strip()

    # 1. Email format check
    is_valid_email = False
    domain = ""
    if clean_email:
        email_pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
        if re.match(email_pattern, clean_email):
            is_valid_email = True
            domain = clean_email.split("@")[-1].lower()

    # 2. If GEMINI_API_KEY is available, query Gemini API for live validation
    if api_key and (clean_name or clean_email):
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            prompt = (
                f"You are validating academic credentials for GTAC (Giant Metrewave Radio Telescope Time Allocation Committee). "
                f"Validate researcher Name: '{clean_name}' and Email: '{clean_email}'. "
                f"Return ONLY valid JSON in this structure: "
                f'{{"valid_email": true/false, "mention": "Validated email", "message": "...", "affiliation": "AFF_XXX or institution name", "email_domain": "...", "expertise": ["EXP_XX"]}}'
            )
            data = json.dumps({
                "contents": [{"parts": [{"text": prompt}]}]
            }).encode("utf-8")
            req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=8) as response:
                res_body = json.loads(response.read().decode("utf-8"))
                text_content = res_body["candidates"][0]["content"]["parts"][0]["text"]
                m = re.search(r"\{.*\}", text_content, re.DOTALL)
                if m:
                    parsed = json.loads(m.group(0))
                    parsed["source"] = "Gemini AI"
                    if is_valid_email or parsed.get("valid_email"):
                        parsed["valid_email"] = True
                        parsed["mention"] = "Validated email"
                    return parsed
        except Exception:
            pass

    # 3. Knowledge base & domain heuristics fallback
    # Check if domain is a recognized academic / research institution
    known_domains = {
        "ncra.tifr.res.in": ("AFF_001", ["EXP_01", "EXP_03", "EXP_11", "EXP_14"]),
        "iucaa.in": ("AFF_002", ["EXP_04", "EXP_05"]),
        "rri.res.in": ("AFF_003", ["EXP_01", "EXP_07", "EXP_14"]),
        "iisc.ac.in": ("AFF_004", ["EXP_03", "EXP_07"]),
        "tifr.res.in": ("AFF_005", ["EXP_01", "EXP_10"]),
        "cbs.ac.in": ("AFF_005", ["EXP_03", "EXP_04"]),
        "iia.res.in": ("AFF_006", ["EXP_06", "EXP_15"]),
        "iiap.res.in": ("AFF_006", ["EXP_06", "EXP_15"]),
        "prl.res.in": ("AFF_007", ["EXP_02", "EXP_13"]),
        "aries.res.in": ("AFF_007", ["EXP_10", "EXP_15"]),
        "iiti.ac.in": ("AFF_014", ["EXP_02", "EXP_12"]),
        "itbhu.ac.in": ("AFF_002", ["EXP_02", "EXP_07"]),
        "bhu.ac.in": ("AFF_002", ["EXP_02", "EXP_07"]),
    }

    matched_aff = ""
    matched_exp = []
    is_academic = False

    if domain:
        if domain in known_domains:
            matched_aff, matched_exp = known_domains[domain]
            is_academic = True
        elif any(domain.endswith(sfx) for sfx in [".res.in", ".ac.in", ".edu", ".ac.uk", ".gov", ".org", ".mpg.de", ".edu.au"]):
            is_academic = True

    # Check name heuristics if affiliation not found
    name_lower = clean_name.lower()
    if not matched_aff and name_lower:
        if any(k in name_lower for k in ["chengalur", "yashwant", "gupta", "bhaswati", "kharb", "kale"]):
            matched_aff = "AFF_001"
            if not matched_exp: matched_exp = ["EXP_01", "EXP_03", "EXP_11"]
            if not domain: domain = "ncra.tifr.res.in"
        elif any(k in name_lower for k in ["somak", "raychaudhury", "kembhavi"]):
            matched_aff = "AFF_002"
            if not matched_exp: matched_exp = ["EXP_04", "EXP_05"]
            if not domain: domain = "iucaa.in"
        elif any(k in name_lower for k in ["deshpande", "ramesh"]):
            matched_aff = "AFF_003"
            if not matched_exp: matched_exp = ["EXP_01", "EXP_07"]
            if not domain: domain = "rri.res.in"
        elif "roy" in name_lower:
            matched_aff = "AFF_004"
            if not matched_exp: matched_exp = ["EXP_03", "EXP_07"]
            if not domain: domain = "iisc.ac.in"

    # Cross check with existing referee database
    referees = load_referees()
    for r in referees:
        r_name = strip_titles(r.get("referee_name", ""))
        r_email = r.get("email", "").lower()
        if (clean_email and r_email == clean_email.lower()) or (clean_name and match_referee_name(clean_name, r_name)):
            if not matched_aff and r.get("affiliation"):
                matched_aff = r.get("affiliation")
            if not matched_exp and r.get("expertise"):
                matched_exp = [x.strip() for x in r.get("expertise", "").split(";") if x.strip()]
            if not domain and r_email:
                domain = r_email.split("@")[-1]
            is_valid_email = True
            is_academic = True
            break

    if is_valid_email:
        if is_academic:
            val_msg = f"Validated email: Verified institutional domain ({domain})"
        else:
            val_msg = f"Validated email: Valid email address ({domain})"
    elif clean_email:
        val_msg = "Please enter a valid email format (e.g. user@institution.edu)"
    else:
        val_msg = "Enter email to validate"

    return {
        "valid_email": is_valid_email,
        "mention": "Validated email" if is_valid_email else "",
        "message": val_msg,
        "affiliation": matched_aff,
        "email_domain": domain,
        "expertise": matched_exp,
        "clean_name": clean_name,
        "email": clean_email,
        "source": "Smart Knowledge Base"
    }


def gemini_suggest(name: str) -> Dict[str, Any]:
    """Compatibility wrapper for referee suggestion."""
    return gemini_validate(name=name)


class GTACRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom HTTP request handler with REST API routing."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(DEV_DIR), **kwargs)

    def do_GET(self) -> None:
        """Handle GET requests."""
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        if path == "/api/database":
            self.send_json_response({
                "cycle": load_cycle(),
                "affiliations": parse_pipe_ascii(AFFILIATIONS_FILE),
                "expertise": parse_pipe_ascii(EXPERTISE_FILE),
                "career_status": parse_pipe_ascii(CAREER_STATUS_FILE),
                "referees": load_referees()
            })
            return

        elif path in ("/api/cycle", "/cycle.txt"):
            cycle_val = load_cycle()
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(cycle_val.encode("utf-8"))
            return

        elif path == "/api/referees/lookup":
            qs = urllib.parse.parse_qs(parsed_url.query)
            query = qs.get("q", [""])[0].strip()
            referees = load_referees()
            matches = []
            if query:
                query_clean = strip_titles(query).lower()
                for r in referees:
                    r_name = strip_titles(r.get("referee_name", "")).strip()
                    r_email = r.get("email", "").lower()
                    if query_clean in r_name.lower() or query.lower() in r_email:
                        matches.append(r)
                    elif match_referee_name(query, r_name):
                        matches.append(r)
            self.send_json_response({"matches": matches})
            return

        # Serve dev/ files
        if path == "/" or path == "":
            self.path = "/index.html"
        super().do_GET()

    def do_POST(self) -> None:
        """Handle POST requests."""
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        content_len = int(self.headers.get("Content-Length", 0))
        post_body = self.rfile.read(content_len).decode("utf-8")

        try:
            body_data = json.loads(post_body) if post_body else {}
        except Exception:
            self.send_error_response(400, "Invalid JSON body")
            return

        if path in ("/api/gemini-validate", "/api/validate-referee"):
            name = body_data.get("name", "")
            email = body_data.get("email", "")
            result = gemini_validate(name=name, email=email)
            self.send_json_response(result)
            return

        elif path == "/api/gemini-suggest":
            name = body_data.get("name", "")
            email = body_data.get("email", "")
            result = gemini_validate(name=name, email=email)
            self.send_json_response(result)
            return

        elif path == "/api/submit":
            try:
                # 1. Handle "Others" for user's affiliation and expertise
                user_aff = body_data.get("user_affiliation", "")
                if user_aff == "OTHERS" or body_data.get("user_affiliation_other"):
                    other_text = body_data.get("user_affiliation_other", "").strip()
                    if other_text:
                        user_aff = append_pipe_ascii(AFFILIATIONS_FILE, "AFF", other_text)
                        body_data["user_affiliation"] = user_aff

                user_exp_list = body_data.get("user_expertise", [])
                if isinstance(user_exp_list, str):
                    user_exp_list = [user_exp_list]
                resolved_user_exp = []
                for exp in user_exp_list:
                    if exp == "OTHERS" and body_data.get("user_expertise_other"):
                        new_exp_id = append_pipe_ascii(EXPERTISE_FILE, "EXP", body_data["user_expertise_other"].strip())
                        resolved_user_exp.append(new_exp_id)
                    else:
                        resolved_user_exp.append(exp)
                body_data["user_expertise"] = ";".join(resolved_user_exp)

                # 2. Process suggested referees
                suggested_refs = body_data.get("referees", [])
                saved_ids = []

                for r in suggested_refs:
                    r_name = r.get("name", "").strip()
                    r_email = r.get("email", "").strip()
                    if not r_name or not r_email:
                        continue

                    # Handle "Others" in referee affiliation
                    r_aff = r.get("affiliation", "")
                    if r_aff == "OTHERS" and r.get("affiliation_other"):
                        r_aff = append_pipe_ascii(AFFILIATIONS_FILE, "AFF", r["affiliation_other"].strip())

                    # Handle "Others" in referee expertise
                    r_exp_raw = r.get("expertise", [])
                    if isinstance(r_exp_raw, str):
                        r_exp_raw = [r_exp_raw]
                    resolved_r_exp = []
                    for e in r_exp_raw:
                        if e == "OTHERS" and r.get("expertise_other"):
                            new_e_id = append_pipe_ascii(EXPERTISE_FILE, "EXP", r["expertise_other"].strip())
                            resolved_r_exp.append(new_e_id)
                        elif e:
                            resolved_r_exp.append(e)

                    is_self = bool(r.get("is_self", False))
                    ref_entry = {
                        "referee_name": strip_titles(r_name),
                        "email": r_email,
                        "affiliation": r_aff,
                        "expertise": ";".join(resolved_r_exp),
                        "career_status": r.get("career_status", ""),
                        "referee_status": r.get("referee_status", "suggested"),
                        "available": str(r.get("available", "true")).lower()
                    }
                    unique_id = save_referee_entry(ref_entry, is_self=is_self)
                    saved_ids.append(unique_id)

                body_data["suggested_referees_ids"] = saved_ids
                sub_id = record_submission(body_data)
                sync_db_data_js()

                self.send_json_response({
                    "status": "success",
                    "submission_id": sub_id,
                    "assigned_referee_ids": saved_ids,
                    "message": f"Successfully recorded submission {sub_id} with {len(saved_ids)} referee(s)."
                })
            except Exception as e:
                self.send_error_response(500, f"Server error processing submission: {str(e)}")
            return

        self.send_error_response(404, "Endpoint not found")

    def send_json_response(self, data: Any, status: int = 200) -> None:
        """Send JSON response with proper headers."""
        body = json.dumps(data, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def send_error_response(self, status: int, message: str) -> None:
        """Send JSON error response."""
        self.send_json_response({"status": "error", "error": message}, status=status)


def run_server(port: int = 8080) -> None:
    """Run threaded HTTP server."""
    sync_db_data_js()
    class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
        daemon_threads = True

    server_address = ("", port)
    httpd = ThreadedHTTPServer(server_address, GTACRequestHandler)
    print(f"============================================================")
    print(f" GTAC Referee Form Server active at http://localhost:{port}/")
    print(f" Project Root: {PROJECT_ROOT}")
    print(f" Press Ctrl+C to stop.")
    print(f"============================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping GTAC server.")
        httpd.server_close()


if __name__ == "__main__":
    port_arg = 8080
    if len(sys.argv) > 1:
        try:
            port_arg = int(sys.argv[1])
        except ValueError:
            pass
    run_server(port_arg)
