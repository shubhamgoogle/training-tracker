#!/usr/bin/env python3
"""SBI Green Marathon S7 Hyderabad — Training Tracker Backend Server.

Provides a lightweight, zero-dependency HTTP server and SQLite persistence layer
compatible with Google Cloud Run and mobile web browsers.
"""

import collections
import datetime
import hashlib
import hmac
from http import cookies
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import logging
import mimetypes
import os
import re
import secrets
import sqlite3
import threading
import time
from urllib.parse import urlparse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("marathon_tracker")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.realpath(os.path.join(BASE_DIR, "static"))
DEFAULT_DATA_DIR = os.path.join(BASE_DIR, "data")
PERSISTENT_DIR = os.environ.get("PERSISTENT_DIR", DEFAULT_DATA_DIR)
DB_PATH = os.environ.get("DB_PATH", os.path.join(DEFAULT_DATA_DIR, "tracker.db"))
SNAPSHOT_PATH = os.environ.get(
    "SNAPSHOT_PATH", os.path.join(PERSISTENT_DIR, "state_backup.json")
)

# Strict allow-list patterns for input validation
ITEM_ID_PATTERN = re.compile(r"^[a-zA-Z0-9_-]{1,64}$")
DAY_ID_PATTERN = re.compile(r"^w([1-9]|1[01])-d[1-7]$")
WEEK_ID_PATTERN = re.compile(r"^w([1-9]|1[01])$")
DEFAULT_DAY_ORDER = [1, 2, 3, 4, 5, 6, 7]
MAX_BODY_BYTES = 65536
MAX_NOTE_LENGTH = 500


def is_valid_day_order(order: object) -> bool:
    """Validate that order is a 7-element permutation of [1, 2, 3, 4, 5, 6, 7]."""
    if not isinstance(order, list) or len(order) != 7:
        return False
    if not all(isinstance(x, int) and not isinstance(x, bool) for x in order):
        return False
    return sorted(order) == DEFAULT_DAY_ORDER

# Rate limiting configuration (per IP)
RATE_LIMIT_WINDOW_SEC = 60
RATE_LIMIT_MAX_REQUESTS = 240
_rate_limit_lock = threading.Lock()
_rate_limit_store: dict[str, collections.deque] = collections.defaultdict(
    collections.deque
)

# Database lock for thread safety across requests
_db_lock = threading.Lock()


def get_secret_key() -> bytes:
    """Resolve secret key securely without hardcoded literals.

    Resolution order: Environment -> Persistent Volume Secret File -> Local Secret File -> Cryptographic RNG.
    """
    env_secret = os.environ.get("SESSION_SECRET_KEY")
    if env_secret:
        return env_secret.encode("utf-8")

    candidate_files = [
        os.path.join(PERSISTENT_DIR, ".session_secret"),
        os.path.join(DEFAULT_DATA_DIR, ".session_secret"),
    ]
    for secret_file in candidate_files:
        if os.path.exists(secret_file):
            try:
                with open(secret_file, "rb") as f:
                    data = f.read().strip()
                    if len(data) >= 32:
                        return data
            except OSError:
                pass

    logger.warning(
        "Generating new session secret key and persisting to storage."
    )
    generated = secrets.token_hex(32).encode("utf-8")
    for secret_file in candidate_files:
        try:
            parent = os.path.dirname(os.path.abspath(secret_file))
            if parent:
                os.makedirs(parent, exist_ok=True)
            with open(secret_file, "wb") as f:
                f.write(generated)
            os.chmod(secret_file, 0o600)
        except OSError:
            pass
    return generated


SECRET_KEY = get_secret_key()

# TODO(security): For multi-user deployments, integrate OAuth 2.0 / OpenID Connect,
# MFA, and leaked-password detection. Currently designed as a single-user personal
# workout tracker with HMAC-signed HttpOnly session cookies and Synchronizer CSRF tokens.
SESSION_TTL_SECONDS = 86400 * 30  # 30-day finite session expiration


