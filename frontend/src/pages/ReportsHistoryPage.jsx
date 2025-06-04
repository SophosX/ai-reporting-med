import React, { useEffect, useState } from "react";
import { FaSync, FaFileMedical } from "react-icons/fa";
import { toast } from "react-toastify";
import { authenticatedFetch } from "../utils/auth";
import ReportCard from "../components/ReportCard";
import API_URL from "../utils/apiConfig";

function ReportsHistoryPage() {
  const [reports, setReports] = useState([]);
  const [totalReports, setTotalReports] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch reports count
      const countResponse = await authenticatedFetch(
        `${API_URL}/reports/stats/count`
      );

      if (!countResponse.ok) {
        throw new Error("Failed to fetch reports count");
      }

      const countData = await countResponse.json();
      setTotalReports(countData.total);

      // Fetch all reports
      const response = await authenticatedFetch(`${API_URL}/reports/`);

      if (!response.ok) {
        throw new Error("Failed to fetch reports");
      }

      const data = await response.json();
      setReports(data);
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError(err.message);
      toast.error("Fehler beim Laden der Berichte");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDelete = (reportId) => {
    // Remove the deleted report from state
    setReports(reports.filter((r) => r.id !== reportId));
  };

  const handleUpdate = (updatedReport) => {
    // Update the report in state
    setReports(
      reports.map((r) => (r.id === updatedReport.id ? updatedReport : r))
    );
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 text-white text-center">
        <FaSync className="animate-spin text-3xl mx-auto mb-4" />
        <p>Lade Berichte...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 text-white">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-blue-400">Berichtshistorie</h2>

        {/* Total Reports Display */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-700">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-blue-500 bg-opacity-25 w-10 h-10 flex items-center justify-center">
              <FaFileMedical className="text-lg text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-xs text-gray-400">Gesamtberichte</p>
              {error ? (
                <p className="text-red-400 text-sm">Fehler beim Laden</p>
              ) : (
                <p className="text-xl font-semibold">{totalReports}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
          <p>{error}</p>
        </div>
      )}

      {reports.length === 0 && !error && (
        <p className="text-gray-400">Noch keine Berichte gespeichert.</p>
      )}

      <div className="space-y-8">
        {reports.map((report) => (
          <ReportCard
            key={report.id}
            report={report}
            isDetailView={false}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
          />
        ))}
      </div>
    </div>
  );
}

export default ReportsHistoryPage;
