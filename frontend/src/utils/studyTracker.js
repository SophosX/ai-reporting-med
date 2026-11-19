/**
 * @fileoverview studyTracker - Passive Erfassung von Prozessdaten im Studienmodus.
 *
 * Läuft unsichtbar im Hintergrund und verändert den Ablauf nicht.
 * Erfasst werden ausschließlich Zeitpunkte und Zählwerte, niemals Textinhalte:
 * - Tippen/Löschen (Anzahl Eingaben, eingefügte/entfernte Zeichen)
 * - Einfügen aus der Zwischenablage (Anzahl, Zeichenzahl)
 * - Tab verlassen/zurück (Dauer, Anzahl), Fensterfokus
 * - Leerlauf (Lücken > 30 s ohne Maus/Tastatur bei sichtbarer Seite)
 * - Pausen, Generieren, Kopieren, Bearbeiten auf der Detailseite
 *
 * Ereignisse werden gesammelt und gebündelt an POST /study/events geschickt.
 * Die Sitzungs-Zählwerte gehen zusätzlich mit dem Abschluss/Abbruch der Session
 * als client_metrics an den Server.
 *
 * Hinzugefügt 2026-11-19.
 */

import API_URL from "./apiConfig";

const IDLE_THRESHOLD_MS = 30000;
const FLUSH_DELAY_MS = 3000;
const MAX_QUEUE = 50;

let enabled = false;
let queue = [];
let flushTimer = null;

// Aktive Studien-Session
let session = null;
// Eingaben auf der Seite, bevor die Session gestartet wurde (z.B. Diktat vor Vorlagenwahl)
let preSession = null;
// Laufende Bearbeitung auf der Detailseite
let edit = null;

let listenersAttached = false;
let lastActivity = Date.now();
let hiddenSince = null;
let pendingPaste = 0;

const nowIso = () => new Date().toISOString();

function emptyCounters() {
  return {
    keystrokes: 0,
    chars_typed: 0,
    chars_removed: 0,
    paste_count: 0,
    pasted_chars: 0,
    first_input_at: null,
    last_input_at: null,
  };
}

/** Eingefügte und entfernte Zeichen zwischen zwei Textständen (gemeinsamer Anfang/Ende). */
function diffLengths(oldValue, newValue) {
  const a = oldValue || "";
  const b = newValue || "";
  let start = 0;
  const minLen = Math.min(a.length, b.length);
  while (start < minLen && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  return { inserted: endB - start, removed: endA - start };
}

function applyChange(counters, oldValue, newValue) {
  const { inserted, removed } = diffLengths(oldValue, newValue);
  if (inserted === 0 && removed === 0) return;
  const now = Date.now();
  // Zeichen aus einem unmittelbar vorangegangenen Einfügen nicht als getippt zählen
  const fromPaste = Math.min(pendingPaste, inserted);
  pendingPaste = 0;
  counters.keystrokes += 1;
  counters.chars_typed += inserted - fromPaste;
  counters.chars_removed += removed;
  if (!counters.first_input_at) counters.first_input_at = now;
  counters.last_input_at = now;
}

function applyPaste(counters, length) {
  counters.paste_count += 1;
  counters.pasted_chars += length;
  pendingPaste = length;
}

// ---------------------------------------------------------------------------
// Senden
// ---------------------------------------------------------------------------

function scheduleFlush() {
  if (queue.length >= MAX_QUEUE) {
    flush();
    return;
  }
  if (!flushTimer) {
    flushTimer = setTimeout(() => flush(), FLUSH_DELAY_MS);
  }
}

/**
 * Schickt gesammelte Ereignisse an den Server.
 * @param {boolean} keepalive - true beim Verlassen der Seite (Anfrage überlebt das Schließen)
 */
export function flush(keepalive = false) {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (!queue.length) return Promise.resolve();
  const token = localStorage.getItem("token");
  const events = queue.splice(0, 200);
  if (!token) return Promise.resolve();
  return fetch(`${API_URL}/study/events`, {
    method: "POST",
    keepalive,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ events }),
  }).catch(() => {
    // Erfassung darf die Bedienung nie stören - bei Netzfehler einmal zurücklegen
    if (!keepalive) queue.unshift(...events.slice(0, MAX_QUEUE));
  });
}

