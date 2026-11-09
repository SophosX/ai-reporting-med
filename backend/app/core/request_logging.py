"""
Request Logging - Protokolliert jede API-Anfrage pro Benutzer.

Ziel: Fehleranalyse soll im Nachhinein einfach moeglich sein. Dafuer schreibt
die Anwendung drei Logdateien nach ``backend/logs/``:

- ``requests.log``: eine JSON-Zeile pro Anfrage (Zeit, Request-ID, Benutzer-ID,
  Methode, Pfad, Status, Dauer, Client-IP, User-Agent). Kein Request-Body und
  keine Befundtexte - nur Metadaten.
- ``errors.log``: alle Eintraege ab Level WARNING inkl. Traceback bei
  unbehandelten Exceptions (mit derselben Request-ID wie in requests.log).
- ``app.log``: alle Anwendungslogs (Level aus LOG_LEVEL in der .env), z. B. die
  Warnung bei einer globalen Vorlagenaenderung.

Jede Antwort traegt den Header ``X-Request-ID``. Bei einem 500er steht die ID
auch im JSON-Body (``request_id``), damit ein Nutzer sie melden kann und man
den passenden Traceback in errors.log findet.

Die Handler sind ``WatchedFileHandler``: Rotation uebernimmt logrotate
(``/etc/logrotate.d/ai-reporting``), die Handler oeffnen die Datei danach
automatisch neu. Das funktioniert auch mit mehreren Gunicorn-Workern.

Verwendung in main.py::

    from .core.request_logging import setup_logging, RequestLoggingMiddleware, register_exception_handlers
    setup_logging()
    app.add_middleware(RequestLoggingMiddleware)
    register_exception_handlers(app)
"""

import json
import logging
import logging.handlers
import os
import time
import traceback
import uuid
from datetime import datetime, timezone

import jwt
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from .config import settings

# Logverzeichnis: backend/logs (relativ zu diesem Modul: app/core -> app -> backend)
LOG_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "logs",
)

REQUEST_LOGGER_NAME = "app.requests"
request_logger = logging.getLogger(REQUEST_LOGGER_NAME)
error_logger = logging.getLogger("app.errors")

_configured = False


class JsonLineFormatter(logging.Formatter):
    """Gibt den Log-Record als eine JSON-Zeile aus (Felder aus record.__dict__['data'])."""

    def format(self, record: logging.LogRecord) -> str:
        data = getattr(record, "data", None)
        if data is None:
            data = {"message": record.getMessage()}
        payload = {
            "time": datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
            "level": record.levelname,
        }
        payload.update(data)
        return json.dumps(payload, ensure_ascii=False)


def setup_logging() -> None:
    """
    Richtet die Dateilogger ein. Mehrfachaufruf (z. B. pro Worker) ist unschaedlich.

    Faellt die Logdatei-Einrichtung fehl (z. B. keine Schreibrechte), laeuft die
    App weiter und loggt nur nach stdout.
    """
    global _configured
    if _configured:
        return
    _configured = True

    level_name = (getattr(settings, "LOG_LEVEL", "INFO") or "INFO").upper()
    app_level = getattr(logging, level_name, logging.INFO)

    root = logging.getLogger()
    root.setLevel(min(app_level, logging.INFO))

    text_fmt = logging.Formatter(
        "%(asctime)s %(levelname)s [%(process)d] %(name)s: %(message)s"
    )

    # stdout bleibt (Gunicorn-Konsole)
    if not any(isinstance(h, logging.StreamHandler) and not isinstance(h, logging.FileHandler)
               for h in root.handlers):
        stream = logging.StreamHandler()
        stream.setLevel(app_level)
        stream.setFormatter(text_fmt)
        root.addHandler(stream)

    try:
        os.makedirs(LOG_DIR, exist_ok=True)

        # app.log: alle Anwendungslogs ab LOG_LEVEL
        app_handler = logging.handlers.WatchedFileHandler(
            os.path.join(LOG_DIR, "app.log"), encoding="utf-8"
        )
        app_handler.setLevel(app_level)
        app_handler.setFormatter(text_fmt)
        root.addHandler(app_handler)

        # errors.log: alles ab WARNING, mit Traceback
        err_handler = logging.handlers.WatchedFileHandler(
            os.path.join(LOG_DIR, "errors.log"), encoding="utf-8"
        )
        err_handler.setLevel(logging.WARNING)
        err_handler.setFormatter(text_fmt)
        root.addHandler(err_handler)

        # requests.log: eine JSON-Zeile pro Anfrage, unabhaengig von LOG_LEVEL
        req_handler = logging.handlers.WatchedFileHandler(
            os.path.join(LOG_DIR, "requests.log"), encoding="utf-8"
        )
        req_handler.setLevel(logging.INFO)
        req_handler.setFormatter(JsonLineFormatter())
        request_logger.setLevel(logging.INFO)
        request_logger.addHandler(req_handler)
        request_logger.propagate = False  # nicht zusaetzlich in app.log/stdout
    except Exception as e:  # pragma: no cover - nur bei Rechteproblemen
        logging.getLogger(__name__).error(
            "Dateilogging konnte nicht eingerichtet werden (%s): %s", LOG_DIR, e
        )


def _user_id_from_request(request: Request):
    """Liest die Benutzer-ID aus dem Bearer-Token, ohne bei Fehlern eine Exception auszuloesen."""
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        return None
    token = auth[7:].strip()
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        sub = payload.get("sub")
        return int(sub) if sub is not None else None
    except Exception:
        return "invalid-token"


def _client_ip(request: Request) -> str:
    """Echte Client-IP hinter nginx (X-Real-IP / X-Forwarded-For), sonst Socket-Adresse."""
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "-"


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Schreibt pro Anfrage eine JSON-Zeile nach requests.log und setzt X-Request-ID."""

    async def dispatch(self, request: Request, call_next):
        request_id = uuid.uuid4().hex[:12]
        request.state.request_id = request_id
        start = time.perf_counter()
        user_id = _user_id_from_request(request)
        status_code = 500
        error_type = None

        try:
            response = await call_next(request)
            status_code = response.status_code
            response.headers["X-Request-ID"] = request_id
            return response
        except Exception as exc:
            error_type = type(exc).__name__
            raise
        finally:
            duration_ms = round((time.perf_counter() - start) * 1000, 1)
            data = {
                "request_id": request_id,
                "user_id": user_id,
                "method": request.method,
                "path": request.url.path,
                "query": str(request.url.query) if request.url.query else None,
                "status": status_code,
                "duration_ms": duration_ms,
                "ip": _client_ip(request),
                "user_agent": (request.headers.get("user-agent") or "")[:200],
            }
            if error_type:
                data["error"] = error_type
            level = logging.INFO
            if status_code >= 500:
                level = logging.ERROR
            elif status_code >= 400:
                level = logging.WARNING
            request_logger.log(level, "", extra={"data": data})


def register_exception_handlers(app) -> None:
    """Unbehandelte Exceptions: Traceback nach errors.log, JSON-Antwort mit request_id."""

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        request_id = getattr(request.state, "request_id", "-")
        error_logger.error(
            "Unbehandelte Exception request_id=%s user_id=%s %s %s: %s\n%s",
            request_id,
            _user_id_from_request(request),
            request.method,
            request.url.path,
            repr(exc),
            traceback.format_exc(),
        )
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Interner Serverfehler. Bitte mit dieser Kennung melden.",
                "request_id": request_id,
            },
            headers={"X-Request-ID": request_id},
        )
