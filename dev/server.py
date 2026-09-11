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


def gemini_suggest(name: str) -> Dict[str, Any]:
    """Suggest email domain, affiliation, and expertise for a referee name.

    If GEMINI_API_KEY is present, calls the Gemini REST API; otherwise uses
    observatory heuristics and knowledge base.
    """
    clean_name = name.strip()
    api_key = os.getenv("GEMINI_API_KEY", "").strip()

    if api_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            prompt = (
                f"Identify the likely academic affiliation, primary astronomy/physics expertise, and institutional email domain "
                f"for the astronomer/physicist named '{clean_name}'. Return ONLY valid JSON in this format: "
                f'{{"affiliation": "...", "email_domain": "...", "expertise": ["..."]}}'
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
                    return parsed
        except Exception as e:
            # Fall back to heuristic
            pass

    # Heuristic fallback matching prominent institutions and name hints
    suggestions = {
        "source": "Smart Knowledge Base (Set GEMINI_API_KEY for live AI suggestions)",
        "affiliation": "",
        "email_domain": "",
        "expertise": []
    }
    name_lower = clean_name.lower()
    if any(k in name_lower for k in ["chengalur", "yashwant", "gupta", "bhaswati", "kharb", "kale", "roy"]):
        suggestions["affiliation"] = "AFF_001"
        suggestions["email_domain"] = "ncra.tifr.res.in"
        suggestions["expertise"] = ["EXP_01", "EXP_03", "EXP_11", "EXP_14"]
    elif any(k in name_lower for k in ["somak", "raychaudhury", "kembhavi", "swarup"]):
        suggestions["affiliation"] = "AFF_002"
        suggestions["email_domain"] = "iucaa.in"
        suggestions["expertise"] = ["EXP_04", "EXP_05"]
    elif any(k in name_lower for k in ["deshpande", "rri", "ramesh"]):
        suggestions["affiliation"] = "AFF_003"
        suggestions["email_domain"] = "rri.res.in"
        suggestions["expertise"] = ["EXP_01", "EXP_07", "EXP_14"]
    else:
        # Generic academic pattern
        parts = clean_name.split()
        if len(parts) >= 2:
            last = parts[-1].lower()
            first_init = parts[0][0].lower()
            suggestions["email_hint"] = f"{first_init}{last}@"

    return suggestions


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

        if path == "/api/gemini-suggest":
            name = body_data.get("name", "")
            result = gemini_suggest(name)
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
