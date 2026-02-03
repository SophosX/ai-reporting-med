/**
 * @fileoverview StudyTimerBar-Komponente - Timer-Leiste für Studien-Sessions.
 *
 * Diese Komponente zeigt eine fixierte Leiste am oberen Bildschirmrand,
 * die während einer aktiven Studien-Session angezeigt wird. Sie trackt:
 * - Verstrichene Zeit seit Session-Start
 * - Anzahl und Gesamtdauer der Pausen
 *
 * Die Komponente kommuniziert Timer-Daten an die Eltern-Komponente
 * für die spätere Speicherung in der Datenbank.
 */

import React, { useState, useEffect } from "react";
import {
  FaClock,
  FaPause,
  FaPlay,
  FaFlask,
  FaInfoCircle,
} from "react-icons/fa";

/**
 * StudyTimerBar-Komponente für das Tracking von Studien-Sessions.
 *
 * Zeigt eine fixierte Leiste mit Timer, Pausen-Funktionalität und
 * Session-Informationen. Wird automatisch gestartet und kann
 * pausiert/fortgesetzt werden.
 *
 * @param {Object} props - Komponenten-Props
 * @param {Function} props.onSessionStart - Callback beim Start mit Timer-Daten
 * @param {number} [props.studySessionId] - ID der Backend-Session
 * @param {Function} props.onTimerData - Callback für Timer-Daten-Updates
 * @param {Function} [props.onCancel] - Callback zum Abbrechen der Session
 * @param {Object} [props.initialTimerData] - Initiale Timer-Daten (bei Wiederaufnahme)
 * @param {Date} props.initialTimerData.startTime - Startzeit
 * @param {number} props.initialTimerData.pauseCount - Bisherige Pausenanzahl
 * @param {number} props.initialTimerData.totalPauseTime - Bisherige Pausenzeit
 * @returns {JSX.Element} Die gerenderte Timer-Leiste
 */
function StudyTimerBar({ onSessionStart, studySessionId, onTimerData, onCancel, initialTimerData }) {
  const [timerStarted, setTimerStarted] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [pauseCount, setPauseCount] = useState(0);
  const [totalPauseTime, setTotalPauseTime] = useState(0);
  const [pauseStartTime, setPauseStartTime] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [startTime, setStartTime] = useState(null);

  // Initialize timer with existing data if available
  useEffect(() => {
    if (initialTimerData) {
      const start = new Date(initialTimerData.startTime);
      setStartTime(start);
      setPauseCount(initialTimerData.pauseCount || 0);
      setTotalPauseTime(initialTimerData.totalPauseTime || 0);
      
      // Calculate elapsed time from start time
      const elapsed = Math.floor((Date.now() - start.getTime()) / 1000) - (initialTimerData.totalPauseTime || 0);
      setElapsedTime(elapsed);
      setTimerStarted(true);
    }
  }, [initialTimerData]);

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
    setTimerStarted(true);
    const timerData = {
      startTime: new Date(),
      pauseCount: 0,
      totalPauseTime: 0,
    };
    onSessionStart(timerData);
    if (onTimerData) {
      onTimerData(timerData);
    }
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

  // Auto-start timer when component mounts (only if no initial data)
  useEffect(() => {
    if (!timerStarted && !initialTimerData) {
      setTimerStarted(true);
      setStartTime(new Date());
      // Timer data was already set by onSessionStart from the modal
    }
  }, [initialTimerData]);

  // Update timer data when pause info changes
  useEffect(() => {
    if (onTimerData && timerStarted && startTime) {
      onTimerData({
        startTime: startTime,
        pauseCount: pauseCount,
        totalPauseTime: totalPauseTime,
      });
    }
  }, [pauseCount, totalPauseTime]); // Removed startTime from dependencies to prevent loop

  return (
    <div className="fixed top-20 left-0 right-0 bg-purple-900/90 backdrop-blur-sm border-b border-purple-700 shadow-lg z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between py-2">
          {/* Left side - Study info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FaFlask className="text-purple-400" />
              <span className="text-sm font-semibold text-purple-200">
                Studienmodus Aktiv
              </span>
            </div>

            {/* Timer display */}
            <div className="flex items-center gap-2 bg-purple-800/50 px-3 py-1 rounded-lg">
              <FaClock className="text-purple-300" />
              <span className="font-mono text-lg text-white">
                {formatTime(elapsedTime)}
              </span>
              {timerPaused && (
                <span className="text-xs text-yellow-400 ml-2">(Pausiert)</span>
              )}
            </div>

            {/* Pause count */}
            {pauseCount > 0 && (
              <div className="text-sm text-purple-300">
                {pauseCount} Pause{pauseCount !== 1 && "n"}
              </div>
            )}
          </div>

          {/* Right side - Controls */}
          <div className="flex items-center gap-2">
            {/* Pause/Resume button */}
            <button
              onClick={handlePause}
              className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm ${
                timerPaused
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-yellow-600 hover:bg-yellow-700 text-white"
              }`}
            >
              {timerPaused ? (
                <>
                  <FaPlay className="text-xs" />
                  Fortsetzen
                </>
              ) : (
                <>
                  <FaPause className="text-xs" />
                  Pausieren
                </>
              )}
            </button>

            {/* Cancel button */}
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                Abbrechen
              </button>
            )}

            {/* Info button */}
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="p-2 text-purple-300 hover:text-white transition-colors"
              title="Informationen zur Studiensitzung"
            >
              <FaInfoCircle />
            </button>
          </div>
        </div>

        {/* Info dropdown */}
        {showInfo && (
          <div className="pb-3">
            <div className="bg-purple-800/50 rounded-lg p-3 text-sm">
              <p className="text-purple-200 mb-2">
                Diese Sitzung erfasst Ihre Berichterstellungszeit für die Effizienzstudie.
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-purple-400">Verstrichene Zeit:</span>{" "}
                  <span className="text-white">{formatTime(elapsedTime)}</span>
                </div>
                <div>
                  <span className="text-purple-400">Pausen:</span>{" "}
                  <span className="text-white">{pauseCount}</span>
                </div>
                {totalPauseTime > 0 && (
                  <div>
                    <span className="text-purple-400">Pausenzeit gesamt:</span>{" "}
                    <span className="text-white">{formatTime(totalPauseTime)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StudyTimerBar;