/**
 * Protokolliert ein Ereignis (nur Zählwerte/IDs im payload).
 * @param {string} type - Ereignistyp, z.B. "generate_clicked"
 * @param {Object} [payload] - Zählwerte
 * @param {Object} [opts] - { reportId }
 */
export function track(type, payload = null, opts = {}) {
  if (!enabled) return;
  if (!session && !opts.reportId) return;
  queue.push({
    type,
    ts: nowIso(),
    session_id: session ? session.id : null,
    report_id: opts.reportId || null,
    payload,
  });
  scheduleFlush();
}

// ---------------------------------------------------------------------------
// Sichtbarkeit, Fokus, Leerlauf
// ---------------------------------------------------------------------------

function onActivity() {
  const now = Date.now();
  const gap = now - lastActivity;
  if (session && hiddenSince === null && gap > IDLE_THRESHOLD_MS) {
    session.idle_ms += gap;
    session.idle_count += 1;
  }
  lastActivity = now;
}

function onVisibilityChange() {
  if (document.visibilityState === "hidden") {
    hiddenSince = Date.now();
    if (session) {
      session.hidden_count += 1;
      track("tab_hidden");
    }
    flush(true);
  } else if (hiddenSince !== null) {
    const hiddenMs = Date.now() - hiddenSince;
    hiddenSince = null;
    lastActivity = Date.now();
    if (session) {
      session.hidden_ms += hiddenMs;
      track("tab_visible", { hidden_ms: hiddenMs });
    }
  }
}

function onBlur() {
  if (session) session.blur_count += 1;
}

function onPageHide() {
  if (session) track("page_left", { elapsed_ms: Date.now() - session.started_at });
  flush(true);
}

function attachListeners() {
  if (listenersAttached || typeof window === "undefined") return;
  listenersAttached = true;
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("blur", onBlur);
  ["keydown", "mousedown", "wheel", "touchstart"].forEach((evt) =>
    window.addEventListener(evt, onActivity, { passive: true, capture: true })
  );
  let lastMove = 0;
  window.addEventListener(
    "mousemove",
    () => {
      const now = Date.now();
      if (now - lastMove > 1000) {
        lastMove = now;
        onActivity();
      }
    },
    { passive: true, capture: true }
  );
}

// ---------------------------------------------------------------------------
// Öffentliche API
// ---------------------------------------------------------------------------

/** Aktiviert die Erfassung (nur für Studienteilnehmer). */
export function setEnabled(value) {
  enabled = !!value;
  if (enabled) attachListeners();
}

/** Startet die Erfassung einer Studien-Session. */
export function beginSession(sessionId, sessionType, context = {}) {
  if (!enabled || !sessionId) return;
  const now = Date.now();
  lastActivity = now;
  session = {
    id: sessionId,
    type: sessionType,
    started_at: now,
    ...emptyCounters(),
    hidden_ms: 0,
    hidden_count: 0,
    blur_count: 0,
    idle_ms: 0,
    idle_count: 0,
    generate_clicked_at: null,
    generation_received_at: null,
    copy_count: 0,
  };
  const pre = preSession;
  preSession = null;
  track("session_started", {
    session_type: sessionType,
    input_chars_at_start: context.inputCharsAtStart ?? null,
    pre_session_chars_typed: pre ? pre.chars_typed : 0,
    pre_session_pasted_chars: pre ? pre.pasted_chars : 0,
    pre_session_first_input_before_start_ms:
      pre && pre.first_input_at ? now - pre.first_input_at : null,
  });
  session.pre_session = pre
    ? {
        chars_typed: pre.chars_typed,
        chars_removed: pre.chars_removed,
        pasted_chars: pre.pasted_chars,
        paste_count: pre.paste_count,
        first_input_before_start_ms: pre.first_input_at ? now - pre.first_input_at : null,
      }
    : null;
  session.input_chars_at_start = context.inputCharsAtStart ?? null;
}

/** Verwirft Eingabe-Zählwerte von vor der Session (beim Öffnen einer Befundseite). */
export function resetPreSession() {
  preSession = null;
}

/** Textänderung in einem Eingabefeld der Session-Seite (Diktat oder manueller Befund). */
export function trackTextChange(oldValue, newValue) {
  if (!enabled) return;
  if (session) {
    applyChange(session, oldValue, newValue);
  } else {
    if (!preSession) preSession = emptyCounters();
    applyChange(preSession, oldValue, newValue);
  }
}

