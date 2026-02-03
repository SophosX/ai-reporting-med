/**
 * @fileoverview HomePage - Haupt-Dashboard der Anwendung.
 *
 * Diese Seite ist das zentrale Dashboard nach dem Login.
 * Sie zeigt eine Übersicht aller Funktionen und Statistiken.
 *
 * Für normale Benutzer:
 * - Quick Actions: Neuer Bericht, Historie, Vorlagen
 * - Statistik-Dashboard mit Wort-Effizienz-Metriken
 * - Aktivitäts-Chart (Berichte über Zeit)
 * - Liste der letzten Berichte
 *
 * Für Studienteilnehmer (zusätzlich):
 * - Studienmodus-Toggle (Ein/Aus)
 * - Studien-Instruktionen (3 Schritte)
 * - Manueller Bericht Quick-Action
 * - Fall-ID-Pairing-Erklärung
 *
 * API-Endpunkte:
 * - GET /reports/recent - Letzte Berichte
 * - GET /study/study-mode/status - Studienstatus
 * - POST /study/study-mode/toggle - Studienmodus umschalten
 */

import React, { useState, useEffect } from "react";
import {
  FaClock,
  FaArrowRight,
  FaPlus,
  FaHistory,
  FaClipboardList,
  FaFlask,
  FaToggleOn,
  FaToggleOff,
  FaInfoCircle,
  FaEdit,
} from "react-icons/fa";
import { authenticatedFetch, getCurrentUser } from "../utils/auth";
import { toast } from "react-toastify";
import API_URL from "../utils/apiConfig";
import ReportsChart from "../components/ReportsChart";
import OverallWordCountStats from "../components/OverallWordCountStats";

/**
 * Dashboard-Komponente mit Studien-Unterstützung.
 *
 * Zeigt unterschiedliche Inhalte basierend auf dem Benutzerstatus:
 * - Normaler Benutzer: Standard Quick-Actions und Statistiken
 * - Studienteilnehmer: Zusätzlich Studienmodus-Toggle und Instruktionen
 *
 * @returns {JSX.Element} Das gerenderte Dashboard
 */
