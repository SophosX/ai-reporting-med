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
 * - Den generierten Bericht
 * - Bearbeitungs-Operationen
 * - Die Fall-ID für Paarung
 *
 * Lifecycle einer Studien-Session:
 * 1. checkStudyMode() beim App-Start
 * 2. startStudySession() beim Erstellen eines Berichts
 * 3. Timer-Updates über setStudyTimerData()
 * 4. Bericht-Generierung tracken (setGeneratedReportId, setFirstGenerationTime)
 * 5. clearStudySession() nach Abschluss
 *
 * Session-Typen:
 * - "with_ai": KI-gestützter Bericht (NewReportPage)
 * - "without_ai": Manueller Bericht (ManualReportPage)
 *
 * @example
 * // In einer Komponente
 * const { isStudyMode, startStudySession, clearStudySession } = useStudy();
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
 * @property {number|null} generatedReportId - ID des generierten Berichts
 * @property {number} editOperations - Anzahl der Bearbeitungen
 * @property {string} originalGeneratedText - Ursprünglicher KI-Text
 * @property {Date|null} firstGenerationTime - Zeitpunkt der ersten Generierung
 * @property {string|null} caseId - Fall-ID für Paarung
 * @property {Function} checkStudyMode - Prüft Studienmodus beim Backend
 * @property {Function} startStudySession - Startet neue Session
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
  const [generatedReportId, setGeneratedReportId] = useState(null);
  const [editOperations, setEditOperations] = useState(0);
  const [originalGeneratedText, setOriginalGeneratedText] = useState("");
  const [firstGenerationTime, setFirstGenerationTime] = useState(null);
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
    setGeneratedReportId(null);
    setEditOperations(0);
    setOriginalGeneratedText("");
    setFirstGenerationTime(null);
    setCaseId(null);
  };

  const value = {
    isStudyMode,
    setIsStudyMode,
    studySessionId,
    setStudySessionId,
    studyTimerData,
    setStudyTimerData,
    generatedReportId,
    setGeneratedReportId,
    editOperations,
    setEditOperations,
    originalGeneratedText,
    setOriginalGeneratedText,
    firstGenerationTime,
    setFirstGenerationTime,
    caseId,
    setCaseId,
    checkStudyMode,
    startStudySession,
    clearStudySession,
  };

  return (
    <StudyContext.Provider value={value}>
      {children}
    </StudyContext.Provider>
  );
}