def _read_state_from_conn(conn: sqlite3.Connection) -> dict:
    """Read logs, notes, and swaps from an open SQLite connection."""
    cur = conn.cursor()
    cur.execute("SELECT item_id, completed, updated_at FROM exercise_logs")
    logs = {
        row[0]: {"completed": bool(row[1]), "updatedAt": int(row[2])}
        for row in cur.fetchall()
    }
    cur.execute("SELECT day_id, note, updated_at FROM day_notes")
    notes = {
        row[0]: {"note": str(row[1]), "updatedAt": int(row[2])}
        for row in cur.fetchall()
    }
    cur.execute("SELECT week_id, day_order, updated_at FROM week_swaps")
    swaps = {}
    for row in cur.fetchall():
        try:
            parsed_order = json.loads(str(row[1]))
            if is_valid_day_order(parsed_order):
                swaps[row[0]] = {
                    "order": parsed_order,
                    "updatedAt": int(row[2]),
                }
        except ValueError:
            pass
    return {"logs": logs, "notes": notes, "swaps": swaps}


def _save_snapshot(conn: sqlite3.Connection) -> None:
    """Persist full database state to SNAPSHOT_PATH (backed by Cloud Storage volume in Cloud Run)."""
    try:
        snapshot_dir = os.path.dirname(os.path.abspath(SNAPSHOT_PATH))
        if snapshot_dir:
            os.makedirs(snapshot_dir, exist_ok=True)
        state_data = _read_state_from_conn(conn)
        payload = json.dumps(state_data)
        with open(SNAPSHOT_PATH, "w", encoding="utf-8") as f:
            f.write(payload)
    except OSError:
        logger.warning("Could not write state snapshot to %s", SNAPSHOT_PATH)


def _restore_from_snapshot(conn: sqlite3.Connection) -> None:
    """Restore saved logs, notes, and swaps from persistent SNAPSHOT_PATH on container startup."""
    if not os.path.exists(SNAPSHOT_PATH):
        return
    try:
        with open(SNAPSHOT_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict):
            return
    except (OSError, ValueError):
        logger.warning("Could not read state snapshot from %s", SNAPSHOT_PATH)
        return

    logs = data.get("logs", {})
    notes = data.get("notes", {})
    swaps = data.get("swaps", {})

    if isinstance(logs, dict):
        log_rows = []
        for item_id, meta in list(logs.items())[:1000]:
            if (
                isinstance(item_id, str)
                and ITEM_ID_PATTERN.match(item_id)
                and isinstance(meta, dict)
            ):
                completed = meta.get("completed")
                updated_at = meta.get("updatedAt")
                if (
                    isinstance(completed, bool)
                    and isinstance(updated_at, int)
                    and updated_at >= 0
                ):
                    log_rows.append((item_id, 1 if completed else 0, updated_at))
        if log_rows:
            conn.executemany(
                """
                INSERT INTO exercise_logs (item_id, completed, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(item_id) DO UPDATE SET
                    completed = excluded.completed,
                    updated_at = excluded.updated_at
                WHERE excluded.updated_at >= exercise_logs.updated_at
                """,
                log_rows,
            )

    if isinstance(notes, dict):
        note_rows = []
        for day_id, meta in list(notes.items())[:100]:
            if (
                isinstance(day_id, str)
                and DAY_ID_PATTERN.match(day_id)
                and isinstance(meta, dict)
            ):
                note = meta.get("note")
                updated_at = meta.get("updatedAt")
                if (
                    isinstance(note, str)
                    and len(note) <= MAX_NOTE_LENGTH
                    and isinstance(updated_at, int)
                    and updated_at >= 0
                ):
                    note_rows.append((day_id, note.strip(), updated_at))
        if note_rows:
            conn.executemany(
                """
                INSERT INTO day_notes (day_id, note, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(day_id) DO UPDATE SET
                    note = excluded.note,
                    updated_at = excluded.updated_at
                WHERE excluded.updated_at >= day_notes.updated_at
                """,
                note_rows,
            )

    if isinstance(swaps, dict):
        swap_rows = []
        for week_id, meta in list(swaps.items())[:20]:
            if (
                isinstance(week_id, str)
                and WEEK_ID_PATTERN.match(week_id)
                and isinstance(meta, dict)
            ):
                order = meta.get("order")
                updated_at = meta.get("updatedAt")
                if (
                    is_valid_day_order(order)
                    and isinstance(updated_at, int)
                    and not isinstance(updated_at, bool)
                    and updated_at >= 0
                ):
                    swap_rows.append((week_id, json.dumps(order), updated_at))
        if swap_rows:
            conn.executemany(
                """
                INSERT INTO week_swaps (week_id, day_order, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(week_id) DO UPDATE SET
                    day_order = excluded.day_order,
                    updated_at = excluded.updated_at
                WHERE excluded.updated_at >= week_swaps.updated_at
                """,
                swap_rows,
            )


def init_db() -> None:
    """Initialize SQLite schema and restore state from persistent storage snapshot."""
    db_dir = os.path.dirname(os.path.abspath(DB_PATH))
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    with _db_lock:
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("PRAGMA journal_mode=WAL;")
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS exercise_logs (
                    item_id TEXT PRIMARY KEY,
                    completed INTEGER NOT NULL CHECK (completed IN (0, 1)),
                    updated_at INTEGER NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS day_notes (
                    day_id TEXT PRIMARY KEY,
                    note TEXT NOT NULL,
                    updated_at INTEGER NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS week_swaps (
                    week_id TEXT PRIMARY KEY,
                    day_order TEXT NOT NULL,
                    updated_at INTEGER NOT NULL
                )
                """
            )
            _restore_from_snapshot(conn)
            conn.commit()
        finally:
            conn.close()


def create_session_token() -> tuple[str, str]:
    """Generate a cryptographically signed session token and matching CSRF token."""
    session_id = secrets.token_urlsafe(32)
    issued_at = str(int(time.time()))
    payload = f"{session_id}.{issued_at}"
    sig = hmac.new(SECRET_KEY, payload.encode("utf-8"), hashlib.sha256).hexdigest()
    signed_session = f"{payload}.{sig}"
    csrf_token = hmac.new(
        SECRET_KEY, f"csrf:{signed_session}".encode("utf-8"), hashlib.sha256
    ).hexdigest()
    return signed_session, csrf_token


def verify_session_token(signed_session: str) -> tuple[bool, str]:
    """Verify session signature and expiration, returning (is_valid, csrf_token)."""
    if not signed_session or signed_session.count(".") != 2:
        return False, ""
    parts = signed_session.split(".")
    session_id, issued_at_str, sig = parts[0], parts[1], parts[2]
    if not session_id or not issued_at_str.isdigit():
        return False, ""
    issued_at = int(issued_at_str)
    now = int(time.time())
    if now - issued_at > SESSION_TTL_SECONDS or issued_at > now + 60:
        return False, ""
    payload = f"{session_id}.{issued_at_str}"
    expected_sig = hmac.new(
        SECRET_KEY, payload.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(sig, expected_sig):
        return False, ""
    csrf_token = hmac.new(
        SECRET_KEY, f"csrf:{signed_session}".encode("utf-8"), hashlib.sha256
    ).hexdigest()
    return True, csrf_token


def check_rate_limit(client_ip: str) -> bool:
    """Return True if request is within rate limit, False otherwise."""
    now = time.monotonic()
    with _rate_limit_lock:
        dq = _rate_limit_store[client_ip]
        while dq and now - dq[0] > RATE_LIMIT_WINDOW_SEC:
            dq.popleft()
        if len(dq) >= RATE_LIMIT_MAX_REQUESTS:
            return False
        dq.append(now)
        return True


class TrackerRequestHandler(BaseHTTPRequestHandler):
    """HTTP Request Handler with strict security headers, CSRF, and input validation."""

    server_version = "MarathonTracker/1.0"
    sys_version = ""

    def log_message(self, fmt: str, *args) -> None:
        """Log requests without leaking sensitive query parameters or headers."""
        logger.info("%s - %s", self.address_string(), fmt % args)

    def _is_https(self) -> bool:
        proto = self.headers.get("X-Forwarded-Proto", "").lower()
        return proto == "https"

    def _get_session_cookie_name(self) -> str:
        # Use __Host- prefix when served over HTTPS (e.g., Cloud Run), fallback for local HTTP testing
        return "__Host-mt_session" if self._is_https() else "mt_session"

    def _get_or_create_session(self) -> tuple[str, str, bool]:
        """Return (signed_session, csrf_token, is_new)."""
        cookie_header = self.headers.get("Cookie", "")
        if cookie_header:
            c = cookies.SimpleCookie()
            try:
                c.load(cookie_header)
                for name in ("__Host-mt_session", "mt_session"):
                    if name in c:
                        val = c[name].value
                        valid, csrf_token = verify_session_token(val)
                        if valid:
                            return val, csrf_token, False
            except cookies.CookieError:
                pass
        signed_session, csrf_token = create_session_token()
        return signed_session, csrf_token, True

    def _send_security_headers(self, is_api: bool = False) -> None:
        """Apply mandatory security headers (CSP, nosniff, DENY framing, Permissions-Policy)."""
        csp = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self'; "
            "img-src 'self' data:; "
            "font-src 'self'; "
            "connect-src 'self'; "
            "object-src 'none'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        self.send_header("Content-Security-Policy", csp)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header(
            "Permissions-Policy",
            "camera=(), microphone=(), geolocation=(), payment=()",
        )
        if is_api:
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        else:
            self.send_header("Cache-Control", "no-cache")

    def _set_session_cookie(self, signed_session: str) -> None:
        cookie_name = self._get_session_cookie_name()
        attrs = [
            f"{cookie_name}={signed_session}",
            "Path=/",
            "HttpOnly",
            "SameSite=Strict",
            f"Max-Age={SESSION_TTL_SECONDS}",
        ]
        if self._is_https():
            attrs.append("Secure")
        self.send_header("Set-Cookie", "; ".join(attrs))

    def _send_json(
        self,
        status_code: int,
        payload: dict,
        signed_session: str | None = None,
        is_new_session: bool = False,
    ) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._send_security_headers(is_api=True)
        if is_new_session and signed_session:
            self._set_session_cookie(signed_session)
        self.end_headers()
        self.wfile.write(body)

    def _validate_csrf(self, expected_csrf: str) -> bool:
        provided_csrf = self.headers.get("X-CSRF-Token", "")
        if not provided_csrf or not expected_csrf:
            return False
        return hmac.compare_digest(provided_csrf, expected_csrf)

    def do_GET(self) -> None:
        client_ip = self.client_address[0] if self.client_address else "unknown"
        if not check_rate_limit(client_ip):
            self._send_json(429, {"error": "Too many requests. Please slow down."})
            return

        parsed = urlparse(self.path)
        route = parsed.path

        signed_session, csrf_token, is_new_session = self._get_or_create_session()

        if route == "/favicon.ico":
            self.send_response(204)
            self._send_security_headers(is_api=False)
            self.end_headers()
            return

        if route == "/api/health":
            self._send_json(
                200,
                {"status": "ok"},
                signed_session=signed_session,
                is_new_session=is_new_session,
            )
            return

        if route == "/api/state":
            try:
                state = self._fetch_db_state()
                state["csrfToken"] = csrf_token
                self._send_json(
                    200,
                    state,
                    signed_session=signed_session,
                    is_new_session=is_new_session,
                )
            except sqlite3.Error:
                logger.exception("Database error while reading state")
                self._send_json(500, {"error": "Internal server error"})
            return

        # Serve static files safely
        self._serve_static(route, signed_session, is_new_session)

    def do_POST(self) -> None:
        client_ip = self.client_address[0] if self.client_address else "unknown"
        if not check_rate_limit(client_ip):
            self._send_json(429, {"error": "Too many requests. Please slow down."})
            return

        signed_session, csrf_token, is_new_session = self._get_or_create_session()
        if is_new_session or not self._validate_csrf(csrf_token):
            self._send_json(
                403,
                {"error": "Invalid or missing CSRF token. Please refresh the page."},
                signed_session=signed_session,
                is_new_session=is_new_session,
            )
            return

        content_length_str = self.headers.get("Content-Length", "0")
        if not content_length_str.isdigit():
            self._send_json(400, {"error": "Invalid Content-Length header"})
            return
        content_length = int(content_length_str)
        if content_length <= 0 or content_length > MAX_BODY_BYTES:
            self._send_json(400, {"error": "Request payload size out of bounds"})
            return

        try:
            raw_body = self.rfile.read(content_length)
            data = json.loads(raw_body.decode("utf-8"))
            if not isinstance(data, dict):
                self._send_json(400, {"error": "JSON object expected"})
                return
        except (ValueError, UnicodeDecodeError):
            self._send_json(400, {"error": "Malformed JSON payload"})
            return

        parsed = urlparse(self.path)
        route = parsed.path

        try:
            if route == "/api/toggle":
                self._handle_toggle(data)
            elif route == "/api/day-batch":
                self._handle_day_batch(data)
            elif route == "/api/note":
                self._handle_note(data)
            elif route == "/api/swap":
                self._handle_swap(data)
            elif route == "/api/sync":
                self._handle_sync(data)
            else:
                self._send_json(404, {"error": "Endpoint not found"})
        except sqlite3.Error:
            logger.exception("Database operation failed")
            self._send_json(500, {"error": "Internal storage error"})

    # Reject all other HTTP methods explicitly per mandatory security guidelines
    def do_PUT(self) -> None:
        self._send_json(405, {"error": "Method not allowed"})

    def do_DELETE(self) -> None:
        self._send_json(405, {"error": "Method not allowed"})

    def do_PATCH(self) -> None:
        self._send_json(405, {"error": "Method not allowed"})

    def do_HEAD(self) -> None:
        self._send_json(405, {"error": "Method not allowed"})

    def do_OPTIONS(self) -> None:
        self._send_json(405, {"error": "Method not allowed"})

    def _serve_static(
        self, route: str, signed_session: str, is_new_session: bool
    ) -> None:
        """Serve static files with strict path traversal protection."""
        if route in ("/", "/index.html"):
            rel_path = "index.html"
        elif route.startswith("/static/"):
            rel_path = route[len("/static/") :]
        else:
            rel_path = route.lstrip("/")

        # Sanitize filename and enforce directory boundary with trailing os.sep
        safe_parts = [
            p for p in rel_path.split("/") if p and p not in (".", "..")
        ]
        if not safe_parts:
            safe_parts = ["index.html"]
        candidate_path = os.path.realpath(os.path.join(STATIC_DIR, *safe_parts))
        if not candidate_path.startswith(STATIC_DIR + os.sep):
            self._send_json(403, {"error": "Access denied"})
            return

        if not os.path.isfile(candidate_path):
            self._send_json(404, {"error": "File not found"})
            return

        content_type, _ = mimetypes.guess_type(candidate_path)
        if not content_type:
            content_type = "application/octet-stream"
        if content_type.startswith("text/") or content_type in (
            "application/javascript",
            "application/json",
        ):
            content_type += "; charset=utf-8"

        try:
            with open(candidate_path, "rb") as f:
                content = f.read()
        except OSError:
            self._send_json(500, {"error": "Failed to read static asset"})
            return

        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self._send_security_headers(is_api=False)
        if is_new_session:
            self._set_session_cookie(signed_session)
        self.end_headers()
        self.wfile.write(content)

    def _fetch_db_state(self) -> dict:
        with _db_lock:
            conn = sqlite3.connect(DB_PATH)
            try:
                return _read_state_from_conn(conn)
            finally:
                conn.close()

    def _handle_toggle(self, data: dict) -> None:
        item_id = data.get("itemId")
        completed = data.get("completed")
        updated_at = data.get("updatedAt")

        if not isinstance(item_id, str) or not ITEM_ID_PATTERN.match(item_id):
            self._send_json(400, {"error": "Invalid itemId format"})
            return
        if not isinstance(completed, bool):
            self._send_json(400, {"error": "completed must be a boolean"})
            return
        if not isinstance(updated_at, int) or updated_at < 0:
            updated_at = int(time.time() * 1000)

        with _db_lock:
            conn = sqlite3.connect(DB_PATH)
            try:
                conn.execute(
                    """
                    INSERT INTO exercise_logs (item_id, completed, updated_at)
                    VALUES (?, ?, ?)
                    ON CONFLICT(item_id) DO UPDATE SET
                        completed = excluded.completed,
                        updated_at = excluded.updated_at
                    WHERE excluded.updated_at >= exercise_logs.updated_at
                    """,
                    (item_id, 1 if completed else 0, updated_at),
                )
                conn.commit()
                _save_snapshot(conn)
            finally:
                conn.close()

        self._send_json(
            200,
            {"ok": True, "itemId": item_id, "completed": completed, "updatedAt": updated_at},
        )

    def _handle_day_batch(self, data: dict) -> None:
        items = data.get("items")
        if not isinstance(items, list) or len(items) > 50:
            self._send_json(400, {"error": "Invalid items batch"})
            return

        validated_rows = []
        now_ms = int(time.time() * 1000)
        for entry in items:
            if not isinstance(entry, dict):
                self._send_json(400, {"error": "Each item must be an object"})
                return
            item_id = entry.get("itemId")
            completed = entry.get("completed")
            updated_at = entry.get("updatedAt", now_ms)
            if not isinstance(item_id, str) or not ITEM_ID_PATTERN.match(item_id):
                self._send_json(400, {"error": "Invalid itemId in batch"})
                return
            if not isinstance(completed, bool):
                self._send_json(400, {"error": "Invalid completed flag in batch"})
                return
            if not isinstance(updated_at, int) or updated_at < 0:
                updated_at = now_ms
            validated_rows.append((item_id, 1 if completed else 0, updated_at))

        with _db_lock:
            conn = sqlite3.connect(DB_PATH)
            try:
                conn.executemany(
                    """
                    INSERT INTO exercise_logs (item_id, completed, updated_at)
                    VALUES (?, ?, ?)
                    ON CONFLICT(item_id) DO UPDATE SET
                        completed = excluded.completed,
                        updated_at = excluded.updated_at
                    WHERE excluded.updated_at >= exercise_logs.updated_at
                    """,
                    validated_rows,
                )
                conn.commit()
                _save_snapshot(conn)
            finally:
                conn.close()

        self._send_json(200, {"ok": True, "count": len(validated_rows)})

    def _handle_note(self, data: dict) -> None:
        day_id = data.get("dayId")
        note = data.get("note")
        updated_at = data.get("updatedAt")

        if not isinstance(day_id, str) or not DAY_ID_PATTERN.match(day_id):
            self._send_json(400, {"error": "Invalid dayId format"})
            return
        if not isinstance(note, str) or len(note) > MAX_NOTE_LENGTH:
            self._send_json(400, {"error": "Note must be a string up to 500 chars"})
            return
        if not isinstance(updated_at, int) or updated_at < 0:
            updated_at = int(time.time() * 1000)

        clean_note = note.strip()
        with _db_lock:
            conn = sqlite3.connect(DB_PATH)
            try:
                conn.execute(
                    """
                    INSERT INTO day_notes (day_id, note, updated_at)
                    VALUES (?, ?, ?)
                    ON CONFLICT(day_id) DO UPDATE SET
                        note = excluded.note,
                        updated_at = excluded.updated_at
                    WHERE excluded.updated_at >= day_notes.updated_at
                    """,
                    (day_id, clean_note, updated_at),
                )
                conn.commit()
                _save_snapshot(conn)
            finally:
                conn.close()

        self._send_json(
            200,
            {"ok": True, "dayId": day_id, "note": clean_note, "updatedAt": updated_at},
        )

    def _handle_swap(self, data: dict) -> None:
        week_id = data.get("weekId")
        order = data.get("order")
        updated_at = data.get("updatedAt")

        if not isinstance(week_id, str) or not WEEK_ID_PATTERN.match(week_id):
            self._send_json(400, {"error": "Invalid weekId format"})
            return
        if not is_valid_day_order(order):
            self._send_json(
                400,
                {"error": "order must be a 7-day permutation within the same week"},
            )
            return
        if not isinstance(updated_at, int) or isinstance(updated_at, bool) or updated_at < 0:
            updated_at = int(time.time() * 1000)

        serialized_order = json.dumps(order)
        with _db_lock:
            conn = sqlite3.connect(DB_PATH)
            try:
                conn.execute(
                    """
                    INSERT INTO week_swaps (week_id, day_order, updated_at)
                    VALUES (?, ?, ?)
                    ON CONFLICT(week_id) DO UPDATE SET
                        day_order = excluded.day_order,
                        updated_at = excluded.updated_at
                    WHERE excluded.updated_at >= week_swaps.updated_at
                    """,
                    (week_id, serialized_order, updated_at),
                )
                conn.commit()
                _save_snapshot(conn)
            finally:
                conn.close()

        self._send_json(
            200,
            {"ok": True, "weekId": week_id, "order": order, "updatedAt": updated_at},
        )

    def _handle_sync(self, data: dict) -> None:
        """Synchronize client localStorage state with server SQLite database."""
        client_logs = data.get("logs", {})
        client_notes = data.get("notes", {})
        client_swaps = data.get("swaps", {})
        if (
            not isinstance(client_logs, dict)
            or not isinstance(client_notes, dict)
            or not isinstance(client_swaps, dict)
        ):
            self._send_json(400, {"error": "Invalid sync payload structure"})
            return

        log_rows = []
        for item_id, meta in list(client_logs.items())[:1000]:
            if not isinstance(item_id, str) or not ITEM_ID_PATTERN.match(item_id):
                continue
            if not isinstance(meta, dict):
                continue
            completed = meta.get("completed")
            updated_at = meta.get("updatedAt")
            if isinstance(completed, bool) and isinstance(updated_at, int) and updated_at >= 0:
                log_rows.append((item_id, 1 if completed else 0, updated_at))

        note_rows = []
        for day_id, meta in list(client_notes.items())[:100]:
            if not isinstance(day_id, str) or not DAY_ID_PATTERN.match(day_id):
                continue
            if not isinstance(meta, dict):
                continue
            note = meta.get("note")
            updated_at = meta.get("updatedAt")
            if (
                isinstance(note, str)
                and len(note) <= MAX_NOTE_LENGTH
                and isinstance(updated_at, int)
                and updated_at >= 0
            ):
                note_rows.append((day_id, note.strip(), updated_at))

        swap_rows = []
        for week_id, meta in list(client_swaps.items())[:20]:
            if not isinstance(week_id, str) or not WEEK_ID_PATTERN.match(week_id):
                continue
            if not isinstance(meta, dict):
                continue
            order = meta.get("order")
            updated_at = meta.get("updatedAt")
            if (
                is_valid_day_order(order)
                and isinstance(updated_at, int)
                and not isinstance(updated_at, bool)
                and updated_at >= 0
            ):
                swap_rows.append((week_id, json.dumps(order), updated_at))

        with _db_lock:
            conn = sqlite3.connect(DB_PATH)
            try:
                if log_rows:
                    conn.executemany(
                        """
                        INSERT INTO exercise_logs (item_id, completed, updated_at)
                        VALUES (?, ?, ?)
                        ON CONFLICT(item_id) DO UPDATE SET
                            completed = excluded.completed,
                            updated_at = excluded.updated_at
                        WHERE excluded.updated_at >= exercise_logs.updated_at
                        """,
                        log_rows,
                    )
                if note_rows:
                    conn.executemany(
                        """
                        INSERT INTO day_notes (day_id, note, updated_at)
                        VALUES (?, ?, ?)
                        ON CONFLICT(day_id) DO UPDATE SET
                            note = excluded.note,
                            updated_at = excluded.updated_at
                        WHERE excluded.updated_at >= day_notes.updated_at
                        """,
                        note_rows,
                    )
                if swap_rows:
                    conn.executemany(
                        """
                        INSERT INTO week_swaps (week_id, day_order, updated_at)
                        VALUES (?, ?, ?)
                        ON CONFLICT(week_id) DO UPDATE SET
                            day_order = excluded.day_order,
                            updated_at = excluded.updated_at
                        WHERE excluded.updated_at >= week_swaps.updated_at
                        """,
                        swap_rows,
                    )
                conn.commit()
                if log_rows or note_rows or swap_rows:
                    _save_snapshot(conn)
                merged_state = _read_state_from_conn(conn)
            finally:
                conn.close()

        self._send_json(200, merged_state)


def run_server() -> None:
    init_db()
    # Bind to 127.0.0.1 by default for local testing security; allow HOST env var for Cloud Run container
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8080"))
    server = ThreadingHTTPServer((host, port), TrackerRequestHandler)
    logger.info("SBI Green Marathon S7 Tracker listening on http://%s:%d", host, port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("Shutting down server...")
        server.server_close()


if __name__ == "__main__":
    run_server()
