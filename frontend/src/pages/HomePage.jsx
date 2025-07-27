import React, { useState, useEffect } from "react";
import {
  FaClock,
  FaArrowRight,
  FaPlus,
  FaHistory,
  FaClipboardList,
  FaFlask,
  FaToggleOn,
  FaToggleOff,
  FaInfoCircle,
} from "react-icons/fa";
import { authenticatedFetch, getCurrentUser } from "../utils/auth";
import { toast } from "react-toastify";
import API_URL from "../utils/apiConfig";
import ReportsChart from "../components/ReportsChart";
import OverallWordCountStats from "../components/OverallWordCountStats";

function HomePage() {
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studyStatus, setStudyStatus] = useState({
    study_participant: false,
    study_mode_active: false,
    experience_level: null,
    full_name: null,
  });
  const [isTogglingStudyMode, setIsTogglingStudyMode] = useState(false);
  const [showStudyInfo, setShowStudyInfo] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch recent reports
        const recentResponse = await authenticatedFetch(
          `${API_URL}/reports/recent`
        );

        if (!recentResponse.ok) {
          throw new Error("Failed to fetch recent reports");
        }

        const recentData = await recentResponse.json();
        setRecentReports(recentData);

        // Fetch study status if user is logged in
        const user = getCurrentUser();
        if (user) {
          const studyResponse = await authenticatedFetch(
            `${API_URL}/study/study-mode/status`
          );
          
          if (studyResponse.ok) {
            const studyData = await studyResponse.json();
            setStudyStatus(studyData);
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
        // Don't display the error if it's related to authentication
        // as the ProtectedRoute will handle redirecting
        if (!err.message.includes("Session expired")) {
          toast.error(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Toggle study mode
  const handleToggleStudyMode = async () => {
    setIsTogglingStudyMode(true);
    try {
      const response = await authenticatedFetch(
        `${API_URL}/study/study-mode/toggle`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            study_mode_active: !studyStatus.study_mode_active,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to toggle study mode");
      }

      const data = await response.json();
      setStudyStatus({
        ...studyStatus,
        study_mode_active: data.study_mode_active,
      });
      
      toast.success(data.message);
    } catch (err) {
      console.error("Error toggling study mode:", err);
      toast.error("Failed to toggle study mode");
    } finally {
      setIsTogglingStudyMode(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("de-DE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Study Mode Toggle */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          
          {/* Study Mode Toggle - Only show for study participants */}
          {studyStatus.study_participant && (
            <div className="flex items-center gap-4">
              <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <FaFlask className="text-purple-400" />
                    <span className="text-sm font-medium">Studienmodus</span>
                  </div>
                  
                  <button
                    onClick={handleToggleStudyMode}
                    disabled={isTogglingStudyMode}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                      studyStatus.study_mode_active
                        ? "bg-purple-600 hover:bg-purple-700"
                        : "bg-gray-600 hover:bg-gray-700"
                    } ${isTogglingStudyMode ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {studyStatus.study_mode_active ? (
                      <>
                        <FaToggleOn className="text-xl" />
                        <span>Aktiv</span>
                      </>
                    ) : (
                      <>
                        <FaToggleOff className="text-xl" />
                        <span>Inaktiv</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => setShowStudyInfo(!showStudyInfo)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <FaInfoCircle />
                  </button>
                </div>
                
                {/* Study Info Dropdown */}
                {showStudyInfo && (
                  <div className="mt-4 p-3 bg-gray-700 rounded-md text-sm">
                    <p className="mb-2">
                      <strong>Teilnehmer:</strong> {studyStatus.full_name}
                    </p>
                    <p className="mb-2">
                      <strong>Erfahrung:</strong> {studyStatus.experience_level === "assistenzarzt" ? "Assistenzarzt" : studyStatus.experience_level === "facharzt" ? "Facharzt" : studyStatus.experience_level === "oberarzt" ? "Oberarzt" : studyStatus.experience_level}
                    </p>
                    <p className="text-gray-300">
                      Wenn der Studienmodus aktiv ist, werden alle von Ihnen erstellten Berichte 
                      für Zeitmetriken und Effizienzanalysen erfasst.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Study Mode Banner */}
        {studyStatus.study_mode_active && (
          <div className="mb-6 p-4 bg-purple-900/30 border border-purple-700 rounded-lg">
            <div className="flex items-center gap-3">
              <FaFlask className="text-purple-400 text-xl" />
              <div>
                <h3 className="font-semibold text-purple-200">Studienmodus Aktiv</h3>
                <p className="text-sm text-purple-300">
                  Ihre Berichterstellungszeiten und Effizienzmetriken werden für die radiologische Effizienzstudie aufgezeichnet.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Create New Report Card */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <FaPlus className="text-3xl text-blue-500 mr-3" />
              <h2 className="text-xl font-semibold">Create New Report</h2>
            </div>
            <p className="text-gray-400 mb-4">
              Erstellen Sie einen neuen medizinischen Bericht mit KI-Unterstützung
              {studyStatus.study_mode_active && (
                <span className="block text-purple-400 text-sm mt-1">
                  Studienmetriken werden erfasst
                </span>
              )}
            </p>
            <a
              href="/reports/new"
              className="inline-flex items-center text-blue-400 hover:text-blue-300 font-medium"
            >
              Jetzt starten <FaArrowRight className="ml-2" />
            </a>
          </div>

          {/* View All Reports Card */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <FaHistory className="text-3xl text-green-500 mr-3" />
              <h2 className="text-xl font-semibold">Report History</h2>
            </div>
            <p className="text-gray-400 mb-4">
              View and manage all your previously created reports
            </p>
            <a
              href="/reports"
              className="inline-flex items-center text-green-400 hover:text-green-300 font-medium"
            >
              View Reports <FaArrowRight className="ml-2" />
            </a>
          </div>

          {/* Templates Card */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <FaClipboardList className="text-3xl text-purple-500 mr-3" />
              <h2 className="text-xl font-semibold">Templates</h2>
            </div>
            <p className="text-gray-400 mb-4">
              Browse and manage your report templates
            </p>
            <a
              href="/templates"
              className="inline-flex items-center text-purple-400 hover:text-purple-300 font-medium"
            >
              Manage Templates <FaArrowRight className="ml-2" />
            </a>
          </div>
        </div>

        {/* Statistics Overview */}
        <div className="mb-8">
          <OverallWordCountStats />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Reports Chart */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Reports Activity</h2>
            <ReportsChart />
          </div>

          {/* Recent Reports */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Recent Reports</h2>
            {loading ? (
              <p className="text-gray-400">Loading recent reports...</p>
            ) : error ? (
              <p className="text-red-400">Error loading reports: {error}</p>
            ) : recentReports.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">No reports created yet</p>
                <a
                  href="/reports/new"
                  className="inline-flex items-center text-blue-400 hover:text-blue-300 font-medium"
                >
                  Ersten Bericht erstellen <FaArrowRight className="ml-2" />
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {recentReports.map((report) => (
                  <a
                    key={report.id}
                    href={`/reports/${report.id}`}
                    className="block p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-white line-clamp-1">
                          {report.input_text.substring(0, 50)}...
                        </h3>
                        <p className="text-sm text-gray-400 mt-1 flex items-center">
                          <FaClock className="mr-1" />
                          {formatDate(report.created_at)}
                        </p>
                      </div>
                      <span className="text-sm text-gray-500">
                        #{report.id}
                      </span>
                    </div>
                  </a>
                ))}
                <div className="text-center pt-4">
                  <a
                    href="/reports"
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    View All Reports →
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;