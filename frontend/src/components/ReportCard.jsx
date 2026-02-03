/**
 * @fileoverview ReportCard-Komponente - Darstellung medizinischer Befundberichte.
 *
 * Diese Komponente zeigt einen einzelnen Befundbericht mit:
 * - Metadaten (Datum, Fall-ID, Studiendauer)
 * - Eingabetext (Stichpunkte des Radiologen)
 * - Generierter Befundtext (mit Markdown-Rendering)
 * - Wortanzahl-Metriken (nur für KI-generierte Berichte)
 *
 * Features:
 * - Inline-Bearbeitung mit Markdown-Editor
 * - PDF-Download
 * - Kopieren in Zwischenablage
 * - Löschen-Funktionalität
 */

import React, { useState, useEffect } from "react";
import {
  FaFilePdf,
  FaTrashAlt,
  FaKeyboard,
  FaCopy,
  FaEdit,
  FaSave,
  FaUndo,
  FaCheck,
} from "react-icons/fa";
import { toast } from "react-toastify";
import MDEditor from "@uiw/react-md-editor";
import rehypeSanitize from "rehype-sanitize";
import { Link, useNavigate } from "react-router-dom";
import { authenticatedFetch } from "../utils/auth";
import API_URL from "../utils/apiConfig";
import WordCountMetrics from "./WordCountMetrics";

/**
 * ReportCard-Komponente zur Anzeige eines medizinischen Befundberichts.
 *
 * Zeigt den vollständigen Bericht mit Eingabe, generiertem Text und Metriken.
 * Unterstützt Bearbeitung, PDF-Export und Löschung.
 *
 * @param {Object} props - Komponenten-Props
 * @param {Object} props.report - Das Bericht-Datenobjekt aus der API
 * @param {number} props.report.id - Eindeutige Bericht-ID
 * @param {string} props.report.input_text - Eingabetext des Radiologen
 * @param {string} props.report.report_text - Generierter Befundtext
 * @param {string} props.report.created_at - Erstellungszeitpunkt (ISO-String)
 * @param {boolean} props.report.is_manual - True wenn manuell erstellt
 * @param {string} [props.report.case_id] - Fall-ID für Studien-Tracking
 * @param {number} [props.report.study_duration_seconds] - Studiendauer in Sekunden
 * @param {boolean} [props.isDetailView=false] - True für Detailansicht (ohne Link)
 * @param {Function} [props.onDelete] - Callback nach erfolgreicher Löschung
 * @param {Function} [props.onUpdate] - Callback nach erfolgreicher Aktualisierung
 * @returns {JSX.Element} Die gerenderte Berichtskarte
 */
