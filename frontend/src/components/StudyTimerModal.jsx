/**
 * @fileoverview StudyTimerModal-Komponente - Vollbild-Modal für Studien-Session-Start.
 *
 * Diese Komponente zeigt ein Modal-Fenster zum Starten einer neuen Studien-Session.
 * Sie führt den Benutzer durch den Session-Start und erfasst wichtige Metadaten.
 *
 * Zwei Ansichten:
 * 1. Info-Screen: Erklärt was gemessen wird, erfordert Fall-ID-Eingabe
 * 2. Timer-Screen: Zeigt laufenden Timer mit Pause-Funktionalität
 *
 * Erfasste Daten:
 * - startTime: Zeitpunkt des Timer-Starts
 * - pauseCount: Anzahl der Unterbrechungen
 * - totalPauseTime: Kumulative Pausenzeit in Sekunden
 * - caseId: Eindeutige Fall-Identifikation für Vergleiche
 *
 * Die Fall-ID ist wichtig für das spätere Pairing von KI-gestützten
 * und manuellen Berichten desselben Falles in der Studien-Auswertung.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  FaPlay,
  FaPause,
  FaStop,
  FaClock,
  FaFlask,
  FaInfoCircle,
  FaExclamationTriangle,
} from "react-icons/fa";

/**
 * Modal-Komponente für den Start einer Studien-Session.
 *
 * Zeigt zunächst Informationen über die Studien-Messung und
 * erfordert eine Fall-ID-Eingabe. Nach dem Start wird der
 * laufende Timer mit Pause-Option angezeigt.
 *
 * Der Timer läuft im Modal weiter, auch wenn das Modal geschlossen
 * wird (z.B. durch Einblenden der StudyTimerBar in der Hauptansicht).
 *
 * @param {Object} props - Komponenten-Props
 * @param {boolean} props.isOpen - Steuert Sichtbarkeit des Modals
 * @param {Function} props.onStart - Callback bei Timer-Start mit Timer-Daten
 * @param {Object} props.onStart.timerData - Übergebene Timer-Daten
 * @param {Date} props.onStart.timerData.startTime - Startzeit
 * @param {number} props.onStart.timerData.pauseCount - Aktuelle Pausenanzahl
 * @param {number} props.onStart.timerData.totalPauseTime - Pausenzeit in Sekunden
 * @param {string} props.onStart.timerData.caseId - Eingegebene Fall-ID
 * @param {Function} props.onCancel - Callback zum Abbrechen/Schließen
 * @returns {JSX.Element|null} Das Modal oder null wenn nicht offen
 *
 * @example
 * <StudyTimerModal
 *   isOpen={showTimerModal}
 *   onStart={(timerData) => handleStudyStart(timerData)}
 *   onCancel={() => setShowTimerModal(false)}
 * />
 */
