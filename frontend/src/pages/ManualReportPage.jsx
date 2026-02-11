/**
 * @fileoverview ManualReportPage - Manuelle Berichterstellung ohne KI.
 *
 * Diese Seite ermöglicht die Erstellung von Befundberichten ohne KI-Unterstützung.
 * Sie dient primär für die wissenschaftliche Studie zum Vergleich zwischen
 * KI-gestützter und manueller Befundung.
 *
 * Workflow (Studienmodus):
 * 1. Seite öffnet automatisch StudyTimerModal
 * 2. Benutzer gibt Fall-ID ein (MUSS gleich sein wie bei KI-Bericht für Vergleich)
 * 3. Timer startet, StudyTimerBar erscheint
 * 4. Benutzer schreibt Befund manuell in großes Textfeld
 * 5. "Bericht speichern" erstellt manuellen Bericht und beendet Studiensitzung automatisch
 * 6. Weiterleitung zur ReportDetailPage
 *
 * Unterschiede zu NewReportPage:
 * - Kein KI-Aufruf (report_text = manualText)
 * - Keine Template-Auswahl
 * - Kein Custom Prompt
 * - session_type = "without_ai"
 * - is_manual = true im Bericht
 *
 * API-Endpunkt:
 * POST /reports/manual - Erstellt manuellen Bericht
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaSave,
  FaFlask,
  FaCheckCircle,
  FaCircleNotch,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { useStudy } from "../context/StudyContext";
import API_URL from "../utils/apiConfig";
import StudyTimerBar from "../components/StudyTimerBar";
import StudyTimerModal from "../components/StudyTimerModal";
import { authenticatedFetch } from "../utils/auth";

/**
 * Seite für manuelle (KI-freie) Berichterstellung im Studienmodus.
 *
 * Die Seite ist speziell für Studienteilnehmer konzipiert, um
 * einen Vergleich zwischen KI-gestützter und manueller Befundung
 * zu ermöglichen. Die gleiche Fall-ID muss für beide Methoden
 * verwendet werden, um einen direkten Vergleich zu ermöglichen.
 *
 * @returns {JSX.Element} Die gerenderte manuelle Berichterstellungs-Seite
 */
