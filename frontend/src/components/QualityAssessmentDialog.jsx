/**
 * @fileoverview QualityAssessmentDialog-Komponente - Selbstbewertung für Studien.
 *
 * Diese Komponente zeigt einen Dialog zur Qualitätsbewertung nach
 * Abschluss einer Studien-Session. Der Benutzer bewertet die Qualität
 * des generierten Berichts auf einer 5-Sterne-Skala.
 *
 * Bewertungsskala:
 * 1 Stern: Sehr schlecht - Viele Fehler, unvollständig
 * 2 Sterne: Schlecht - Einige wesentliche Fehler
 * 3 Sterne: Mittelmäßig - Akzeptabel mit kleinen Fehlern
 * 4 Sterne: Gut - Wenige geringfügige Fehler
 * 5 Sterne: Sehr gut - Fehlerfrei und vollständig
 *
 * Die Bewertung wird als self_assessment_quality im Backend gespeichert
 * und dient der subjektiven Qualitätseinschätzung durch den Radiologen.
 *
 * Bewertungskriterien (angezeigt im Dialog):
 * - Vollständigkeit der Befundung
 * - Korrekte medizinische Terminologie
 * - Strukturierung und Lesbarkeit
 * - Zeitersparnis gegenüber manueller Erstellung
 */

import React, { useState } from "react";
import {
  FaCheckCircle,
  FaTimes,
  FaStar,
  FaExclamationTriangle,
} from "react-icons/fa";

/**
 * Dialog-Komponente zur Erfassung der Qualitätsbewertung.
 *
 * Wird nach Abschluss einer Studien-Session angezeigt und erfordert
 * eine Bewertung bevor die Session vollständig abgeschlossen werden kann.
 *
 * Die Bewertung erfolgt über ein interaktives 5-Sterne-Rating mit
 * Hover-Effekt und Beschreibungstext für jede Stufe.
 *
 * @param {Object} props - Komponenten-Props
 * @param {boolean} props.isOpen - Steuert Sichtbarkeit des Dialogs
 * @param {Function} props.onSubmit - Callback bei Bewertungsabgabe
 * @param {number} props.onSubmit.rating - Die ausgewählte Bewertung (1-5)
 * @param {Function} props.onCancel - Callback zum Abbrechen/Schließen
 * @returns {JSX.Element|null} Der Dialog oder null wenn nicht offen
 *
 * @example
 * <QualityAssessmentDialog
 *   isOpen={showQualityDialog}
 *   onSubmit={(rating) => completeSessionWithRating(rating)}
 *   onCancel={() => setShowQualityDialog(false)}
 * />
 */
function QualityAssessmentDialog({ isOpen, onSubmit, onCancel }) {
  const [selectedQuality, setSelectedQuality] = useState(0);
  const [hoveredQuality, setHoveredQuality] = useState(0);

  const qualityDescriptions = {
    1: "Sehr schlecht - Viele Fehler, unvollständig",
    2: "Schlecht - Einige wesentliche Fehler",
    3: "Mittelmäßig - Akzeptabel mit kleinen Fehlern",
    4: "Gut - Wenige geringfügige Fehler",
    5: "Sehr gut - Fehlerfrei und vollständig",
  };

  const handleSubmit = () => {
    if (selectedQuality > 0) {
      onSubmit(selectedQuality);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FaCheckCircle className="text-green-400" />
              Qualitätsbewertung
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <p className="text-gray-300 mb-4">
              Bitte bewerten Sie die Qualität des generierten Berichts im 
              Vergleich zu einem manuell erstellten Bericht:
            </p>

            {/* Rating Stars */}
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setSelectedQuality(rating)}
                  onMouseEnter={() => setHoveredQuality(rating)}
                  onMouseLeave={() => setHoveredQuality(0)}
                  className="text-4xl transition-colors"
                >
                  <FaStar
                    className={
                      rating <= (hoveredQuality || selectedQuality)
                        ? "text-yellow-400"
                        : "text-gray-600"
                    }
                  />
                </button>
              ))}
            </div>

            {/* Description */}
            <div className="text-center min-h-[24px]">
              {(hoveredQuality || selectedQuality) > 0 && (
                <p className="text-sm text-gray-400">
                  {qualityDescriptions[hoveredQuality || selectedQuality]}
                </p>
              )}
            </div>
          </div>

          {selectedQuality === 0 && (
            <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
              <div className="flex items-start gap-2">
                <FaExclamationTriangle className="text-yellow-400 text-sm mt-1 flex-shrink-0" />
                <p className="text-xs text-yellow-200">
                  Bitte wählen Sie eine Bewertung aus, bevor Sie fortfahren.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="p-4 bg-gray-700 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-300 mb-2">
                Bewertungskriterien:
              </h4>
              <ul className="space-y-1 text-sm text-gray-400">
                <li>• Vollständigkeit der Befundung</li>
                <li>• Korrekte medizinische Terminologie</li>
                <li>• Strukturierung und Lesbarkeit</li>
                <li>• Zeitersparnis gegenüber manueller Erstellung</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700">
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSubmit}
              disabled={selectedQuality === 0}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                selectedQuality === 0
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              <FaCheckCircle className="text-sm" />
              Bewertung abschließen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QualityAssessmentDialog;