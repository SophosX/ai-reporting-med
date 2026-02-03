/**
 * @fileoverview studyAuth - Hilfsfunktionen für Studien-Authentifizierung.
 *
 * Dieses Modul stellt Funktionen bereit, um den Studienteilnehmer-Status
 * eines Benutzers aus dem localStorage zu prüfen. Es dient als schnelle
 * Client-seitige Prüfung ohne API-Aufruf.
 *
 * HINWEIS: Diese Funktionen sind ein Fallback. Die bevorzugte Methode ist
 * die Abfrage des Study-Status über StudyContext.checkStudyMode(), da
 * diese den aktuellen Backend-Status abruft.
 *
 * Verwendung:
 * - Navbar: Entscheidung ob Studien-Links angezeigt werden
 * - Schnelle UI-Entscheidungen ohne API-Wartezeit
 *
 * localStorage-Struktur:
 * {
 *   "user": {
 *     "study_participant": true/false,
 *     "experience_level": "assistenzarzt"|"facharzt"|"oberarzt",
 *     "full_name": "Dr. Max Mustermann"
 *   }
 * }
 */

/**
 * Prüft ob der aktuelle Benutzer ein Studienteilnehmer ist.
 *
 * Liest den study_participant-Status aus dem localStorage.
 * Gibt false zurück bei fehlenden Daten oder Parse-Fehlern.
 *
 * @returns {boolean} True wenn Benutzer Studienteilnehmer ist
 *
 * @example
 * if (isStudyParticipant()) {
 *   showStudyFeatures();
 * }
 */
export const isStudyParticipant = () => {
  const userStr = localStorage.getItem("user");
  if (!userStr) return false;
  
  try {
    const user = JSON.parse(userStr);
    return user.study_participant === true;
  } catch (error) {
    console.error("Error parsing user data:", error);
    return false;
  }
};

/**
 * Gibt detaillierte Studien-Informationen des Benutzers zurück.
 *
 * Extrahiert alle studienrelevanten Felder aus dem localStorage.
 * Nützlich für die Anzeige von Benutzerinformationen in der UI.
 *
 * @returns {Object|null} Studien-Info-Objekt oder null wenn nicht verfügbar
 * @property {boolean} isStudyParticipant - Ob Studienteilnehmer
 * @property {string|null} experienceLevel - Erfahrungslevel (assistenzarzt/facharzt/oberarzt)
 * @property {string|null} fullName - Vollständiger Name des Arztes
 *
 * @example
 * const info = getStudyUserInfo();
 * if (info?.isStudyParticipant) {
 *   console.log(`Willkommen, ${info.fullName}`);
 *   console.log(`Erfahrung: ${info.experienceLevel}`);
 * }
 */
export const getStudyUserInfo = () => {
  const userStr = localStorage.getItem("user");
  if (!userStr) return null;
  
  try {
    const user = JSON.parse(userStr);
    return {
      isStudyParticipant: user.study_participant || false,
      experienceLevel: user.experience_level || null,
      fullName: user.full_name || null
    };
  } catch (error) {
    console.error("Error parsing user data:", error);
    return null;
  }
};