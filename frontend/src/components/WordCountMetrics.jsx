import React from "react";
import { FaChartLine } from "react-icons/fa";
import { calculateWordMetrics, formatWordCount } from "../utils/wordCount";

const WordCountMetrics = ({ report, showLabels = true, compact = false }) => {
  const metrics = calculateWordMetrics(report);

  if (compact) {
    return (
      <div className="flex items-center space-x-4 text-xs">
        <div className="flex items-center space-x-1 text-gray-400">
          <FaChartLine className="text-blue-400" />
          <span>{formatWordCount(metrics.totalWords)}</span>
        </div>
        <div className="flex items-center space-x-1 text-gray-400">
          <FaChartLine className="text-green-400" />
          <span>{formatWordCount(metrics.generatedWords)}</span>
        </div>
        <div className="flex items-center space-x-1 text-gray-400">
          <FaChartLine className="text-purple-400" />
          <span>{formatWordCount(metrics.savedWords)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
      {/* Total Written Words */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <FaChartLine className="text-blue-400 text-sm" />
        </div>
        <div>
          {showLabels && (
            <p className="text-xs text-gray-400 mb-1">Gesamtwörter</p>
          )}
          <p className="text-lg font-semibold text-blue-300">
            {formatWordCount(metrics.totalWords)}
          </p>
          {showLabels && (
            <p className="text-xs text-gray-500">im fertigen Bericht</p>
          )}
        </div>
      </div>

      {/* Generated Words */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-green-500/20 rounded-lg">
          <FaChartLine className="text-green-400 text-sm" />
        </div>
        <div>
          {showLabels && (
            <p className="text-xs text-gray-400 mb-1">KI-generiert</p>
          )}
          <p className="text-lg font-semibold text-green-300">
            {formatWordCount(metrics.generatedWords)}
          </p>
          {showLabels && (
            <p className="text-xs text-gray-500">von der KI erstellt</p>
          )}
        </div>
      </div>

      {/* Saved Words */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <FaChartLine className="text-purple-400 text-sm" />
        </div>
        <div>
          {showLabels && (
            <p className="text-xs text-gray-400 mb-1">Manuell hinzugefügt</p>
          )}
          <p className="text-lg font-semibold text-purple-300">
            {formatWordCount(metrics.savedWords)}
          </p>
          {showLabels && (
            <p className="text-xs text-gray-500">vom Benutzer geschrieben</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WordCountMetrics;
