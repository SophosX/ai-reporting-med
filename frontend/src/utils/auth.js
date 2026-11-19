/**
 * @fileoverview auth - Zentrale Authentifizierungs-Utilities.
 *
 * Dieses Modul stellt alle Funktionen für die Benutzer-Authentifizierung
 * bereit. Es verwaltet JWT-Tokens im localStorage und bietet einen
 * authentifizierten Fetch-Wrapper für API-Aufrufe.
 *
 * Token-Struktur (JWT):
 * - Header: Algorithmus (HS256)
 * - Payload: user_id, exp (Ablaufzeit), iat (Erstellzeit)
 * - Signature: Mit SECRET_KEY signiert
 *
 * localStorage-Keys:
 * - "token": JWT-Token für API-Authentifizierung
 * - "user_id": Benutzer-ID (redundant, auch im Token)
 * - "user": Vollständiges User-Objekt mit allen Details
 *
 * Sicherheitshinweise:
 * - Token wird Client-seitig nicht validiert (nur Ablauf geprüft)
 * - Bei 401-Antworten wird automatisch ausgeloggt und weitergeleitet
 * - isRedirecting-Flag verhindert mehrfache Weiterleitungen
 */

/**
 * Prüft ob ein gültiger (nicht abgelaufener) Token vorhanden ist.
 *
 * Dekodiert den JWT-Token und prüft das exp-Feld gegen die aktuelle Zeit.
 * Bei abgelaufenem Token wird automatisch logout() aufgerufen.
 *
 * @returns {boolean} True wenn authentifiziert und Token gültig
 *
 * @example
 * if (isAuthenticated()) {
 *   fetchUserData();
 * } else {
 *   redirectToLogin();
 * }
 */
export const isAuthenticated = () => {
  const token = localStorage.getItem("token");
  if (!token) {
    return false;
  }

  try {
    // Try to decode the token to check expiration
    // This is a simple check without validation
    const payload = JSON.parse(atob(token.split(".")[1]));

    // Check if token is expired
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      console.log("Token expired");
      logout();
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error validating token:", error);
    logout();
    return false;
  }
};

/**
 * Meldet den Benutzer ab und löscht alle Auth-Daten aus localStorage.
 *
 * Entfernt token, user_id und user-Objekt aus dem localStorage.
 * Führt keine Navigation durch - das muss der Aufrufer übernehmen.
 *
 * @example
 * // In einem Logout-Button-Handler
 * logout();
 * navigate("/login");
 */
export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user_id");
  localStorage.removeItem("user");
};

/**
 * Flag zur Vermeidung mehrfacher Weiterleitungen bei Session-Ablauf.
 * Wird auf true gesetzt wenn eine 401-Weiterleitung läuft.
 * @type {boolean}
 */
let isRedirecting = false;

/**
 * Führt einen authentifizierten API-Request durch.
 *
 * Fügt automatisch den Authorization-Header mit dem JWT-Token hinzu.
 * Bei 401-Antworten (Unauthorized) wird:
 * 1. logout() aufgerufen
 * 2. Einmalig zur Login-Seite weitergeleitet
 * 3. Ein Fehler geworfen
 *
 * @param {string} url - Vollständige API-URL
 * @param {Object} [options={}] - Fetch-Optionen (method, body, etc.)
 * @returns {Promise<Response>} Die Fetch-Response
 * @throws {Error} Bei fehlendem Token oder Authentifizierungsfehler
 *
 * @example
 * // GET Request
 * const response = await authenticatedFetch(`${API_URL}/reports/`);
 * const data = await response.json();
 *
 * @example
 * // POST Request
 * const response = await authenticatedFetch(`${API_URL}/reports/`, {
 *   method: "POST",
 *   body: JSON.stringify({ input_text: "..." })
 * });
 */
export const authenticatedFetch = async (url, options = {}) => {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Not authenticated");
  }

  // Set up timeout via AbortController (default: 120s)
  const timeoutMs = options.timeoutMs || 120000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Add authorization header
  const fetchOptions = {
    ...options,
    signal: controller.signal,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
  // Remove custom option so fetch doesn't complain
  delete fetchOptions.timeoutMs;

  try {
    const response = await fetch(url, fetchOptions);

    // If we get a 401 (Unauthorized), it means our token is invalid or expired
    if (response.status === 401) {
      logout();

      // Prevent multiple redirects and messages
      if (!isRedirecting) {
        isRedirecting = true;
        // Only redirect if we're not already on the login page
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
          throw new Error("Session expired. Please login again.");
        }
      }
      throw new Error("Authentication required");
    }

    return response;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Zeitüberschreitung: Der Server hat nicht rechtzeitig geantwortet. Bitte versuchen Sie es erneut.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Gibt die aktuellen Benutzerinformationen aus localStorage zurück.
 *
 * Prüft zusätzlich ob der Benutzer noch authentifiziert ist
 * (Token nicht abgelaufen) bevor Daten zurückgegeben werden.
 *
 * @returns {Object|null} Benutzerobjekt oder null wenn nicht authentifiziert
 * @property {string} id - Die Benutzer-ID
 * @property {string} token - Der JWT-Token
 *
 * @example
 * const user = getCurrentUser();
 * if (user) {
 *   console.log(`Benutzer-ID: ${user.id}`);
 * }
 */
/**
 * Parst eine Response sicher als JSON.
 * Gibt eine lesbare Fehlermeldung wenn die Antwort kein gültiges JSON ist
 * (z.B. bei Nginx-Fehlerseiten 502/504).
 */
export const safeJsonParse = async (response) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    // HTML error page from Nginx (502/504)
    if (text.trim().startsWith("<")) {
      throw new Error("Der Server ist vorübergehend nicht erreichbar. Bitte versuchen Sie es erneut.");
    }
    throw new Error("Ungültige Server-Antwort. Bitte versuchen Sie es erneut.");
  }
};

export const getCurrentUser = () => {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("user_id");
  
  if (!token || !isAuthenticated()) {
    return null;
  }
  
  return {
    id: userId,
    token: token
  };
};
