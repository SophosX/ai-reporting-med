import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaSync, FaArrowLeft, FaEye, FaEyeSlash, FaCheckCircle } from "react-icons/fa";
import { toast } from "react-toastify";
import { authenticatedFetch } from "../utils/auth";
import ReportCard from "../components/ReportCard";
import API_URL from "../utils/apiConfig";
import * as diff from 'diff';
import { useStudy } from "../context/StudyContext";
import StudyTimerBar from "../components/StudyTimerBar";

function ReportDetailPage() {
  const { reportId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDiff, setShowDiff] = useState(false);
  const [templateText, setTemplateText] = useState("");
  const navigate = useNavigate();
  
  const {
    isStudyMode,
    studySessionId,
    studyTimerData,
    setStudyTimerData,
    generatedReportId,
    firstGenerationTime,
    editOperations,
    originalGeneratedText,
  } = useStudy();

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

  // Handler für Study Session Abschluss
  const handleFinalizeStudySession = async () => {
    const confirmFinalize = window.confirm(
      "Möchten Sie die Studiensitzung wirklich abschließen?"
    );
    
    if (!confirmFinalize) return;
    
    try {
      const endTime = new Date();
      const totalDuration = Math.floor(
        (endTime - new Date(studyTimerData.startTime)) / 1000
      );
      const editingDuration = firstGenerationTime
        ? Math.floor((endTime - firstGenerationTime) / 1000)
        : 0;

      // Calculate word counts
      const finalWordCount = report.report_text.trim().split(/\s+/).length;

      const response = await authenticatedFetch(
        `${API_URL}/study/study-session/${studySessionId}/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            report_id: parseInt(reportId),
            total_duration: totalDuration,
            editing_duration: editingDuration,
            pause_count: studyTimerData.pauseCount || 0,
            total_pause_seconds: studyTimerData.totalPauseTime || 0,
            edit_operations: editOperations,
            input_words: report.input_word_count || 0,
            generated_words: report.generated_word_count || 0,
            final_words: finalWordCount,
            template_used: report.template_id || null,
          }),
        }
      );

      if (response.ok) {
        toast.success("Studiensitzung erfolgreich abgeschlossen!");
        navigate("/");
      } else {
        throw new Error("Fehler beim Abschließen der Studiensitzung");
      }
    } catch (error) {
      console.error("Error completing study session:", error);
      toast.error("Fehler beim Abschließen der Studiensitzung");
    }
  };


  const handleStudySessionCancel = async () => {
    const confirmCancel = window.confirm(
      "Sind Sie sicher, dass Sie die Studiensitzung abbrechen möchten? Alle Timer-Daten gehen verloren."
    );
    
    if (confirmCancel) {
      toast.info("Studiensitzung abgebrochen.");
      navigate("/");
    }
  };

  return (
    <>
      {/* Study Timer Bar - appears at top when in study mode */}
      {isStudyMode && studySessionId && (
        <StudyTimerBar 
          onSessionStart={() => {}}
          studySessionId={studySessionId}
          onTimerData={setStudyTimerData}
          onCancel={handleStudySessionCancel}
          initialTimerData={studyTimerData}
        />
      )}
      
      <div className={`max-w-5xl mx-auto px-4 py-8 text-white ${isStudyMode && studySessionId ? 'pt-20' : ''}`}>
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handleGoBack}
          className="flex items-center space-x-2 text-blue-400 hover:text-blue-300"
        >
          <FaArrowLeft />
          <span>Zurück zu den Berichten</span>
        </button>
        <div className="flex items-center gap-4">
          {templateText && (
            <button
              onClick={() => setShowDiff(!showDiff)}
              className="flex items-center space-x-2 bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-lg transition-colors duration-200"
            >
              {showDiff ? <FaEyeSlash /> : <FaEye />}
              <span>{showDiff ? "Differenz ausblenden" : "Differenz anzeigen"}</span>
            </button>
          )}
          {/* Study Mode Finalize Button */}
          {isStudyMode && studySessionId && (
            <button
              onClick={handleFinalizeStudySession}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 font-medium"
              title="Studie abschließen"
            >
              <FaCheckCircle />
              <span>Studie abschließen</span>
            </button>
          )}
        </div>
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
    </>
  );
}

export default ReportDetailPage;
