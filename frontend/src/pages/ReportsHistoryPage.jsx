import React, { useEffect, useState } from "react";
import { FaSync } from "react-icons/fa";
import { toast } from "react-toastify";
import { authenticatedFetch } from "../utils/auth";
import ReportCard from "../components/ReportCard";
import API_URL from "../utils/apiConfig";

function ReportsHistoryPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch(`${API_URL}/reports/`);

      if (!response.ok) {
        throw new Error("Failed to fetch reports");
      }

      const data = await response.json();
      setReports(data);
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError(err.message);
      toast.error("Error loading reports");
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
        <p>Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 text-white">
      <h2 className="text-3xl font-bold text-blue-400 mb-6">Report History</h2>

      {error && (
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
          <p>{error}</p>
        </div>
      )}

      {reports.length === 0 && !error && (
        <p className="text-gray-400">No reports saved yet.</p>
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