function ManualReportPage() {
  const navigate = useNavigate();
  const {
    isStudyMode,
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
  } = useStudy();

  const [manualText, setManualText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showStudyModal, setShowStudyModal] = useState(false);
  const [showStudyTimer, setShowStudyTimer] = useState(false);

  // Check study mode on mount
  useEffect(() => {
    checkStudyMode();
  }, [checkStudyMode]);

  // Show study modal automatically when page loads in study mode
  useEffect(() => {
    if (isStudyMode && !studySessionId && !showStudyTimer) {
      setShowStudyModal(true);
    }
  }, [isStudyMode, studySessionId, showStudyTimer]);

  const handleStudyTimerStart = async (timerData) => {
    try {
      const sessionId = await startStudySession(
        null, // No template for manual reports
        timerData.caseId,
        "without_ai"
      );
      setStudyTimerData(timerData);
      setCaseId(timerData.caseId);
      setShowStudyModal(false);
      setShowStudyTimer(true);
      toast.info("Studiensitzung gestartet. Timer läuft.");
    } catch (error) {
      console.error("Error starting study session:", error);
      toast.error("Fehler beim Starten der Studiensitzung");
    }
  };

  const handleStudyTimerCancel = () => {
    setShowStudyModal(false);
    navigate("/");
  };

  const handleStudySessionCancel = async () => {
    const confirmCancel = window.confirm(
      "Sind Sie sicher, dass Sie die Studiensitzung abbrechen möchten? Alle Timer-Daten gehen verloren."
    );

    if (confirmCancel) {
      setShowStudyTimer(false);
      // Clear study session from context
      clearStudySession();
      toast.info("Studiensitzung abgebrochen.");
      navigate("/");
    }
  };

  const handleSaveManualReport = async () => {
    if (!manualText.trim()) {
      toast.error("Bitte geben Sie einen Bericht ein");
      return;
    }

    if (isStudyMode && !studySessionId) {
      toast.error("Keine aktive Studiensitzung");
      return;
    }

    setIsSaving(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Bitte melden Sie sich an");
        setIsSaving(false);
        return;
      }

      // Create manual report
      const reportResponse = await fetch(`${API_URL}/reports/manual`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          report_text: manualText,
          template_id: null,
          case_id: caseId,
        }),
      });

      if (!reportResponse.ok) {
        const errorData = await reportResponse.json();
        throw new Error(
          errorData.detail || "Fehler beim Speichern des Berichts"
        );
      }

      const reportData = await reportResponse.json();

      // Auto-complete study session after successful save
      if (isStudyMode && studySessionId) {
        const finalWords = manualText.trim() ? manualText.trim().split(/\s+/).length : 0;
        const success = await completeStudySession({
          reportId: reportData.id,
          inputWords: 0,
          generatedWords: 0,
          finalWords: finalWords,
          templateUsed: null,
        });
        if (success) {
          toast.success("Bericht gespeichert und Studiensitzung abgeschlossen!");
        } else {
          toast.warning("Bericht gespeichert, aber Studiensitzung konnte nicht abgeschlossen werden.");
        }
        setShowStudyTimer(false);
      } else {
        toast.success("Bericht gespeichert");
      }

      // Navigate to report detail page
      setTimeout(() => {
        navigate(`/reports/${reportData.id}`);
      }, 1000);
    } catch (error) {
      console.error("Error saving manual report:", error);
      toast.error(error.message || "Fehler beim Speichern des Berichts");
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate word count
  const wordCount = manualText.trim() ? manualText.trim().split(/\s+/).length : 0;

  return (
    <>
      {/* Study Timer Modal */}
      {showStudyModal && (
        <StudyTimerModal
          isOpen={showStudyModal}
          onStart={handleStudyTimerStart}
          onCancel={handleStudyTimerCancel}
        />
      )}

      {/* Study Timer Bar */}
      {isStudyMode && showStudyTimer && (
        <StudyTimerBar
          onSessionStart={handleStudyTimerStart}
          studySessionId={studySessionId}
          onTimerData={setStudyTimerData}
          onCancel={handleStudySessionCancel}
          initialTimerData={studyTimerData}
        />
      )}

      <div
        className={`max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-white ${
          isStudyMode && showStudyTimer ? "pt-20" : ""
        }`}
      >
        <div className="glass-effect rounded-xl shadow-lg p-8 hover-lift">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-blue-400">
              Manuellen Bericht erstellen (ohne KI)
            </h1>
            {isStudyMode && showStudyTimer && caseId && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-purple-500/20 border border-purple-500/50 rounded-lg">
                <FaFlask className="text-purple-400" />
                <span className="text-sm text-purple-300">
                  Fall-ID: <span className="font-bold">{caseId}</span>
                </span>
              </div>
            )}
          </div>

          {/* Manual Text Input */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="manualText" className="text-sm text-gray-300">
                Ihr manueller Bericht:
              </label>
              <span className="text-sm text-gray-400">
                {wordCount} Wörter
              </span>
            </div>
            <textarea
              id="manualText"
              rows="20"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Schreiben Sie hier Ihren Befund ohne KI-Unterstützung..."
              className="w-full p-4 bg-gray-800/50 rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none font-mono text-sm"
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveManualReport}
              disabled={isSaving || !manualText.trim()}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 px-6 rounded-lg transition-colors duration-200 font-medium"
            >
              {isSaving ? (
                <>
                  <FaCircleNotch className="animate-spin" />
                  <span>Speichern...</span>
                </>
              ) : (
                <>
                  <FaSave />
                  <span>Bericht speichern</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ManualReportPage;
