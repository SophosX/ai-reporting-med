import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaSync, FaArrowLeft } from "react-icons/fa";
import { toast } from "react-toastify";
import { authenticatedFetch } from "../utils/auth";
import ReportCard from "../components/ReportCard";
import API_URL from "../utils/apiConfig";

function ReportDetailPage() {
  const { reportId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
      <button
        onClick={handleGoBack}
        className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 mb-6"
      >
        <FaArrowLeft />
        <span>Zurück zu den Berichten</span>
      </button>

      <h2 className="text-3xl font-bold text-blue-400 mb-6">
        Bericht #{reportId}
      </h2>

      {report ? (
        <ReportCard
          report={report}
          isDetailView={true}
          onUpdate={handleReportUpdate}
        />
      ) : (
        <div className="bg-gray-800 rounded-xl p-6">
          <p>Bericht nicht gefunden</p>
        </div>
      )}
    </div>
  );
}

export default ReportDetailPage;
