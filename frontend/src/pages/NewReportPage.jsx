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
import Select from "react-select";

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
    "Du bist ein Assistent für Radiologinnen und Radiologen. Du erhältst als Eingabe unstrukturierte, teils fehlerhafte, frei formulierte Texte oder Diktate mit radiologischen Beobachtungen. Deine Aufgabe ist es, ausschließlich auf Grundlage dieser Angaben einen sprachlich korrekten, vollständig strukturierten radiologischen Befund in deutscher Sprache zu generieren.\n\n" +
    "**Verbindliche Vorgaben:**\n" +
    "- Verwende ausschließlich Informationen aus dem Eingabetext.\n" +
    "- Keine Ergänzungen, Vermutungen oder erfundenen Inhalte.\n" +
    "- Jeder Aspekt des folgenden Templates muss vollständig berücksichtigt werden – auch wenn hierzu keine Angaben im Input enthalten sind. In diesem Fall ist die entsprechende unauffällige Normalformulierung (wie im Template) einzufügen.\n" +
    "- Die Reihenfolge der Abschnitte im Template darf unter keinen Umständen verändert werden.\n" +
    "- Der Befundtext muss als einzeiliger Fließtext ausgegeben werden – keine Segmentierung, keine Zwischenüberschriften, keine Absätze.\n" +
    "- Verwende den typischen, stichpunktartigen Stil radiologischer Befunde: kurz, sachlich, telegraphisch, ohne erklärende oder narrative Sprache.";

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

  // Initialize custom prompt with default value
  useEffect(() => {
    if (!customPrompt) {
      setCustomPrompt(defaultPrompt);
    }
  }, [defaultPrompt]);

  const handleTemplateChange = (e) => {
    const tplId = e.target.value;
    setSelectedTemplateId(tplId);
  };

  // Custom styles for React Select to match dark theme
  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: "#1f2937", // bg-gray-800
      borderColor: state.isFocused ? "#3b82f6" : "#374151", // focus:ring-blue-500 : border-gray-700
      borderWidth: "1px",
      borderRadius: "0.5rem", // rounded-lg
      minHeight: "42px",
      boxShadow: state.isFocused ? "0 0 0 2px rgba(59, 130, 246, 0.5)" : "none",
      "&:hover": {
        borderColor: state.isFocused ? "#3b82f6" : "#6b7280",
      },
    }),
    singleValue: (provided) => ({
      ...provided,
      color: "#ffffff", // text-white
    }),
    input: (provided) => ({
      ...provided,
      color: "#ffffff", // text-white
    }),
    placeholder: (provided) => ({
      ...provided,
      color: "#9ca3af", // text-gray-400
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: "#1f2937", // bg-gray-800
      border: "1px solid #374151", // border-gray-700
      borderRadius: "0.5rem",
      marginTop: "4px",
      zIndex: 50,
    }),
    menuList: (provided) => ({
      ...provided,
      padding: "4px",
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? "#3b82f6" // bg-blue-600
        : state.isFocused
        ? "#374151" // bg-gray-700
        : "transparent",
      color: "#ffffff", // text-white
      padding: "8px 12px",
      borderRadius: "0.25rem",
      margin: "2px 0",
      cursor: "pointer",
      "&:hover": {
        backgroundColor: state.isSelected ? "#3b82f6" : "#374151",
      },
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      color: "#9ca3af", // text-gray-400
      "&:hover": {
        color: "#ffffff",
      },
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: "#374151", // border-gray-700
    }),
    clearIndicator: (provided) => ({
      ...provided,
      color: "#9ca3af", // text-gray-400
      "&:hover": {
        color: "#ffffff",
      },
    }),
    groupHeading: (provided) => ({
      ...provided,
      color: "#60a5fa", // text-blue-400
      fontWeight: "600",
      fontSize: "0.875rem",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      padding: "8px 12px 4px",
      marginBottom: "4px",
      borderBottom: "1px solid #374151",
    }),
    group: (provided) => ({
      ...provided,
      paddingTop: "4px",
      paddingBottom: "4px",
    }),
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
        custom_prompt: customPrompt || null,
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

  // Create grouped options for React Select
  const getGroupedOptions = () => {
    const userTemplates = templates.filter((t) => t.user_created);
    const standardTemplates = templates.filter((t) => !t.user_created);

    const options = [];

    if (userTemplates.length > 0) {
      options.push({
        label: "Meine Templates",
        options: userTemplates.map((tpl) => ({
          value: tpl.id,
          label: tpl.title,
        })),
      });
    }

    // Add standard templates directly without grouping
    if (standardTemplates.length > 0) {
      standardTemplates.forEach((tpl) => {
        options.push({
          value: tpl.id,
          label: tpl.title,
        });
      });
    }

    return options;
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
              <Select
                value={
                  selectedTemplateId
                    ? templates.find((t) => t.id === selectedTemplateId)
                      ? {
                          value: selectedTemplateId,
                          label: templates.find(
                            (t) => t.id === selectedTemplateId
                          )?.title,
                        }
                      : null
                    : null
                }
                onChange={(selectedOption) => {
                  setSelectedTemplateId(
                    selectedOption ? selectedOption.value : ""
                  );
                }}
                options={getGroupedOptions()}
                isSearchable
                isClearable
                isDisabled={templatesLoading}
                placeholder="-- ohne Vorlage --"
                styles={customSelectStyles}
                noOptionsMessage={() => "Keine Templates gefunden"}
              />
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
                System Prompt:
              </label>
              <textarea
                id="customPrompt"
                rows="8"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="w-full p-3 bg-gray-800/70 rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Definiert das Verhalten der KI bei der Berichterstellung
              </p>
              <p className="text-xs text-gray-400 mt-2 font-medium">
                Prüfe auf inkonsistenzen und wenn du welche findest schreibe das
                unter den Befund mit "Achtung, folgende Inkonsistenz korrigiert:{" "}
                {selectedTemplateId
                  ? templates.find((t) => t.id === selectedTemplateId)?.title ||
                    "unbekanntes Template"
                  : "ohne Template"}
                "
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