function HomePage() {
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studyStatus, setStudyStatus] = useState({
    study_participant: false,
    study_mode_active: false,
    experience_level: null,
    full_name: null,
  });
  const [isTogglingStudyMode, setIsTogglingStudyMode] = useState(false);
  const [showStudyInfo, setShowStudyInfo] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch recent reports
        const recentResponse = await authenticatedFetch(
          `${API_URL}/reports/recent`
        );

        if (!recentResponse.ok) {
          throw new Error("Failed to fetch recent reports");
        }

        const recentData = await recentResponse.json();
        setRecentReports(recentData);

        // Fetch study status if user is logged in
        const user = getCurrentUser();
        if (user) {
          const studyResponse = await authenticatedFetch(
            `${API_URL}/study/study-mode/status`
          );
          
          if (studyResponse.ok) {
            const studyData = await studyResponse.json();
            setStudyStatus(studyData);
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
        // Don't display the error if it's related to authentication
        // as the ProtectedRoute will handle redirecting
        if (!err.message.includes("Session expired")) {
          toast.error(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Toggle study mode
  const handleToggleStudyMode = async () => {
    setIsTogglingStudyMode(true);
    try {
      const response = await authenticatedFetch(
        `${API_URL}/study/study-mode/toggle`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            study_mode_active: !studyStatus.study_mode_active,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to toggle study mode");
      }

      const data = await response.json();
      setStudyStatus({
        ...studyStatus,
        study_mode_active: data.study_mode_active,
      });
      
      toast.success(data.message);
    } catch (err) {
      console.error("Error toggling study mode:", err);
      toast.error("Failed to toggle study mode");
    } finally {
      setIsTogglingStudyMode(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("de-DE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        {/* Header with Study Mode Toggle */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-semibold text-gray-100 tracking-tight">Dashboard</h1>
            <p className="text-sm text-gray-400 mt-1">Medizinische Berichtserstellung</p>
          </div>

          {/* Study Mode Toggle - Only show for study participants */}
          {studyStatus.study_participant && (
            <div className="flex items-center gap-4">
              <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 p-5 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-700/50 rounded-lg flex items-center justify-center">
                      <FaFlask className="text-gray-400 text-sm" />
                    </div>
                    <span className="text-sm font-medium text-gray-300">Studienmodus</span>
                  </div>

                  <button
                    onClick={handleToggleStudyMode}
                    disabled={isTogglingStudyMode}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
                      studyStatus.study_mode_active
                        ? "bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30"
                        : "bg-gray-700/50 border border-gray-600/50 text-gray-400 hover:bg-gray-700"
                    } ${isTogglingStudyMode ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {studyStatus.study_mode_active ? (
                      <>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                        <span>Aktiv</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                        <span>Inaktiv</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setShowStudyInfo(!showStudyInfo)}
                    className="text-gray-500 hover:text-gray-300 transition-colors p-2"
                  >
                    <FaInfoCircle className="text-sm" />
                  </button>
                </div>

                {/* Study Info Dropdown */}
                {showStudyInfo && (
                  <div className="mt-4 p-4 bg-gray-900/50 rounded-lg text-sm border border-gray-700/30">
                    <p className="mb-2 text-gray-300">
                      <span className="text-gray-500">Teilnehmer:</span> {studyStatus.full_name}
                    </p>
                    <p className="mb-3 text-gray-300">
                      <span className="text-gray-500">Erfahrung:</span> {studyStatus.experience_level === "assistenzarzt" ? "Assistenzarzt" : studyStatus.experience_level === "facharzt" ? "Facharzt" : studyStatus.experience_level === "oberarzt" ? "Oberarzt" : studyStatus.experience_level}
                    </p>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Wenn der Studienmodus aktiv ist, werden alle von Ihnen erstellten Berichte
                      für Zeitmetriken und Effizienzanalysen erfasst.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Study Mode Banner with Instructions */}
        {studyStatus.study_mode_active && (
          <div className="mb-8 p-6 bg-indigo-600/5 border border-indigo-500/20 rounded-xl backdrop-blur-sm">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 bg-indigo-600/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <FaFlask className="text-indigo-400 text-lg" />
              </div>
              <div>
                <h3 className="font-medium text-gray-200 text-base">Studienmodus Aktiv</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Ihre Berichterstellungszeiten und Effizienzmetriken werden für die radiologische Effizienzstudie aufgezeichnet.
                </p>
              </div>
            </div>

            {/* Study Instructions */}
            <div className="mt-5 p-5 bg-gray-800/40 rounded-lg border border-gray-700/30">
              <h4 className="font-medium text-gray-200 mb-4 text-sm flex items-center gap-2">
                <FaInfoCircle className="text-gray-400 text-xs" />
                So funktioniert die Studie:
              </h4>
              <div className="space-y-4 text-sm text-gray-400">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-7 h-7 bg-gray-700/50 rounded-lg flex items-center justify-center text-gray-300 font-medium text-xs">1</div>
                  <div>
                    <p className="font-medium text-gray-300 mb-1">Mit KI-Unterstützung:</p>
                    <p className="text-gray-400 leading-relaxed">Wählen Sie "Neuer Bericht", geben Sie eine Fall-ID ein (z.B. "Fall-123"), diktieren Sie den Befund und lassen Sie die KI den Bericht generieren.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-7 h-7 bg-gray-700/50 rounded-lg flex items-center justify-center text-gray-300 font-medium text-xs">2</div>
                  <div>
                    <p className="font-medium text-gray-300 mb-1">Ohne KI (Manuell):</p>
                    <p className="text-gray-400 leading-relaxed">Wählen Sie "Manueller Bericht", geben Sie die <span className="text-gray-300 font-medium">gleiche Fall-ID</span> ein (z.B. "Fall-123") und schreiben Sie den Bericht komplett selbst.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-7 h-7 bg-gray-700/50 rounded-lg flex items-center justify-center text-gray-300 font-medium text-xs">3</div>
                  <div>
                    <p className="font-medium text-gray-300 mb-1">Vergleich:</p>
                    <p className="text-gray-400 leading-relaxed">Durch die gleiche Fall-ID können beide Ansätze direkt verglichen werden (Zeitaufwand, Wortanzahl, Effizienz).</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className={`grid grid-cols-1 ${studyStatus.study_mode_active ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'} gap-5 mb-10`}>
          {/* Create New Report Card (AI) */}
          <a
            href="/reports/new"
            className={`group bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 p-6 rounded-xl hover:bg-gray-800 hover:border-gray-600/50 transition-all ${studyStatus.study_mode_active ? 'ring-1 ring-indigo-500/20' : ''}`}
          >
            <div className="flex items-start justify-between mb-5">
              <div className="w-11 h-11 bg-gray-700/50 rounded-lg flex items-center justify-center group-hover:bg-gray-700 transition-colors">
                <FaPlus className="text-gray-400 text-base" />
              </div>
              {studyStatus.study_mode_active && (
                <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md">Mit KI</span>
              )}
            </div>
            <h3 className="text-base font-medium text-gray-200 mb-2">
              {studyStatus.study_mode_active ? 'KI-gestützter Bericht' : 'Neuer Bericht'}
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              Erstellen Sie einen neuen medizinischen Bericht mit KI-Unterstützung
            </p>
            {studyStatus.study_mode_active && (
              <div className="text-xs text-gray-500 flex items-center gap-1.5">
                <FaClock className="text-xs" />
                <span>Timer + Fall-ID erforderlich</span>
              </div>
            )}
            <div className="mt-4 flex items-center text-sm text-gray-300 group-hover:text-gray-100 transition-colors">
              <span>Jetzt starten</span>
              <FaArrowRight className="ml-2 text-xs group-hover:translate-x-1 transition-transform" />
            </div>
          </a>

          {/* Manual Report Card - Only visible in study mode */}
          {studyStatus.study_mode_active && (
            <a
              href="/study/manual-report"
              className="group bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 p-6 rounded-xl hover:bg-gray-800 hover:border-gray-600/50 transition-all ring-1 ring-amber-500/20"
            >
              <div className="flex items-start justify-between mb-5">
                <div className="w-11 h-11 bg-gray-700/50 rounded-lg flex items-center justify-center group-hover:bg-gray-700 transition-colors">
                  <FaEdit className="text-gray-400 text-base" />
                </div>
                <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md">Ohne KI</span>
              </div>
              <h3 className="text-base font-medium text-gray-200 mb-2">Manueller Bericht</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                Schreiben Sie einen Bericht komplett manuell (ohne KI-Unterstützung)
              </p>
              <div className="text-xs text-gray-500 flex items-center gap-1.5">
                <FaClock className="text-xs" />
                <span>Timer + Fall-ID erforderlich</span>
              </div>
              <div className="mt-4 flex items-center text-sm text-gray-300 group-hover:text-gray-100 transition-colors">
                <span>Manuell starten</span>
                <FaArrowRight className="ml-2 text-xs group-hover:translate-x-1 transition-transform" />
              </div>
            </a>
          )}

          {/* View All Reports Card */}
          <a
            href="/reports/history"
            className="group bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 p-6 rounded-xl hover:bg-gray-800 hover:border-gray-600/50 transition-all"
          >
            <div className="w-11 h-11 bg-gray-700/50 rounded-lg flex items-center justify-center mb-5 group-hover:bg-gray-700 transition-colors">
              <FaHistory className="text-gray-400 text-base" />
            </div>
            <h3 className="text-base font-medium text-gray-200 mb-2">Historie</h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              Alle Ihre erstellten Berichte anzeigen und verwalten
            </p>
            <div className="mt-4 flex items-center text-sm text-gray-300 group-hover:text-gray-100 transition-colors">
              <span>Berichte anzeigen</span>
              <FaArrowRight className="ml-2 text-xs group-hover:translate-x-1 transition-transform" />
            </div>
          </a>

          {/* Templates Card */}
          <a
            href="/templates"
            className="group bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 p-6 rounded-xl hover:bg-gray-800 hover:border-gray-600/50 transition-all"
          >
            <div className="w-11 h-11 bg-gray-700/50 rounded-lg flex items-center justify-center mb-5 group-hover:bg-gray-700 transition-colors">
              <FaClipboardList className="text-gray-400 text-base" />
            </div>
            <h3 className="text-base font-medium text-gray-200 mb-2">Vorlagen</h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              Ihre Berichtsvorlagen durchsuchen und verwalten
            </p>
            <div className="mt-4 flex items-center text-sm text-gray-300 group-hover:text-gray-100 transition-colors">
              <span>Vorlagen verwalten</span>
              <FaArrowRight className="ml-2 text-xs group-hover:translate-x-1 transition-transform" />
            </div>
          </a>
        </div>

        {/* Statistics Overview */}
        <div className="mb-10">
          <OverallWordCountStats />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Reports Chart */}
          <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 p-7 rounded-xl">
            <h2 className="text-base font-medium text-gray-200 mb-5">Aktivität</h2>
            <ReportsChart />
          </div>

          {/* Recent Reports */}
          <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 p-7 rounded-xl">
            <h2 className="text-base font-medium text-gray-200 mb-5">Letzte Berichte</h2>
            {loading ? (
              <p className="text-gray-400 text-sm">Berichte werden geladen...</p>
            ) : error ? (
              <p className="text-red-400/80 text-sm">Fehler beim Laden: {error}</p>
            ) : recentReports.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-gray-700/50 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FaClipboardList className="text-gray-500 text-lg" />
                </div>
                <p className="text-gray-400 text-sm mb-4">Noch keine Berichte erstellt</p>
                <a
                  href="/reports/new"
                  className="inline-flex items-center text-sm text-gray-300 hover:text-gray-100 transition-colors"
                >
                  Ersten Bericht erstellen <FaArrowRight className="ml-2 text-xs" />
                </a>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentReports.map((report) => (
                  <a
                    key={report.id}
                    href={`/reports/${report.id}`}
                    className="block p-4 bg-gray-700/30 border border-gray-700/50 rounded-lg hover:bg-gray-700/50 hover:border-gray-600/50 transition-all"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-200 text-sm truncate">
                          {report.input_text.substring(0, 60)}...
                        </h3>
                        <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1.5">
                          <FaClock className="text-xs" />
                          {formatDate(report.created_at)}
                        </p>
                      </div>
                      <span className="text-xs text-gray-600 font-mono">
                        #{report.id}
                      </span>
                    </div>
                  </a>
                ))}
                <div className="text-center pt-4">
                  <a
                    href="/reports"
                    className="text-sm text-gray-400 hover:text-gray-200 transition-colors inline-flex items-center gap-2"
                  >
                    Alle Berichte anzeigen
                    <FaArrowRight className="text-xs" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;