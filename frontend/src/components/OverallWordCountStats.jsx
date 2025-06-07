import React, { useState, useEffect } from "react";
import {
  FaFileAlt,
  FaMagic,
  FaChartLine,
  FaPercentage,
  FaTrophy,
  FaSync,
} from "react-icons/fa";
import {
  calculateWordMetrics,
  formatWordCount,
  calculateEfficiency,
} from "../utils/wordCount";
import { authenticatedFetch } from "../utils/auth";
import API_URL from "../utils/apiConfig";

const OverallWordCountStats = ({ reports, useApi = false }) => {
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
      totalWords: apiStats.total_words,
      generatedWords: apiStats.total_generated_words,
      savedWords: apiStats.total_saved_words,
      reportCount: apiStats.total_reports,
      averageWordsPerReport: apiStats.average_words_per_report,
      averageSavedPerReport: apiStats.average_saved_per_report,
      inputWords: 0, // Not available from API
    };
  } else if (reports && reports.length > 0) {
    // Calculate totals across all reports (fallback method)
    const totals = reports.reduce(
      (acc, report) => {
        const metrics = calculateWordMetrics(report);
        acc.totalWords += metrics.totalWords;
        acc.generatedWords += metrics.generatedWords;
        acc.savedWords += metrics.savedWords;
        acc.inputWords += metrics.inputWords;
        return acc;
      },
      { totalWords: 0, generatedWords: 0, savedWords: 0, inputWords: 0 }
    );

    const averageWordsPerReport =
      reports.length > 0 ? Math.round(totals.totalWords / reports.length) : 0;
    const averageSavedPerReport =
      reports.length > 0 ? Math.round(totals.savedWords / reports.length) : 0;

    stats = {
      totalWords: totals.totalWords,
      generatedWords: totals.generatedWords,
      savedWords: totals.savedWords,
      inputWords: totals.inputWords,
      reportCount: reports.length,
      averageWordsPerReport,
      averageSavedPerReport,
    };
  } else {
    return null; // No data available
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700/50 mb-6">
        <div className="flex items-center justify-center">
          <FaSync className="animate-spin text-2xl text-blue-400 mr-3" />
          <span className="text-gray-300">Lade Statistiken...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700/50 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-blue-400 flex items-center">
          <FaTrophy className="mr-2" />
          Gesamt-Effizienzstatistiken
        </h3>
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-400">
            {stats.reportCount} Berichte analysiert
          </div>
          {useApi && (
            <button
              onClick={fetchStatsFromApi}
              className="p-1 hover:bg-blue-500/10 rounded text-blue-400 hover:text-blue-300"
              title="Statistiken aktualisieren"
            >
              <FaSync className="text-sm" />
            </button>
          )}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Words */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-blue-500/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <FaFileAlt className="text-blue-400 text-lg" />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Gesamtwörter</p>
              <p className="text-xl font-bold text-blue-300">
                {formatWordCount(stats.totalWords)}
              </p>
              <p className="text-xs text-gray-500">
                ⌀ {formatWordCount(stats.averageWordsPerReport)}/Bericht
              </p>
            </div>
          </div>
        </div>

        {/* Generated Words */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-green-500/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <FaMagic className="text-green-400 text-lg" />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">KI-generiert</p>
              <p className="text-xl font-bold text-green-300">
                {formatWordCount(stats.generatedWords)}
              </p>
              <p className="text-xs text-gray-500">von der KI erstellt</p>
            </div>
          </div>
        </div>

        {/* Saved Words */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-purple-500/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <FaChartLine className="text-purple-400 text-lg" />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Gesparte Wörter</p>
              <p className="text-xl font-bold text-purple-300">
                {formatWordCount(stats.savedWords)}
              </p>
              <p className="text-xs text-gray-500">
                ⌀ {formatWordCount(stats.averageSavedPerReport)}/Bericht
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-700/50">
        {stats.inputWords > 0 && (
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-300">
              {formatWordCount(stats.inputWords)}
            </p>
            <p className="text-xs text-gray-400">Eingabewörter insgesamt</p>
          </div>
        )}
        <div className="text-center">
          <p className="text-2xl font-bold text-green-300">
            {stats.totalWords > 0
              ? Math.round((stats.generatedWords / stats.totalWords) * 100)
              : 0}
            %
          </p>
          <p className="text-xs text-gray-400">KI-Generierungsrate</p>
        </div>
      </div>
    </div>
  );
};

export default OverallWordCountStats;
