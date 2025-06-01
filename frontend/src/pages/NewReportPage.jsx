import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaFileMedical,
  FaCircleNotch,
  FaCopy,
  FaMagic,
  FaSave,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { useTemplate } from "../context/TemplateContext";
import MDEditor from "@uiw/react-md-editor";
import rehypeSanitize from "rehype-sanitize";
import API_URL from "../utils/apiConfig";

function NewReportPage() {
  const navigate = useNavigate();
  const {
    selectedTemplateId,
    setSelectedTemplateId,
    templates,
    loading: templatesLoading,
    loadTemplates,
  } = useTemplate();
  const [inputText, setInputText] = useState("");
  const [reportText, setReportText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  // Default prompt to show in the textarea
  const defaultPrompt =
    "Du bist ein Assistent für Radiologinnen und Radiologen. Du erhältst als Eingabe unstrukturierte, teils fehlerhafte, frei formulierte Texte oder Diktate mit radiologischen Beobachtungen. Deine Aufgabe ist es, ausschließlich auf Grundlage dieser Angaben einen sprachlich korrekten, vollständig strukturierten radiologischen Befund in deutscher Sprache zu generieren."

            "**Verbindliche Vorgaben:**"

           " - Verwende ausschließlich Informationen aus dem Eingabetext."
           " - Keine Ergänzungen, Vermutungen oder erfundenen Inhalte."
           " - Jeder Aspekt des folgenden Templates muss vollständig berücksichtigt werden – auch wenn hierzu keine Angaben im Input enthalten sind. In diesem Fall ist die entsprechende unauffällige Normalformulierung (wie im Template) einzufügen."
           " - Die Reihenfolge der Abschnitte im Template darf unter keinen Umständen verändert werden."
           " - Der Befundtext muss als einzeiliger Fließtext ausgegeben werden – keine Segmentierung, keine Zwischenüberschriften, keine Absätze."
           " - Verwende den typischen, stichpunktartigen Stil radiologischer Befunde: kurz, sachlich, telegraphisch, ohne erklärende oder narrative Sprache."
        ;

  // Load template when component mounts or when selectedTemplateId changes
  useEffect(() => {
    // Load templates if they're not already loaded
    loadTemplates();

    if (selectedTemplateId && templates.length > 0) {
      const found = templates.find((t) => t.id === selectedTemplateId);
      if (found) {
        toast.info(`Template "${found.title}" geladen`);
      }
    }
  }, [selectedTemplateId, templates, loadTemplates]);

  const handleTemplateChange = (e) => {
    const tplId = e.target.value;
    setSelectedTemplateId(tplId);
  };

  const handleSaveReport = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    setReportVisible(false);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Bitte melden Sie sich an");
        setIsGenerating(false);
        return;
      }

      const payload = {
        input_text: inputText,
        template_id: selectedTemplateId || null,
        custom_prompt:
          showAdvancedOptions && customPrompt ? customPrompt : null,
      };

      const response = await fetch(`${API_URL}/reports/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || "Fehler beim Erstellen des Berichts"
        );
      }

      const data = await response.json();
      setReportText(data.report_text);
      setReportVisible(true);
      toast.success("Bericht erfolgreich erstellt");

      // Navigate to the created report page instead of the home page
      setTimeout(() => {
        navigate(`/reports/${data.id}`);
      }, 1500);
    } catch (error) {
      console.error("Error creating report:", error);
      toast.error(error.message || "Fehler beim Erstellen des Berichts");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    toast.success("Bericht kopiert!");
  };

  const handleSaveChanges = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Bitte melden Sie sich an");
        return;
      }

      // Assuming there's an endpoint to update the report
      // This would need to be implemented on your backend
      const response = await fetch(`${API_URL}/reports/latest/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ report_text: reportText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || "Fehler beim Speichern des Berichts"
        );
      }

      toast.success("Änderungen gespeichert");
    } catch (error) {
      console.error("Error saving report changes:", error);
      toast.error(error.message || "Fehler beim Speichern der Änderungen");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-white">
      <div className="glass-effect rounded-xl shadow-lg p-8 hover-lift">
        <div className="flex items-center space-x-3 mb-6">
          <FaFileMedical className="text-2xl text-blue-400" />
          <h1 className="text-2xl font-bold text-blue-400">
            Medizinischen Bericht erstellen
          </h1>
        </div>

        <form onSubmit={handleSaveReport} className="space-y-6">
          <div>
            <label
              htmlFor="template"
              className="block mb-2 text-sm text-gray-300"
            >
              Vorlage wählen:
            </label>
            {templatesLoading ? (
              <div className="flex items-center space-x-2 text-gray-400">
                <FaCircleNotch className="animate-spin" />
                <span>Lade Templates...</span>
              </div>
            ) : (
              <select
                id="template"
                value={selectedTemplateId || ""}
                onChange={handleTemplateChange}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
              >
                <option value="">-- ohne Vorlage --</option>
                {templates.length > 0 && (
                  <>
                    {/* Group user templates */}
                    {templates.filter((t) => t.user_created).length > 0 && (
                      <optgroup label="Meine Templates">
                        {templates
                          .filter((t) => t.user_created)
                          .map((tpl) => (
                            <option key={tpl.id} value={tpl.id}>
                              {tpl.title}
                            </option>
                          ))}
                      </optgroup>
                    )}

                    {/* Group default templates */}
                    <optgroup label="Standard Templates">
                      {templates
                        .filter((t) => !t.user_created)
                        .map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.title}
                          </option>
                        ))}
                    </optgroup>
                  </>
                )}
              </select>
            )}
          </div>

          <div>
            <label
              htmlFor="inputText"
              className="block mb-2 text-sm text-gray-300"
            >
              Befund-Diktat:
            </label>
            <textarea
              id="inputText"
              rows="5"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              required
              placeholder="Geben Sie hier Ihr Diktat oder Stichpunkte ein..."
              className="w-full p-4 bg-gray-800/50 rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
            />
          </div>

          {/* Advanced Options Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="text-sm flex items-center space-x-2 text-blue-400 hover:text-blue-300"
            >
              <span>
                {showAdvancedOptions ? "Weniger Optionen" : "Mehr Optionen"}
              </span>
            </button>
          </div>

          {/* Advanced Options Panel */}
          {showAdvancedOptions && (
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <label
                htmlFor="customPrompt"
                className="block mb-2 text-sm text-gray-300"
              >
                Eigener Prompt (optional):
              </label>
              <textarea
                id="customPrompt"
                rows="4"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={defaultPrompt}
                className="w-full p-3 bg-gray-800/70 rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none text-xs"
              />
              <p className="text-xs text-gray-500 mt-1">
                Überschreibt die Standardeinstellungen für KI-Prompts
              </p>
            </div>
          )}

          <div className="flex justify-end mt-8">
            <button
              type="submit"
              disabled={isGenerating || !inputText.trim()}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 px-6 rounded-lg transition-colors duration-200"
            >
              {isGenerating ? (
                <>
                  <FaCircleNotch className="animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <FaMagic />
                  <span>Generiere Bericht</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Generated Report */}
        {reportVisible && (
          <div className="mt-10 bg-gray-800/50 p-6 rounded-xl border border-blue-500/30">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-blue-400">
                Erstellter Bericht
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={handleCopy}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors duration-200 text-gray-300 hover:text-white"
                  title="In Zwischenablage kopieren"
                >
                  <FaCopy />
                </button>
                <button
                  onClick={handleSaveChanges}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors duration-200 text-gray-300 hover:text-white"
                  title="Änderungen speichern"
                >
                  <FaSave />
                </button>
              </div>
            </div>

            <div data-color-mode="dark">
              <MDEditor
                value={reportText}
                onChange={setReportText}
                preview="preview"
                height={400}
                previewOptions={{
                  rehypePlugins: [[rehypeSanitize]],
                }}
                visibleDragbar={false}
                hideToolbar={true}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NewReportPage;
