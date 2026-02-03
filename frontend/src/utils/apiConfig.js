/**
 * @fileoverview apiConfig - Zentrale API-URL-Konfiguration.
 *
 * Dieses Modul verwaltet die Basis-URL für alle API-Aufrufe.
 * Die URL wird aus Umgebungsvariablen gelesen oder verwendet einen Fallback.
 *
 * Konfigurationsmöglichkeiten:
 * 1. Umgebungsvariable VITE_API_URL in .env setzen
 * 2. Fallback auf localhost:8000 für Entwicklung
 *
 * Produktions-Setup:
 * - Frontend wird von nginx ausgeliefert
 * - API-Aufrufe an /api werden zu uvicorn proxied
 * - VITE_API_URL sollte auf die Produktions-Domain zeigen
 *
 * Entwicklungs-Setup:
 * - Frontend läuft auf localhost:5173 (Vite)
 * - Backend läuft auf localhost:8000 (uvicorn)
 * - CORS ist im Backend für beide Ports konfiguriert
 *
 * @example
 * // In einer Komponente
 * import API_URL from "../utils/apiConfig";
 * const response = await fetch(`${API_URL}/reports/`);
 */

/**
 * Die Basis-URL für alle API-Aufrufe.
 *
 * Wird aus der Umgebungsvariable VITE_API_URL gelesen.
 * Fallback: "http://localhost:8000" für lokale Entwicklung.
 *
 * @type {string}
 */
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default API_URL;
