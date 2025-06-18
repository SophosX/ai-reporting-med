import React, { useEffect, useState } from "react";
import {
  FaSync,
  FaChevronDown,
  FaChevronUp,
  FaExpandArrowsAlt,
  FaCompressArrowsAlt,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { authenticatedFetch } from "../utils/auth";
import ReportCard from "../components/ReportCard";
import WordCountMetrics from "../components/WordCountMetrics";
import API_URL from "../utils/apiConfig";

function ReportsHistoryPage() {
  const [reports, setReports] = useState([]);
  const [totalReports, setTotalReports] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedReports, setExpandedReports] = useState(new Set());

  // Function to toggle report expansion
  const toggleReportExpansion = (reportId) => {
    const newExpanded = new Set(expandedReports);
    if (newExpanded.has(reportId)) {
      newExpanded.delete(reportId);
    } else {
      newExpanded.add(reportId);
    }
    setExpandedReports(newExpanded);
  };

  // Function to expand all reports
  const expandAllReports = () => {
    const allReportIds = reports.map((r) => r.id);
    setExpandedReports(new Set(allReportIds));
  };

  // Function to collapse all reports
  const collapseAllReports = () => {
    setExpandedReports(new Set());
  };

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
    // Also remove from expanded set
    const newExpanded = new Set(expandedReports);
    newExpanded.delete(reportId);
    setExpandedReports(newExpanded);
  };

  const handleUpdate = (updatedReport) => {
    // Update the report in state
    setReports(
      reports.map((r) => (r.id === updatedReport.id ? updatedReport : r))
    );
  };

  const formatDate = (isoString) => {
    if (!isoString) return { date: "Invalid Date", time: "" };
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
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

      {/* Expand/Collapse Controls */}
      {reports.length > 0 && (
        <div className="flex justify-between items-center mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <div className="text-sm text-gray-300">
            <span className="font-medium">{reports.length}</span> Berichte
            verfügbar
            {expandedReports.size > 0 && (
              <span className="ml-2">({expandedReports.size} erweitert)</span>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={expandAllReports}
              className="text-sm px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-colors duration-200 flex items-center space-x-1"
            >
              <FaExpandArrowsAlt className="text-xs" />
              <span>Alle erweitern</span>
            </button>
            <button
              onClick={collapseAllReports}
              className="text-sm px-3 py-1 bg-gray-600/20 hover:bg-gray-600/30 text-gray-300 rounded-lg transition-colors duration-200 flex items-center space-x-1"
            >
              <FaCompressArrowsAlt className="text-xs" />
              <span>Alle zuklappen</span>
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
          <p>{error}</p>
        </div>
      )}

      {reports.length === 0 && !error && (
        <p className="text-gray-400">Noch keine Berichte gespeichert.</p>
      )}

      <div className="space-y-6">
        {reports.map((report) => {
          const isExpanded = expandedReports.has(report.id);
          const { date, time } = formatDate(report?.created_at);

          return (
            <div key={report.id}>
              {isExpanded ? (
                <div className="relative">
                  {/* Collapse button for expanded view */}
                  <button
                    onClick={() => toggleReportExpansion(report.id)}
                    className="absolute top-2 right-2 z-10 p-2 bg-gray-700/80 hover:bg-gray-600/80 rounded-lg transition-colors duration-200 text-gray-300 hover:text-white"
                    title="Bericht zuklappen"
                  >
                    <FaChevronUp className="text-sm" />
                  </button>
                  <ReportCard
                    report={report}
                    isDetailView={false}
                    onDelete={handleDelete}
                    onUpdate={handleUpdate}
                  />
                </div>
              ) : (
                <div
                  className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 rounded-xl p-4 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer"
                  onClick={() => toggleReportExpansion(report.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-blue-400">
                          Bericht #{report.id}
                        </h3>
                        <FaChevronDown className="text-gray-400 text-sm" />
                      </div>

                      <div className="mb-3">
                        <div>
                          <span className="text-sm font-medium text-gray-300">
                            {date}
                          </span>
                          <div className="text-xs text-gray-500">{time}</div>
                        </div>
                      </div>

                      {/* Word Count Metrics - Compact View */}
                      <div className="mb-3">
                        <WordCountMetrics
                          report={report}
                          compact={true}
                          showLabels={false}
                        />
                      </div>

                      {/* Preview of input text */}
                      <div className="text-sm text-gray-400 mb-2">
                        <span className="font-medium text-gray-300">
                          Eingabe:
                        </span>{" "}
                        {report.input_text?.substring(0, 100)}
                        {report.input_text?.length > 100 && "..."}
                      </div>

                      {/* Preview of report text */}
                      <div className="text-sm text-gray-400">
                        <span className="font-medium text-gray-300">
                          Bericht:
                        </span>{" "}
                        {report.report_text
                          ?.replace(/[#*_`]/g, "")
                          .substring(0, 120)}
                        {report.report_text?.length > 120 && "..."}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <span className="inline-block w-2 h-2 bg-green-400 rounded-full"></span>
                      <span className="text-xs text-gray-400">Generiert</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ReportsHistoryPage;
