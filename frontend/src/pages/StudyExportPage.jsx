import React, { useState } from "react";
import { FaDownload, FaDatabase, FaChartBar } from "react-icons/fa";
import { toast } from "react-toastify";
import { authenticatedFetch } from "../utils/auth";
import API_URL from "../utils/apiConfig";

function StudyExportPage() {
  const [loading, setLoading] = useState(false);
  const [studyData, setStudyData] = useState(null);

  const handleExport = async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch(`${API_URL}/study/study-data/export`);
      
      if (response.ok) {
        const data = await response.json();
        setStudyData(data);
        
        // Download als JSON Datei
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `study_data_export_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success("Studiendaten erfolgreich exportiert!");
      } else {
        throw new Error("Fehler beim Export");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Fehler beim Exportieren der Studiendaten");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-white">
      <div className="glass-effect rounded-xl shadow-lg p-8">
        <div className="flex items-center space-x-3 mb-6">
          <FaDatabase className="text-3xl text-blue-400" />
          <h1 className="text-2xl font-bold text-blue-400">
            Studiendaten Export
          </h1>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FaChartBar className="text-purple-400" />
            Export Optionen
          </h2>
          
          <p className="text-gray-300 mb-6">
            Exportieren Sie alle gesammelten Studiendaten als JSON-Datei für weitere Analysen.
          </p>

          <button
            onClick={handleExport}
            disabled={loading}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 px-6 rounded-lg transition-colors duration-200 font-medium"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Exportiere...</span>
              </>
            ) : (
              <>
                <FaDownload />
                <span>Studiendaten exportieren</span>
              </>
            )}
          </button>
        </div>

        {studyData && (
          <div className="bg-gray-800/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-green-400">
              Export Zusammenfassung
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Anzahl Sessions:</span>
                <span className="ml-2 text-white font-medium">{studyData.total_sessions}</span>
              </div>
              <div>
                <span className="text-gray-400">Export Datum:</span>
                <span className="ml-2 text-white font-medium">
                  {new Date(studyData.export_date).toLocaleString('de-DE')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StudyExportPage;