import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCircleNotch,
  FaCopy,
  FaMagic,
  FaSave,
  FaPlus,
  FaEdit,
  FaTrash,
  FaToggleOn,
  FaToggleOff,
  FaRobot,
  FaUser,
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
  const [customPrompt, setCustomPrompt] = useState("");
  const [userCustomPrompt, setUserCustomPrompt] = useState("");
  const [hasUserCustomPrompt, setHasUserCustomPrompt] = useState(false);
  const [loadingCustomPrompt, setLoadingCustomPrompt] = useState(true);
  const [hasPromptChanges, setHasPromptChanges] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);

  // Default prompt to show in the textarea
  const defaultPrompt =
    "Du bist ein erfahrener Radiologieprofessor. Deine Aufgabe besteht darin, Sprachdiktate in standardisierte radiologische Berichte umzuwandeln.\n" +
    "Die Diktate enthalten ausschließlich relevante Pathologien aus einer radiologischen Untersuchung. Ziel ist es, diese Pathologien in strukturierter Form in einen Fließtext zu integrieren.\n" +
    "Dabei gliederst du die Inhalte nach Körperregion und setzt sie in einen passenden Textbaustein um.\n" +
    "Ein radiologischer Bericht besteht aus zwei Teilen:\n\n" +
    "Befund:\n" +
    "Dieser Abschnitt beschreibt objektiv (nicht wertend) die in der Bildgebung erkennbaren Veränderungen.\n" +
    "• Zunächst werden relevante Voruntersuchungen genannt, die zum Vergleich herangezogen wurden.\n\n" +
    "• Danach folgen eventuelle technische Limitationen (z. B. eingeschränkte Beurteilbarkeit durch Atemartefakte).\n\n" +
    "• Anschließend erfolgt eine systematische Beschreibung der Organsysteme, geordnet nach anatomischer oder pathologischer Zugehörigkeit.\n\n" +
    "Beachte dabei folgende Punkte:\n" +
    '• Vermeide Überschriften oder Sammelbezeichnungen wie "Technische Limitation".\n\n' +
    '• Entferne Redundanzen sowie wertende Formulierungen (z. B. "vereinbar mit ...", "passend zu ...", "DD: ...") – diese gehören in die Beurteilung.\n\n' +
    '• Erhalte Referenzen zu Serien- und Bildnummern (z. B. "(501/16)", "(S10/B16)") unverändert.\n\n' +
    '• Ersetze Formulierungen wie "Z. n. ...", "Zustand nach ..." oder "Bei Z. n. ..." durch die professionellere Ausdrucksweise: "Stattgehabte ...".\n\n' +
    "Der Text soll flüssig, neutral und präzise formuliert sein – in typischem radiologischem Sprachstil. Vermeide Stichpunkte und Überschriften. Verwende vollständige Sätze.\n\n" +
    "Beurteilung:\n" +
    "Hier erfolgt die zusammenfassende Bewertung der beschriebenen Befunde mit Einordnung der pathologischen/klinischen Relevanz.\n" +
    "• Liste alle relevanten pathologischen Veränderungen knapp und präzise, priorisiert nach ihrer klinischen Bedeutung.\n\n" +
    '• Gib den genannten Befunden konkrete Diagnosen, z. B.: "Leberraumforderung passend zu einem HCC".\n\n' +
    '• Bei unklaren Befunden verwende "DD: ...", z. B.: "Befund im rechten Oberlappen passend zu pneumonischen Infiltraten, DD: Tumoratelektase".\n\n' +
    "• Die Beurteilung erfolgt stichpunktartig und prägnant, nicht in Fließtextform.\n\n" +
    "• Auch hier gilt: radiologischer Fachstil.";

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

  // Load user's custom prompt on component mount
  useEffect(() => {
    loadUserCustomPrompt();
  }, []);

  // Initialize prompt with user's custom prompt or default
  useEffect(() => {
    if (!loadingCustomPrompt) {
      if (hasUserCustomPrompt) {
        setCustomPrompt(userCustomPrompt);
      } else {
        setCustomPrompt(defaultPrompt);
      }
    }
  }, [
    loadingCustomPrompt,
    hasUserCustomPrompt,
    userCustomPrompt,
    defaultPrompt,
  ]);

  const loadUserCustomPrompt = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoadingCustomPrompt(false);
        return;
      }

      const response = await fetch(`${API_URL}/custom-prompt/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.custom_prompt) {
          setUserCustomPrompt(data.custom_prompt);
          setHasUserCustomPrompt(true);
        } else {
          setHasUserCustomPrompt(false);
        }
      }
    } catch (error) {
      console.error("Error loading custom prompt:", error);
    } finally {
      setLoadingCustomPrompt(false);
    }
  };

  const saveUserCustomPrompt = async () => {
    setSavingPrompt(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Bitte melden Sie sich an");
        return false;
      }

      const method = hasUserCustomPrompt ? "PUT" : "POST";
      const response = await fetch(`${API_URL}/custom-prompt/`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ custom_prompt: customPrompt }),
      });

      if (response.ok) {
        const data = await response.json();
        setUserCustomPrompt(data.custom_prompt);
        setHasUserCustomPrompt(true);
        setHasPromptChanges(false);
        toast.success("Prompt gespeichert!");
        return true;
      } else {
        throw new Error("Fehler beim Speichern des Prompts");
      }
    } catch (error) {
      console.error("Error saving custom prompt:", error);
      toast.error("Fehler beim Speichern des Prompts");
      return false;
    } finally {
      setSavingPrompt(false);
    }
  };

  const handlePromptChange = (value) => {
    setCustomPrompt(value);

    // Check if the current prompt is different from the saved version
    const originalPrompt = hasUserCustomPrompt
      ? userCustomPrompt
      : defaultPrompt;
    setHasPromptChanges(value !== originalPrompt);
  };

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
          <h1 className="text-2xl font-bold text-blue-400">
            Medizinischen Bericht erstellen
          </h1>
        </div>

        <form onSubmit={handleSaveReport} className="space-y-6">
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

          {/* Prompt Configuration Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-blue-400 flex items-center space-x-2">
                <FaRobot />
                <span>KI-Verhalten konfigurieren</span>
              </h3>
              {hasPromptChanges && (
                <button
                  type="button"
                  onClick={saveUserCustomPrompt}
                  disabled={savingPrompt}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  {savingPrompt ? (
                    <>
                      <FaCircleNotch className="animate-spin" />
                      <span>Speichern...</span>
                    </>
                  ) : (
                    <>
                      <FaSave />
                      <span>Änderungen speichern</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Prompt Display Panel */}
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <label
                htmlFor="customPrompt"
                className="block mb-2 text-sm text-gray-300 flex items-center space-x-2"
              >
                <FaRobot className="text-blue-400" />
                <span>
                  {hasUserCustomPrompt
                    ? "Ihr gespeicherter Prompt:"
                    : "System Prompt:"}
                </span>
              </label>
              {loadingCustomPrompt ? (
                <div className="flex items-center space-x-2 text-gray-400 h-32 justify-center">
                  <FaCircleNotch className="animate-spin" />
                  <span>Lade Prompt...</span>
                </div>
              ) : (
                <textarea
                  id="customPrompt"
                  rows="8"
                  value={customPrompt}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  className="w-full p-3 bg-gray-800/70 rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none text-sm"
                />
              )}
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-500">
                  Definiert das Verhalten der KI bei der Berichterstellung
                </p>
                {hasPromptChanges && (
                  <p className="text-xs text-orange-400">
                    Ungespeicherte Änderungen
                  </p>
                )}
              </div>
              {selectedTemplateId && (
                <p className="text-xs text-gray-400 mt-2">
                  Sie verwenden die Vorlage:{" "}
                  <span className="font-medium text-blue-400">
                    {templates.find((t) => t.id === selectedTemplateId)
                      ?.title || "Unbekannte Vorlage"}
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mt-8">
            {/* Template Selection */}
            <div className="flex-1 max-w-md">
              <label
                htmlFor="template"
                className="block mb-2 text-sm text-gray-300"
              >
                Vorlage wählen:
              </label>
              {templatesLoading ? (
                <div className="flex items-center space-x-2 text-gray-400 h-[42px]">
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
                  menuPlacement="top"
                />
              )}
            </div>

            {/* Generate Button */}
            <button
              type="submit"
              disabled={isGenerating || !inputText.trim()}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2.5 px-6 rounded-lg transition-colors duration-200 whitespace-nowrap h-[42px]"
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
