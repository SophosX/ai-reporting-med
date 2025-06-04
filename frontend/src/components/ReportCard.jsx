import React, { useState, useEffect } from "react";
import {
  FaFilePdf,
  FaTrashAlt,
  FaFileMedical,
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
import * as diff from "diff";

/**
 * ReportCard component for displaying a medical report
 *
 * @param {Object} report - The report data object
 * @param {boolean} isDetailView - Whether this is a detailed view of the report
 * @param {function} onDelete - Function to call when report is deleted
 * @param {function} onUpdate - Function to call when report is updated
 */
function ReportCard({ report, isDetailView = false, onDelete, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedReportText, setEditedReportText] = useState(
    report?.report_text || ""
  );
  const [templateText, setTemplateText] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch template text if report has a template
    const fetchTemplate = async () => {
      console.log("Report template_id:", report?.template_id); // Debug
      if (report?.template_id) {
        try {
          const response = await authenticatedFetch(
            `${API_URL}/templates/${report.template_id}`
          );
          if (response.ok) {
            const data = await response.json();
            console.log("Template data:", data); // Debug
            setTemplateText(data.text);
          } else {
            console.error("Failed to fetch template:", response.status); // Debug
          }
        } catch (err) {
          console.error("Error fetching template:", err);
        }
      }
    };

    fetchTemplate();
  }, [report?.template_id]);

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
    toast.success("Bericht in die Zwischenablage kopiert");
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

  const handleStartEditing = () => {
    setEditedReportText(report.report_text);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
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

      setIsEditing(false);

      if (onUpdate) {
        // Create updated report object
        const updatedReport = {
          ...report,
          report_text: editedReportText,
        };
        onUpdate(updatedReport);
      }

      toast.success("Report updated successfully");
    } catch (err) {
      console.error("Error saving edit:", err);
      toast.error("Error saving changes");
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedReportText(report.report_text);
  };

  const renderDiff = (text1, text2) => {
    console.log("Template text:", text1); // Debug
    console.log("Report text:", text2); // Debug

    if (!text1 || !text2) {
      console.log("Missing text:", { text1: !!text1, text2: !!text2 }); // Debug
      return null;
    }

    const differences = diff.diffWords(text1, text2);
    console.log("Differences:", differences); // Debug

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
      <div className="flex items-center space-x-3 mt-8 mb-6">
        <div className="p-3 bg-blue-500/10 rounded-lg">
          <FaFileMedical className="text-blue-400 text-2xl" />
        </div>
        <div>
          <span className="text-sm font-medium text-gray-300">{date}</span>
          <div className="text-xs text-gray-500">{time}</div>
        </div>
      </div>

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
            <FaFileMedical className="mr-2" />
            Generierter Bericht
          </h3>
          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  title="Änderungen speichern"
                  className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors duration-200 flex items-center space-x-2 text-green-400 hover:text-green-300 text-sm"
                >
                  <FaCheck />
                  <span>Fertig</span>
                </button>
                <button
                  onClick={handleCancelEdit}
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
                  onClick={handleStartEditing}
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
          {isEditing ? (
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

        {/* Diff View */}
        {report.template_text && (
          <div className="mt-6 pt-6 border-t border-gray-700/50">
            <h4 className="text-lg font-semibold text-purple-400 mb-4">
              Vergleich mit Template
            </h4>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="prose prose-invert max-w-none">
                {renderDiff(report.template_text, report.report_text)}
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
    </div>
  );
}

export default ReportCard;