function ReportCard({ report, isDetailView = false, onDelete, onUpdate }) {
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [isEditingInput, setIsEditingInput] = useState(false);
  const [editedReportText, setEditedReportText] = useState(
    report?.report_text || ""
  );
  const [editedInputText, setEditedInputText] = useState(
    report?.input_text || ""
  );
  const navigate = useNavigate();

  // Update local state when report prop changes
  useEffect(() => {
    setEditedReportText(report?.report_text || "");
    setEditedInputText(report?.input_text || "");
  }, [report?.report_text, report?.input_text]);

  const formatDate = (isoString) => {
    if (!isoString) return { date: "Invalid Date", time: "" };

    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const { date, time } = formatDate(report?.created_at);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Text in die Zwischenablage kopiert");
  };

  const handleDownloadPdf = async () => {
    if (!report?.id) return;

    try {
      // Use authenticatedFetch but modify it to handle binary data
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Bitte melden Sie sich an, um das PDF herunterzuladen");
        return;
      }

      // Direct fetch instead of authenticatedFetch to handle binary response
      const response = await fetch(`${API_URL}/reports/${report.id}/pdf`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Fehler beim Herunterladen des PDF-Berichts");
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link and click it to download
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `medizinischer_bericht_${report.id}.pdf`;
      document.body.appendChild(a);
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("PDF erfolgreich heruntergeladen");
    } catch (err) {
      console.error("Error downloading PDF:", err);
      toast.error("Fehler beim Herunterladen des PDFs");
    }
  };

  const handleDelete = async () => {
    if (!report?.id) return;

    if (!confirm("Möchten Sie diesen Bericht wirklich löschen?")) {
      return;
    }

    try {
      const response = await authenticatedFetch(
        `${API_URL}/reports/${report.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Fehler beim Löschen des Berichts");
      }

      toast.success("Bericht gelöscht");

      if (onDelete) {
        onDelete(report.id);
      }

      // If we're in detail view, navigate back to history
      if (isDetailView) {
        navigate("/reports/history");
      }
    } catch (err) {
      console.error("Error deleting report:", err);
      toast.error("Fehler beim Löschen des Berichts");
    }
  };

  const handleStartEditingReport = () => {
    setEditedReportText(report.report_text);
    setIsEditingReport(true);
  };

  const handleStartEditingInput = () => {
    setEditedInputText(report.input_text);
    setIsEditingInput(true);
  };

  const handleSaveReportEdit = async () => {
    try {
      const response = await authenticatedFetch(
        `${API_URL}/reports/${report.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ report_text: editedReportText }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update report");
      }

      // Get the updated report data from the backend response
      const updatedReportData = await response.json();

      setIsEditingReport(false);

      if (onUpdate) {
        // Use the complete updated report data from backend (includes recalculated word metrics)
        onUpdate(updatedReportData);
      }

      toast.success("Bericht erfolgreich aktualisiert");
    } catch (err) {
      console.error("Error saving report edit:", err);
      toast.error("Fehler beim Speichern der Berichtsänderungen");
    }
  };

  const handleSaveInputEdit = async () => {
    try {
      const response = await authenticatedFetch(
        `${API_URL}/reports/${report.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ input_text: editedInputText }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update input text");
      }

      // Get the updated report data from the backend response
      const updatedReportData = await response.json();

      setIsEditingInput(false);

      if (onUpdate) {
        // Use the complete updated report data from backend (includes recalculated word metrics)
        onUpdate(updatedReportData);
      }

      toast.success("Eingabetext erfolgreich aktualisiert");
    } catch (err) {
      console.error("Error saving input edit:", err);
      toast.error("Fehler beim Speichern der Eingabetext-Änderungen");
    }
  };

  const handleCancelReportEdit = () => {
    setIsEditingReport(false);
    setEditedReportText(report.report_text);
  };

  const handleCancelInputEdit = () => {
    setIsEditingInput(false);
    setEditedInputText(report.input_text);
  };

  if (!report) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 text-white">
        <p>No report data available</p>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 rounded-xl p-6 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
      {/* Header: Status & Actions */}
      <div className="absolute right-4 top-4 flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
        <div className="flex items-center space-x-2">
          <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          <span className="text-xs text-gray-400 hidden sm:inline">
            Generiert
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            title="PDF herunterladen"
            onClick={handleDownloadPdf}
            className="p-2 hover:bg-blue-500/10 rounded-lg transition-colors duration-200 flex items-center space-x-1 text-gray-400 hover:text-blue-400"
          >
            <FaFilePdf />
            <span className="text-xs hidden sm:inline">PDF</span>
          </button>
          <button
            title="Bericht löschen"
            onClick={handleDelete}
            className="p-2 hover:bg-red-500/10 rounded-lg transition-colors duration-200 flex items-center space-x-1 text-gray-400 hover:text-red-400"
          >
            <FaTrashAlt />
            <span className="text-xs hidden sm:inline">Löschen</span>
          </button>
        </div>
      </div>

      {/* Report ID and View Detail Link (only in list view) */}
      {!isDetailView && (
        <div className="mb-2">
          <Link
            to={`/reports/${report.id}`}
            className="text-blue-400 hover:text-blue-300 text-lg font-medium transition-colors"
          >
            Bericht #{report.id}{" "}
            <span className="text-xs">→ Details anzeigen</span>
          </Link>
        </div>
      )}

      {/* Date Info */}
      <div className="mt-8 mb-6">
        <div>
          <span className="text-sm font-medium text-gray-300">{date}</span>
          <div className="text-xs text-gray-500">{time}</div>
        </div>
      </div>

      {/* Study Session Info */}
      {(report.case_id || report.study_duration_seconds !== null) && (
        <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-purple-300">Studiensitzung</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {report.case_id && (
              <div>
                <div className="text-xs text-gray-400 mb-1">Fall-ID</div>
                <div className="text-sm font-mono text-purple-200 bg-purple-900/20 px-2 py-1 rounded">
                  {report.case_id}
                </div>
              </div>
            )}
            {report.study_duration_seconds !== null && (
              <div>
                <div className="text-xs text-gray-400 mb-1">Dauer</div>
                <div className="text-sm font-mono text-purple-200 bg-purple-900/20 px-2 py-1 rounded">
                  {Math.floor(report.study_duration_seconds / 60)}:{(report.study_duration_seconds % 60).toString().padStart(2, '0')} min
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Word Count Metrics - Only show for AI-generated reports */}
      {!report.is_manual && (
        <div className="mb-6">
          <WordCountMetrics
            report={report}
            showLabels={true}
            compact={false}
            showDescriptions={isDetailView}
          />
        </div>
      )}

      {/* Input Text Section */}
      <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
        <h3 className="text-lg font-semibold text-blue-400 mb-2 flex items-center">
          <FaKeyboard className="mr-2" />
          Eingabetext
        </h3>
        <div className="text-gray-300 leading-relaxed text-sm">
          {report.input_text}
        </div>
      </div>

      {/* Generated Report Section */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-green-400 flex items-center">
            Generierter Bericht
          </h3>
          <div className="flex space-x-2">
            {isEditingReport ? (
              <>
                <button
                  onClick={handleSaveReportEdit}
                  title="Änderungen speichern"
                  className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors duration-200 flex items-center space-x-2 text-green-400 hover:text-green-300 text-sm"
                >
                  <FaCheck />
                  <span>Fertig</span>
                </button>
                <button
                  onClick={handleCancelReportEdit}
                  title="Bearbeitung abbrechen"
                  className="p-2 hover:bg-red-500/10 rounded-lg transition-colors duration-200 flex items-center space-x-2 text-gray-400 hover:text-red-400 text-sm"
                >
                  <FaUndo />
                  <span>Abbrechen</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleStartEditingReport}
                  title="Bericht bearbeiten"
                  className="p-2 hover:bg-blue-500/10 rounded-lg transition-colors duration-200 flex items-center space-x-2 text-gray-400 hover:text-blue-400 text-sm"
                >
                  <FaEdit />
                  <span>Bearbeiten</span>
                </button>
                <button
                  onClick={() => handleCopy(report.report_text)}
                  title="Bericht kopieren"
                  className="p-2 hover:bg-blue-500/10 rounded-lg transition-colors duration-200 flex items-center space-x-2 text-gray-400 hover:text-blue-400 text-sm"
                >
                  <FaCopy />
                  <span>Kopieren</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Report content with Markdown editor */}
        <div className="mt-4">
          {isEditingReport ? (
            <div data-color-mode="dark" className="md-editor-wrapper">
              <MDEditor
                value={editedReportText}
                onChange={setEditedReportText}
                preview="live"
                height={400}
                previewOptions={{
                  rehypePlugins: [[rehypeSanitize]],
                }}
                visibleDragbar={false}
                highlightEnable={true}
                enableScroll={true}
              />
            </div>
          ) : (
            <div data-color-mode="dark" className="markdown-preview-wrapper">
              <MDEditor.Markdown
                source={report.report_text}
                rehypePlugins={[[rehypeSanitize]]}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReportCard;
