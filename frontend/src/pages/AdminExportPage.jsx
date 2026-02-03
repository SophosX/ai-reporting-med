/**
 * @fileoverview AdminExportPage - Administrator-Export für Studiendaten.
 *
 * Diese Seite bietet Export-Funktionen für Administratoren und Benutzer.
 * Sie ermöglicht den Download aller Studiendaten für die wissenschaftliche
 * Analyse.
 *
 * Zwei Export-Optionen:
 * 1. Admin Export (Alle Daten):
 *    - Exportiert Daten ALLER Studienteilnehmer
 *    - Nur für Benutzer mit admin-Rechten
 *    - Endpoint: GET /study/study-data/export-all
 *
 * 2. Benutzer Export (Eigene Daten):
 *    - Exportiert nur die eigenen Studiendaten
 *    - Für alle Studienteilnehmer verfügbar
 *    - Endpoint: GET /study/study-data/export
 *
 * Export-Inhalte:
 * - Teilnehmer-Daten: Username, Name, Erfahrungslevel
 * - Session-Metriken: Timer-Daten, Wortanzahlen, Bearbeitungsoperationen
 * - Report-Inhalte: Eingabetext, generierter Bericht, Templates
 * - Template-Daten: ID, Titel, vollständiger Text
 *
 * Download-Format: JSON-Datei mit Timestamp im Dateinamen
 */

import React, { useState } from "react";
import { FaDownload, FaDatabase, FaChartBar, FaUsers, FaShieldAlt } from "react-icons/fa";
import { toast } from "react-toastify";
import { authenticatedFetch } from "../utils/auth";
import API_URL from "../utils/apiConfig";

/**
 * Administrator-Export-Seite mit Doppel-Export-Funktionalität.
 *
 * @returns {JSX.Element} Die gerenderte Export-Seite
 */
function AdminExportPage() {
  const [loading, setLoading] = useState(false);
  const [studyData, setStudyData] = useState(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userStudyData, setUserStudyData] = useState(null);

  const handleAdminExport = async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch(`${API_URL}/study/study-data/export-all`);
      
      if (response.ok) {
        const data = await response.json();
        setStudyData(data);
        
        // Download als JSON Datei
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `admin_study_data_export_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success("Admin-Studiendaten erfolgreich exportiert!");
      } else {
        throw new Error("Fehler beim Admin-Export");
      }
    } catch (error) {
      console.error("Admin export error:", error);
      toast.error("Fehler beim Exportieren der Admin-Studiendaten");
    } finally {
      setLoading(false);
    }
  };

  const handleUserExport = async () => {
    setUserLoading(true);
    try {
      const response = await authenticatedFetch(`${API_URL}/study/study-data/export`);
      
      if (response.ok) {
        const data = await response.json();
        setUserStudyData(data);
        
        // Download als JSON Datei
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user_study_data_export_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success("Benutzerdaten erfolgreich exportiert!");
      } else {
        throw new Error("Fehler beim Benutzer-Export");
      }
    } catch (error) {
      console.error("User export error:", error);
      toast.error("Fehler beim Exportieren der Benutzerdaten");
    } finally {
      setUserLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 text-white">
      <div className="glass-effect rounded-xl shadow-lg p-8">
        <div className="flex items-center space-x-3 mb-6">
          <FaDatabase className="text-3xl text-blue-400" />
          <h1 className="text-2xl font-bold text-blue-400">
            Studiendaten Export
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Admin Export */}
          <div className="bg-gray-800/50 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FaShieldAlt className="text-red-400" />
              Admin Export (Alle Daten)
            </h2>
            
            <p className="text-gray-300 mb-4">
              Exportiert alle Studiendaten aller Teilnehmer für die Analyse.
            </p>

            <div className="mb-4">
              <p className="text-sm text-gray-400">
                ⚠️ Nur für Administratoren verfügbar
              </p>
            </div>

            <button
              onClick={handleAdminExport}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-3 px-6 rounded-lg transition-colors duration-200 font-medium"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Exportiere alle Daten...</span>
                </>
              ) : (
                <>
                  <FaDownload />
                  <span>Alle Studiendaten exportieren</span>
                </>
              )}
            </button>

            {studyData && (
              <div className="mt-4 p-3 bg-green-800/30 rounded-lg">
                <h4 className="text-sm font-semibold text-green-300 mb-2">
                  Admin Export Zusammenfassung
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400">Teilnehmer:</span>
                    <span className="ml-2 text-white">{studyData.total_participants}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Sessions:</span>
                    <span className="ml-2 text-white">{studyData.total_sessions}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400">Export:</span>
                    <span className="ml-2 text-white">
                      {new Date(studyData.export_date).toLocaleString('de-DE')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Export */}
          <div className="bg-gray-800/50 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FaUsers className="text-blue-400" />
              Benutzer Export (Eigene Daten)
            </h2>
            
            <p className="text-gray-300 mb-4">
              Exportiert nur Ihre eigenen Studiendaten.
            </p>

            <div className="mb-4">
              <p className="text-sm text-gray-400">
                ✅ Für alle Studienteilnehmer verfügbar
              </p>
            </div>

            <button
              onClick={handleUserExport}
              disabled={userLoading}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 px-6 rounded-lg transition-colors duration-200 font-medium"
            >
              {userLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Exportiere Ihre Daten...</span>
                </>
              ) : (
                <>
                  <FaDownload />
                  <span>Meine Studiendaten exportieren</span>
                </>
              )}
            </button>

            {userStudyData && (
              <div className="mt-4 p-3 bg-blue-800/30 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-300 mb-2">
                  Benutzer Export Zusammenfassung
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400">Sessions:</span>
                    <span className="ml-2 text-white">{userStudyData.total_sessions}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Erfahrung:</span>
                    <span className="ml-2 text-white">{userStudyData.participant.experience_level}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400">Export:</span>
                    <span className="ml-2 text-white">
                      {new Date(userStudyData.export_date).toLocaleString('de-DE')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-purple-400 flex items-center gap-2">
            <FaChartBar />
            Export Inhalte
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-white mb-2">Teilnehmer-Daten:</h4>
              <ul className="text-gray-300 space-y-1">
                <li>• Benutzername & Name</li>
                <li>• Erfahrungslevel</li>
                <li>• Studienteilnehmer-Status</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">Session-Metriken:</h4>
              <ul className="text-gray-300 space-y-1">
                <li>• Timer-Daten (Start, Ende, Pausen)</li>
                <li>• Wortanzahlen (Input, Generiert, Final)</li>
                <li>• Bearbeitungsoperationen</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">Report-Inhalte:</h4>
              <ul className="text-gray-300 space-y-1">
                <li>• Ursprünglicher Eingabetext</li>
                <li>• Generierter Bericht</li>
                <li>• Verwendete Templates</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">Template-Daten:</h4>
              <ul className="text-gray-300 space-y-1">
                <li>• Template-ID und Titel</li>
                <li>• Vollständiger Template-Text</li>
                <li>• Benutzer- vs. Standard-Templates</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminExportPage;