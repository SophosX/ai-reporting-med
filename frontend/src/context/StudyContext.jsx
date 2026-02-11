/**
 * @fileoverview StudyContext - Globaler State für Studien-Sessions.
 *
 * Dieser Context verwaltet den gesamten State für die wissenschaftliche
 * Studie zum Vergleich zwischen KI-gestützter und manueller Befundung.
 *
 * Der Context trackt:
 * - Ob der Benutzer im Studienmodus ist
 * - Die aktuelle Session-ID
 * - Timer-Daten (Start, Pausen)
 * - Die Fall-ID für Paarung
 *
 * Lifecycle einer Studien-Session:
 * 1. checkStudyMode() beim App-Start
 * 2. startStudySession() beim Erstellen eines Berichts
 * 3. Timer-Updates über setStudyTimerData()
 * 4. completeStudySession() wird automatisch nach Berichtserstellung aufgerufen
 * 5. clearStudySession() räumt den State auf
 *
 * Session-Typen:
 * - "with_ai": KI-gestützter Bericht (NewReportPage)
 * - "without_ai": Manueller Bericht (ManualReportPage)
 *
 * @example
 * // In einer Komponente
 * const { isStudyMode, startStudySession, completeStudySession } = useStudy();
 *
 * if (isStudyMode) {
 *   const sessionId = await startStudySession(templateId, caseId, "with_ai");
 * }
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import { authenticatedFetch } from "../utils/auth";
import API_URL from "../utils/apiConfig";

/**
 * React Context für Studien-Session-State.
 * @type {React.Context}
 */
const StudyContext = createContext();

/**
 * Custom Hook für den Zugriff auf den Study-Context.
 *
 * @returns {Object} Der Study-Context mit allen State-Werten und Funktionen
 * @property {boolean} isStudyMode - True wenn Studienmodus aktiv
 * @property {number|null} studySessionId - ID der aktuellen Session
 * @property {Object|null} studyTimerData - Timer-Daten (startTime, pauseCount, etc.)
 * @property {string|null} caseId - Fall-ID für Paarung
 * @property {Function} checkStudyMode - Prüft Studienmodus beim Backend
 * @property {Function} startStudySession - Startet neue Session
 * @property {Function} completeStudySession - Schließt Session automatisch ab
 * @property {Function} clearStudySession - Leert alle Session-Daten
 */
export function useStudy() {
  return useContext(StudyContext);
}

/**
 * Provider-Komponente für den Study-Context.
 *
 * Lädt den Studienmodus-Status automatisch beim Mounten.
 * Alle Studien-relevanten Komponenten müssen innerhalb dieses
 * Providers liegen.
 *
 * @param {Object} props - Komponenten-Props
 * @param {React.ReactNode} props.children - Kind-Komponenten
 * @returns {JSX.Element} Der Context-Provider mit Kindern
 */
export function StudyProvider({ children }) {
  const [isStudyMode, setIsStudyMode] = useState(false);
  const [studySessionId, setStudySessionId] = useState(null);
  const [studyTimerData, setStudyTimerData] = useState(null);
  const [caseId, setCaseId] = useState(null);

  // Load study mode status on mount
  useEffect(() => {
    checkStudyMode();
  }, []);

  const checkStudyMode = async () => {
    try {
      const response = await authenticatedFetch(
        `${API_URL}/study/study-mode/status`
      );
      
      if (response.ok) {
        const data = await response.json();
        // Only set study mode active if user is a study participant AND has study mode active
        setIsStudyMode(data.study_participant && data.study_mode_active);
      }
    } catch (error) {
      console.error("Error checking study mode:", error);
    }
  };

  const startStudySession = async (templateId = null, caseIdParam = null, sessionType = "with_ai") => {
    try {
      const response = await authenticatedFetch(
        `${API_URL}/study/study-session/start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            template_id: templateId || null,
            case_id: caseIdParam || caseId,
            session_type: sessionType,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStudySessionId(data.session_id);
        if (caseIdParam) {
          setCaseId(caseIdParam);
        }
        return data.session_id;
      }
    } catch (error) {
      console.error("Error starting study session:", error);
      throw error;
    }
  };

  const clearStudySession = () => {
    setStudySessionId(null);
    setStudyTimerData(null);
    setCaseId(null);
  };

  /**
   * Schließt die aktuelle Studien-Session automatisch ab.
   * Wird nach erfolgreicher Berichtserstellung aufgerufen.
   *
   * @param {Object} params - Session-Abschluss-Daten
   * @param {number} params.reportId - ID des erstellten Berichts
   * @param {number} params.inputWords - Anzahl der Eingabe-Wörter
   * @param {number} params.generatedWords - Anzahl der generierten Wörter
   * @param {number} params.finalWords - Endgültige Wortzahl
   * @param {number|null} params.templateUsed - Verwendete Template-ID
   * @returns {Promise<boolean>} true bei Erfolg, false bei Fehler
   */
  const completeStudySession = async ({ reportId, inputWords, generatedWords, finalWords, templateUsed }) => {
    try {
      const endTime = new Date();
      const totalDuration = Math.floor(
        (endTime - new Date(studyTimerData.startTime)) / 1000
      );

      const response = await authenticatedFetch(
        `${API_URL}/study/study-session/${studySessionId}/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            report_id: reportId,
            case_id: caseId,
            total_duration: totalDuration,
            editing_duration: 0,
            pause_count: studyTimerData.pauseCount || 0,
            total_pause_seconds: studyTimerData.totalPauseTime || 0,
            edit_operations: 0,
            input_words: inputWords || 0,
            generated_words: generatedWords || 0,
            final_words: finalWords || 0,
            template_used: templateUsed || null,
          }),
        }
      );

      if (response.ok) {
        clearStudySession();
        return true;
      } else {
        throw new Error("Fehler beim Abschließen der Studiensitzung");
      }
    } catch (error) {
      console.error("Error completing study session:", error);
      clearStudySession();
      return false;
    }
  };

  const value = {
    isStudyMode,
    setIsStudyMode,
    studySessionId,
    setStudySessionId,
    studyTimerData,
    setStudyTimerData,
    caseId,
    setCaseId,
    checkStudyMode,
    startStudySession,
    completeStudySession,
    clearStudySession,
  };

  return (
    <StudyContext.Provider value={value}>
      {children}
    </StudyContext.Provider>
  );
}