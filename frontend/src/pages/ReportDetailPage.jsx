/**
 * @fileoverview ReportDetailPage - Detailansicht eines einzelnen Berichts.
 *
 * Diese Seite zeigt einen vollständigen Bericht mit allen Details.
 *
 * Features:
 * - Vollständige ReportCard mit allen Metriken
 * - Template-Diff-Visualisierung (Vergleich mit Original-Template)
 * - Bearbeitung des Berichts (auch nach Studien-Abschluss)
 *
 * Diff-Visualisierung:
 * - Grün: Hinzugefügter Text (im Bericht, nicht im Template)
 * - Rot durchgestrichen: Entfernter Text (im Template, nicht im Bericht)
 * - Normal: Unveränderter Text
 */

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaSync, FaArrowLeft } from "react-icons/fa";
import { toast } from "react-toastify";
import { authenticatedFetch } from "../utils/auth";
import ReportCard from "../components/ReportCard";
import API_URL from "../utils/apiConfig";
import * as diff from 'diff';

/**
 * Detailansicht-Komponente für einen einzelnen Bericht.
 *
 * Lädt den Bericht via reportId aus der URL (/reports/:reportId).
 * Zeigt die ReportCard in isDetailView-Modus und ggf. Template-Diff.
 *
 * @returns {JSX.Element} Die gerenderte Berichts-Detailseite
 */
function ReportDetailPage() {
  const { reportId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

        // Use the template_text stored with the report (from when it was generated)
        // This ensures we compare against the exact template version used for generation
        if (data.template_text) {
          setTemplateText(data.template_text);
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

    // Normalize whitespace to avoid false differences
    // But keep the original text for display
    const normalizeWhitespace = (text) => text.replace(/\s+/g, ' ').trim();

    // Use the normalized texts for comparison
    const differences = diff.diffWords(
      normalizeWhitespace(text1),
      normalizeWhitespace(text2)
    );

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
    <>
      <div className="max-w-5xl mx-auto px-4 py-8 text-white">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handleGoBack}
          className="flex items-center space-x-2 text-blue-400 hover:text-blue-300"
        >
          <FaArrowLeft />
          <span>Zurück zu den Berichten</span>
        </button>
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

          {templateText && (
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
    </>
  );
}

export default ReportDetailPage;