/** Einfügen aus der Zwischenablage (nur Länge). */
export function trackPaste(length) {
  if (!enabled || !length) return;
  if (session) {
    applyPaste(session, length);
    track("paste", { chars: length });
  } else {
    if (!preSession) preSession = emptyCounters();
    applyPaste(preSession, length);
  }
}

/** "Generiere Bericht" wurde geklickt. */
export function markGenerateClicked(payload = {}) {
  if (!session) return;
  session.generate_clicked_at = Date.now();
  track("generate_clicked", payload);
}

/** KI-Antwort ist im Browser angekommen. */
export function markGenerationReceived(reportId, clientMs) {
  if (!session) return;
  session.generation_received_at = Date.now();
  track("generation_received", { client_ms: clientMs }, { reportId });
}

/** Momentaufnahme der Sitzungs-Zählwerte für den Abschluss (client_metrics). */
export function snapshot() {
  if (!session) return null;
  const now = Date.now();
  const rel = (t) => (t ? t - session.started_at : null);
  const hiddenNow = hiddenSince !== null ? now - hiddenSince : 0;
  return {
    elapsed_ms: now - session.started_at,
    keystrokes: session.keystrokes,
    chars_typed: session.chars_typed,
    chars_removed: session.chars_removed,
    paste_count: session.paste_count,
    pasted_chars: session.pasted_chars,
    first_input_after_ms: rel(session.first_input_at),
    last_input_after_ms: rel(session.last_input_at),
    hidden_ms: session.hidden_ms + hiddenNow,
    hidden_count: session.hidden_count,
    blur_count: session.blur_count,
    idle_ms: session.idle_ms,
    idle_count: session.idle_count,
    generate_clicked_after_ms: rel(session.generate_clicked_at),
    generation_received_after_ms: rel(session.generation_received_at),
    copy_count: session.copy_count,
    input_chars_at_start: session.input_chars_at_start,
    pre_session: session.pre_session,
    viewport_w: typeof window !== "undefined" ? window.innerWidth : null,
    viewport_h: typeof window !== "undefined" ? window.innerHeight : null,
  };
}

/** Beendet die Erfassung der Session (completed / cancelled). */
export function endSession(status) {
  if (!session) return;
  track(`session_${status}`, { elapsed_ms: Date.now() - session.started_at });
  flush();
  session = null;
}

/** Kopieren eines Befunds in die Zwischenablage (z.B. Übernahme ins RIS). */
export function trackCopy(reportId, what = "report") {
  if (!enabled) return;
  if (session) session.copy_count += 1;
  track("report_copied", { what }, { reportId });
}

// --- Bearbeitung auf der Detailseite (nach Abschluss der Session) ---

export function beginEdit(reportId) {
  if (!enabled || !reportId) return;
  edit = { reportId, started_at: Date.now(), ...emptyCounters() };
  track("edit_started", null, { reportId });
}

export function trackEditChange(oldValue, newValue) {
  if (edit) applyChange(edit, oldValue, newValue);
}

export function trackEditPaste(length) {
  if (edit && length) applyPaste(edit, length);
}

/**
 * Beendet die Bearbeitung.
 * @param {boolean} saved - true = gespeichert, false = abgebrochen
 * @returns {{edit_client_ms:number, edit_client_meta:Object}|null} Felder für PUT /reports/{id}
 */
export function endEdit(saved) {
  if (!edit) return null;
  const result = {
    edit_client_ms: Date.now() - edit.started_at,
    edit_client_meta: {
      keystrokes: edit.keystrokes,
      chars_typed: edit.chars_typed,
      chars_removed: edit.chars_removed,
      paste_count: edit.paste_count,
      pasted_chars: edit.pasted_chars,
    },
  };
  if (!saved) {
    track("edit_cancelled", { edit_ms: result.edit_client_ms, ...result.edit_client_meta }, { reportId: edit.reportId });
  }
  edit = null;
  return result;
}

const studyTracker = {
  setEnabled,
  beginSession,
  resetPreSession,
  trackTextChange,
  trackPaste,
  markGenerateClicked,
  markGenerationReceived,
  snapshot,
  endSession,
  trackCopy,
  beginEdit,
  trackEditChange,
  trackEditPaste,
  endEdit,
  track,
  flush,
};

export default studyTracker;
