/**
 * @fileoverview WordCountMetrics-Komponente - Visualisierung von Wort-Effizienz-Metriken.
 *
 * Diese Komponente zeigt die Wortzahl-Statistiken eines einzelnen Berichts,
 * um die Effizienz der KI-gestützten Berichterstellung zu demonstrieren.
 *
 * Angezeigte Metriken:
 * - Eingabewörter: Vom Radiologen eingegebene Stichpunkte
 * - KI-generiert: Von der KI erzeugter Befundtext
 * - Finaler Bericht: Text nach manueller Bearbeitung
 * - Gesparte Wörter: Differenz zwischen Eingabe und finalem Text
 *
 * Display-Modi:
 * - compact: Einzeilige Icon-Darstellung mit Tooltips
 * - normal: Vierspaltiges Grid mit Labels und Erklärungen
 * - detailed: Mit Effizienz-Insights und Berechnungsformeln
 */

import React from "react";
import {
  FaChartLine,
  FaKeyboard,
  FaRobot,
  FaEdit,
  FaTrophy,
} from "react-icons/fa";
import {
  calculateWordMetrics,
  formatWordCount,
  getWordCountDescriptions,
  getEfficiencyColor,
} from "../utils/wordCount";

/**
 * Komponente zur Visualisierung von Wort-Effizienz-Metriken eines Berichts.
 *
 * Berechnet und zeigt Wortzahl-Statistiken basierend auf den Report-Feldern:
 * - input_word_count: Wörter im Eingabetext
 * - generated_word_count: Wörter im KI-generierten Text
 * - word_count: Wörter im finalen (ggf. bearbeiteten) Bericht
 *
 * @param {Object} props - Komponenten-Props
 * @param {Object} props.report - Das Bericht-Objekt mit Wortzahl-Feldern
 * @param {number} props.report.input_word_count - Wörter im Eingabetext
 * @param {number} props.report.generated_word_count - Wörter im KI-Text
 * @param {number} props.report.word_count - Wörter im finalen Bericht
 * @param {boolean} [props.showLabels=true] - Zeigt Beschriftungen unter den Werten
 * @param {boolean} [props.compact=false] - Kompakte einzeilige Darstellung
 * @param {boolean} [props.showDescriptions=false] - Zeigt detaillierte Insights
 * @returns {JSX.Element} Die gerenderten Metriken
 *
 * @example
 * // Normale Darstellung in ReportCard
 * <WordCountMetrics report={report} showLabels={true} />
 *
 * @example
 * // Kompakte Darstellung in Listen
 * <WordCountMetrics report={report} compact={true} />
 *
 * @example
 * // Detailansicht mit Effizienz-Insights
 * <WordCountMetrics report={report} showDescriptions={true} />
 */
const WordCountMetrics = ({
  report,
  showLabels = true,
  compact = false,
  showDescriptions = false,
}) => {
  const metrics = calculateWordMetrics(report);
  const descriptions = getWordCountDescriptions(metrics);

  if (compact) {
    return (
      <div className="flex items-center space-x-4 text-xs">
        <div
          className="flex items-center space-x-1 text-gray-400"
          title={`Input: ${metrics.inputWords} words`}
        >
          <FaKeyboard className="text-blue-400" />
          <span>{formatWordCount(metrics.inputWords)}</span>
        </div>
        <div
          className="flex items-center space-x-1 text-gray-400"
          title={`AI Generated: ${metrics.aiGeneratedWords} words`}
        >
          <FaRobot className="text-green-400" />
          <span>{formatWordCount(metrics.aiGeneratedWords)}</span>
        </div>
        <div
          className="flex items-center space-x-1 text-gray-400"
          title={`Final: ${metrics.finalWords} words`}
        >
          <FaEdit className="text-purple-400" />
          <span>{formatWordCount(metrics.finalWords)}</span>
        </div>
        <div
          className="flex items-center space-x-1 text-gray-400"
          title={`Saved: ${metrics.savedWords} words`}
        >
          <FaTrophy className="text-yellow-400" />
          <span>{formatWordCount(metrics.savedWords)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
        {/* User Input Words */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <FaKeyboard className="text-blue-400 text-sm" />
          </div>
          <div>
            {showLabels && (
              <p className="text-xs text-gray-400 mb-1">Eingabe</p>
            )}
            <p className="text-lg font-semibold text-blue-300">
              {formatWordCount(metrics.inputWords)}
            </p>
            {showLabels && (
              <p className="text-xs text-gray-500">vom Arzt eingegeben</p>
            )}
          </div>
        </div>

        {/* AI Generated Words */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <FaRobot className="text-green-400 text-sm" />
          </div>
          <div>
            {showLabels && (
              <p className="text-xs text-gray-400 mb-1">KI-generiert</p>
            )}
            <p className="text-lg font-semibold text-green-300">
              {formatWordCount(metrics.aiGeneratedWords)}
            </p>
            {showLabels && (
              <p className="text-xs text-gray-500">von der KI erstellt</p>
            )}
          </div>
        </div>

        {/* Final Report Words */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <FaEdit className="text-purple-400 text-sm" />
          </div>
          <div>
            {showLabels && (
              <p className="text-xs text-gray-400 mb-1">Finaler Bericht</p>
            )}
            <p className="text-lg font-semibold text-purple-300">
              {formatWordCount(metrics.finalWords)}
            </p>
            {showLabels && (
              <p className="text-xs text-gray-500">nach Bearbeitung</p>
            )}
          </div>
        </div>

        {/* Saved Words & Efficiency */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-yellow-500/20 rounded-lg">
            <FaTrophy className="text-yellow-400 text-sm" />
          </div>
          <div>
            {showLabels && (
              <p className="text-xs text-gray-400 mb-1">Gesparte Wörter</p>
            )}
            <p className="text-lg font-semibold text-yellow-300">
              {formatWordCount(metrics.savedWords)}
            </p>
            {showLabels && (
              <p className="text-xs text-gray-500">eingesparte Arbeit</p>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Insights */}
      {showDescriptions && (
        <div className="bg-gray-800/20 rounded-lg p-4 border border-gray-700/30">
          <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center">
            <FaChartLine className="mr-2" />
            Effizienz-Insights
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-green-300 font-medium">
                {descriptions.savedWordsText}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Finale Wörter ({metrics.finalWords}) - Eingabe (
                {metrics.inputWords})
              </p>
            </div>
            <div>
              <p
                className={`font-medium ${
                  metrics.editDelta >= 0 ? "text-blue-300" : "text-orange-300"
                }`}
              >
                {descriptions.editDeltaText}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Finale ({metrics.finalWords}) - KI ({metrics.aiGeneratedWords})
                = {metrics.editDelta > 0 ? "+" : ""}
                {metrics.editDelta}
              </p>
            </div>
            <div>
              <p className="text-purple-300 font-medium">
                {descriptions.initialSavingsText}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                KI ({metrics.aiGeneratedWords}) - Eingabe ({metrics.inputWords})
              </p>
            </div>
            <div>
              <p className="text-yellow-300 font-medium">
                Signifikante Zeitersparnis durch KI-Unterstützung
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Automatisierte Berichtsgenerierung reduziert manuellen Aufwand
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WordCountMetrics;
