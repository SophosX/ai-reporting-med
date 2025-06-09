import React, { useState, useEffect } from "react";
import {
  FaKeyboard,
  FaRobot,
  FaEdit,
  FaTrophy,
  FaChartLine,
  FaPercent,
  FaSync,
  FaClock,
  FaBolt,
} from "react-icons/fa";
import {
  calculateWordMetrics,
  formatWordCount,
  calculateAggregateStats,
  getEfficiencyColor,
} from "../utils/wordCount";
import { authenticatedFetch } from "../utils/auth";
import API_URL from "../utils/apiConfig";

const OverallWordCountStats = ({
  reports,
  useApi = false,
  showTimeframe = false,
}) => {
  const [apiStats, setApiStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch stats from API if useApi is true
  useEffect(() => {
    if (useApi) {
      fetchStatsFromApi();
    }
  }, [useApi]);

  const fetchStatsFromApi = async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch(
        `${API_URL}/reports/stats/word-counts`
      );
      if (response.ok) {
        const data = await response.json();
        setApiStats(data);
      }
    } catch (error) {
      console.error("Error fetching word count stats:", error);
    } finally {
      setLoading(false);
    }
  };

  // Use API stats if available, otherwise calculate from reports array
  let stats;
  if (useApi && apiStats) {
    stats = {
      totalReports: apiStats.total_reports,
      totalInputWords: apiStats.total_input_words,
      totalAiGeneratedWords: apiStats.total_generated_words,
      totalFinalWords: apiStats.total_words,
      totalSavedWords: apiStats.total_saved_words,
      totalSavedWordsInitial: apiStats.total_saved_words_initial,
      totalEditDelta: apiStats.total_edit_delta,
      averageInputWords: apiStats.average_input_per_report,
      averageSavedWords: apiStats.average_saved_per_report,
      averageWordsPerReport: apiStats.average_words_per_report,
      averageEditDelta: apiStats.average_edit_delta || 0,
    };
  } else if (reports && reports.length > 0) {
    // Calculate from reports array (fallback method)
    stats = calculateAggregateStats(reports);
  } else {
    return null; // No data available
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700/50">
        <div className="flex items-center justify-center py-8">
          <FaSync className="animate-spin text-2xl text-blue-400 mr-3" />
          <span className="text-gray-300">Lade Statistiken...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <FaChartLine className="text-blue-400 text-xl" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              Wort-Effizienz Dashboard
            </h3>
            <p className="text-sm text-gray-400">
              {stats.totalReports} Berichte analysiert
              {showTimeframe && " • Diese Woche"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-yellow-300">
            {formatWordCount(stats.totalSavedWords)}
          </p>
          <p className="text-xs text-gray-400">Gesparte Wörter</p>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Input Words */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-blue-500/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <FaKeyboard className="text-blue-400 text-lg" />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Eingabe gesamt</p>
              <p className="text-xl font-bold text-blue-300">
                {formatWordCount(stats.totalInputWords)}
              </p>
              <p className="text-xs text-gray-500">
                ⌀ {formatWordCount(stats.averageInputWords)}/Bericht
              </p>
            </div>
          </div>
        </div>

        {/* Total AI Generated */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-green-500/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <FaRobot className="text-green-400 text-lg" />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">KI-generiert</p>
              <p className="text-xl font-bold text-green-300">
                {formatWordCount(stats.totalAiGeneratedWords)}
              </p>
              <p className="text-xs text-gray-500">von der KI erstellt</p>
            </div>
          </div>
        </div>

        {/* Total Final Words */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-purple-500/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <FaEdit className="text-purple-400 text-lg" />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Finale Berichte</p>
              <p className="text-xl font-bold text-purple-300">
                {formatWordCount(stats.totalFinalWords)}
              </p>
              <p className="text-xs text-gray-500">
                ⌀ {formatWordCount(stats.averageWordsPerReport)}/Bericht
              </p>
            </div>
          </div>
        </div>

        {/* Total Saved Words */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-yellow-500/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <FaTrophy className="text-yellow-400 text-lg" />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Gesparte Wörter</p>
              <p className="text-xl font-bold text-yellow-300">
                {formatWordCount(stats.totalSavedWords)}
              </p>
              <p className="text-xs text-gray-500">
                ⌀ {formatWordCount(stats.averageSavedWords)}/Bericht
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverallWordCountStats;
