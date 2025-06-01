import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaSync, FaArrowLeft, FaEye, FaEyeSlash } from "react-icons/fa";
import { toast } from "react-toastify";
import { authenticatedFetch } from "../utils/auth";
import ReportCard from "../components/ReportCard";
import API_URL from "../utils/apiConfig";
import * as diff from 'diff';

function ReportDetailPage() {
  const { reportId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDiff, setShowDiff] = useState(false);
  const [templateText, setTemplateText] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await authenticatedFetch(
          `${API_URL}/reports/${reportId}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch report");
        }

        const data = await response.json();
        setReport(data);

        // If the report has a template, fetch it
        if (data.template_id) {
          const templateResponse = await authenticatedFetch(
            `${API_URL}/templates/${data.template_id}`
          );
          if (templateResponse.ok) {
            const templateData = await templateResponse.json();
            setTemplateText(templateData.text);
          }
        }
      } catch (err) {
        console.error("Error fetching report:", err);
        setError(err.message);
        toast.error("Fehler beim Laden des Berichts");
      } finally {
        setLoading(false);
      }
    };

    if (reportId) {
      fetchReport();
    }
  }, [reportId]);

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleReportUpdate = (updatedReport) => {
    setReport(updatedReport);
  };

  const renderDiff = (text1, text2) => {
    if (!text1 || !text2) return null;

    const differences = diff.diffWords(text1, text2);
    return differences.map((part, index) => {
      let className = "";
      if (part.added) {
        className = "bg-green-500/20 text-green-300";
      } else if (part.removed) {
        className = "bg-red-500/20 text-red-300 line-through";
      } else if (part.value.trim() !== "") {
        className = "text-gray-300";
      }
      return (
        <span key={index} className={className}>
          {part.value}
        </span>
      );
    });
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 text-white text-center">
        <FaSync className="animate-spin text-3xl mx-auto mb-4" />
        <p>Lade Bericht...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 text-white">
        <button
          onClick={handleGoBack}
          className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 mb-6"
        >
          <FaArrowLeft />
          <span>Zurück</span>
        </button>
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-4">
          <p className="text-white">Fehler: {error}</p>
          <p className="mt-2">Der Bericht konnte nicht geladen werden.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 text-white">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handleGoBack}
          className="flex items-center space-x-2 text-blue-400 hover:text-blue-300"
        >
          <FaArrowLeft />
          <span>Zurück zu den Berichten</span>
        </button>
        {templateText && (
          <button
            onClick={() => setShowDiff(!showDiff)}
            className="flex items-center space-x-2 bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-lg transition-colors duration-200"
          >
            {showDiff ? <FaEyeSlash /> : <FaEye />}
            <span>{showDiff ? "Differenz ausblenden" : "Differenz anzeigen"}</span>
          </button>
        )}
      </div>

      <h2 className="text-3xl font-bold text-blue-400 mb-6">
        Bericht #{reportId}
      </h2>

      {report ? (
        <div className="space-y-6">
          <ReportCard
            report={report}
            isDetailView={true}
            onUpdate={handleReportUpdate}
          />
          
          {showDiff && templateText && (
            <div className="bg-gray-800 rounded-xl p-6 border border-purple-500/40">
              <h3 className="text-xl font-semibold text-purple-300 mb-4">
                Vergleich mit Template
              </h3>
              <div className="bg-gray-900 rounded-lg p-4">
                <div className="prose prose-invert max-w-none">
                  {renderDiff(templateText, report.report_text)}
                </div>
              </div>
              <div className="mt-4 flex items-center space-x-4 text-sm text-gray-400">
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-green-500/20 rounded-full mr-2"></span>
                  <span>Hinzugefügt</span>
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-red-500/20 rounded-full mr-2"></span>
                  <span>Entfernt</span>
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-gray-500/20 rounded-full mr-2"></span>
                  <span>Unverändert</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl p-6">
          <p>Bericht nicht gefunden</p>
        </div>
      )}
    </div>
  );
}

export default ReportDetailPage;