function StudyTimerModal({ isOpen, onStart, onCancel }) {
  const [showInfo, setShowInfo] = useState(true);
  const [timerStarted, setTimerStarted] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [pauseCount, setPauseCount] = useState(0);
  const [totalPauseTime, setTotalPauseTime] = useState(0);
  const [pauseStartTime, setPauseStartTime] = useState(null);
  const [caseId, setCaseId] = useState("");

  // Timer effect
  useEffect(() => {
    let interval;
    if (timerStarted && !timerPaused) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerStarted, timerPaused]);

  // Format time display
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStart = () => {
    if (!caseId.trim()) {
      alert("Bitte geben Sie eine Fall-ID ein!");
      return;
    }
    setShowInfo(false);
    setTimerStarted(true);
    onStart({
      startTime: new Date(),
      pauseCount: 0,
      totalPauseTime: 0,
      caseId: caseId.trim(),
    });
  };

  const handlePause = () => {
    if (!timerPaused) {
      setTimerPaused(true);
      setPauseStartTime(Date.now());
      setPauseCount((prev) => prev + 1);
    } else {
      const pauseDuration = Math.floor((Date.now() - pauseStartTime) / 1000);
      setTotalPauseTime((prev) => prev + pauseDuration);
      setTimerPaused(false);
      setPauseStartTime(null);
    }
  };

  const handleCancel = () => {
    if (timerStarted) {
      const confirmCancel = window.confirm(
        "Sind Sie sicher, dass Sie abbrechen möchten? Die Timer-Daten gehen verloren."
      );
      if (!confirmCancel) return;
    }
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <FaFlask className="text-purple-400 text-2xl" />
            <h2 className="text-xl font-bold text-white">Studienmodus</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {showInfo ? (
            // Information Screen
            <div className="space-y-4">
              <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FaInfoCircle className="text-blue-400 text-xl mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-blue-200 mb-2">
                      Informationen zur Studiensitzung
                    </h3>
                    <p className="text-sm text-blue-100">
                      Diese Sitzung erfasst die Zeit, die Sie für die Erstellung Ihres Berichts benötigen.
                      Der Timer hilft uns, die Effizienz der KI-gestützten
                      Berichterstellung zu verstehen.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-white">Was gemessen wird:</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-1">•</span>
                    <span>Gesamtzeit von Beginn bis Fertigstellung</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-1">•</span>
                    <span>Zeit für Eingabe und Bearbeitung</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-1">•</span>
                    <span>Anzahl und Dauer der Pausen</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-1">•</span>
                    <span>Wortzahl-Metriken und Effizienz</span>
                  </li>
                </ul>
              </div>

              <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <FaExclamationTriangle className="text-yellow-400 text-sm mt-1 flex-shrink-0" />
                  <p className="text-xs text-yellow-200">
                    Bitte arbeiten Sie wie gewohnt. Sie können den Timer pausieren, wenn
                    Sie unterbrochen werden. Klicken Sie auf "Timer starten", wenn Sie bereit sind.
                  </p>
                </div>
              </div>

              {/* Case ID Input */}
              <div className="space-y-2">
                <label htmlFor="caseId" className="block text-sm font-medium text-blue-200">
                  Fall-ID (Pflichtfeld)
                </label>
                <input
                  type="text"
                  id="caseId"
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  placeholder="z.B. Fall-123 oder Patient-XYZ"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
                <p className="text-xs text-gray-400">
                  Verwenden Sie die gleiche ID für KI- und manuelle Berichte desselben Falls
                </p>
              </div>
            </div>
          ) : (
            // Timer Screen
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-5xl font-mono text-white mb-2">
                  {formatTime(elapsedTime)}
                </div>
                <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <FaClock className="text-gray-500" />
                    Elapsed Time
                  </span>
                  {pauseCount > 0 && (
                    <span className="flex items-center gap-1">
                      <FaPause className="text-gray-500" />
                      {pauseCount} pause{pauseCount !== 1 && "s"}
                    </span>
                  )}
                </div>
              </div>

              {timerPaused && (
                <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
                  <p className="text-sm text-yellow-200 text-center">
                    Timer paused. Click resume when ready to continue.
                  </p>
                </div>
              )}

              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">
                  Session Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className={timerPaused ? "text-yellow-400" : "text-green-400"}>
                      {timerPaused ? "Paused" : "Recording"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pauses:</span>
                    <span className="text-white">{pauseCount}</span>
                  </div>
                  {totalPauseTime > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Pause Time:</span>
                      <span className="text-white">{formatTime(totalPauseTime)}</span>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-400 text-center">
                The timer will continue running while you create your report.
                You'll mark completion when finished.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700">
          {showInfo ? (
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleStart}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <FaPlay className="text-sm" />
                Timer starten
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Sitzung abbrechen
              </button>
              <button
                onClick={handlePause}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  timerPaused
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-yellow-600 hover:bg-yellow-700 text-white"
                }`}
              >
                {timerPaused ? (
                  <>
                    <FaPlay className="text-sm" />
                    Resume
                  </>
                ) : (
                  <>
                    <FaPause className="text-sm" />
                    Pause
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudyTimerModal;