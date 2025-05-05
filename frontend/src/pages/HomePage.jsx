import React, { useState, useEffect } from "react";
import {
  FaClock,
  FaArrowRight,
  FaFileMedical,
  FaPlus,
  FaHistory,
} from "react-icons/fa";
import { authenticatedFetch } from "../utils/auth";
import { toast } from "react-toastify";
import API_URL from "../utils/apiConfig";

function HomePage() {
  const [totalReports, setTotalReports] = useState(0);
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
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

        // Fetch recent reports
        const recentResponse = await authenticatedFetch(
          `${API_URL}/reports/recent`
        );

        if (!recentResponse.ok) {
          throw new Error("Failed to fetch recent reports");
        }

        const recentData = await recentResponse.json();
        setRecentReports(recentData);
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

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-white">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Reports */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-500 bg-opacity-25 w-14 h-14 flex items-center justify-center">
              <FaFileMedical className="text-2xl text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-400">Total Reports</p>
              {loading ? (
                <p className="text-2xl font-semibold">Loading...</p>
              ) : error ? (
                <p className="text-red-400 text-sm">Error loading count</p>
              ) : (
                <p className="text-2xl font-semibold">{totalReports}</p>
              )}
            </div>
          </div>
        </div>

        {/* Create New Report */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
          <a
            href="/reports/new"
            className="flex items-center justify-between hover:bg-gray-700 p-2 rounded transition duration-200"
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-500 bg-opacity-25 w-14 h-14 flex items-center justify-center">
                <FaPlus className="text-2xl text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-lg font-semibold">Create New Report</p>
                <p className="text-sm text-gray-400">
                  Generate a new medical report
                </p>
              </div>
            </div>
            <FaArrowRight className="text-gray-400" />
          </a>
        </div>

        {/* View All Reports */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
          <a
            href="/reports/history"
            className="flex items-center justify-between hover:bg-gray-700 p-2 rounded transition duration-200"
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-500 bg-opacity-25 w-14 h-14 flex items-center justify-center">
                <FaHistory className="text-2xl text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-lg font-semibold">View All Reports</p>
                <p className="text-sm text-gray-400">
                  Access your report history
                </p>
              </div>
            </div>
            <FaArrowRight className="text-gray-400" />
          </a>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="bg-gray-800 rounded-xl shadow-lg">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-3">
              <FaClock className="text-2xl text-blue-400" />
              <h2 className="text-2xl font-bold text-blue-400">
                Recent Reports
              </h2>
            </div>
            {totalReports > 3 && (
              <a
                href="/reports/history"
                className="text-blue-400 hover:text-blue-300 transition-colors duration-200 flex items-center space-x-2"
              >
                <span>View all reports</span>
                <FaArrowRight />
              </a>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-400">Loading reports...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400">Error loading reports</p>
            </div>
          ) : recentReports.length === 0 ? (
            <div className="text-center py-12">
              <FaFileMedical className="text-5xl text-gray-600 mb-4 mx-auto" />
              <p className="text-gray-400 mb-6">
                No reports yet. Create your first report!
              </p>
              <a
                href="/reports/new"
                className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-all duration-200"
              >
                <FaPlus />
                <span>Create Report</span>
              </a>
            </div>
          ) : (
            <div className="space-y-6">
              {recentReports.map((report) => (
                <a
                  key={report.id}
                  href={`/reports/${report.id}`}
                  className="block bg-gray-700 hover:bg-gray-600 rounded-lg p-4 transition duration-200"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-white text-lg mb-1">
                        Report #{report.id}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        Created: {formatDate(report.created_at)}
                      </p>
                    </div>
                    <div className="text-blue-400">
                      <FaArrowRight />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-gray-300 line-clamp-2">
                      {report.input_text.substring(0, 100)}...
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HomePage;
