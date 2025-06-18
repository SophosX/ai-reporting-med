import React, { useState, useEffect } from "react";
import {
  FaBookMedical,
  FaArrowRight,
  FaPlus,
  FaEdit,
  FaTrashAlt,
  FaSave,
  FaUndo,
  FaUserEdit,
  FaUndoAlt,
  FaChevronDown,
  FaChevronUp,
  FaExpandArrowsAlt,
  FaCompressArrowsAlt,
  FaDownload,
  FaUpload,
  FaFileImport,
  FaKeyboard,
  FaInfoCircle,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useTemplate } from "../context/TemplateContext";
import { toast } from "react-toastify";
import {
  createUserTemplate,
  updateUserTemplate,
  deleteUserTemplate,
  updateDefaultTemplate,
  deleteDefaultTemplate,
  downloadTemplateAsJSON,
  importTemplateFromFile,
  downloadSampleTemplate,
} from "../utils/templateService";
import MDEditor from "@uiw/react-md-editor";
import rehypeSanitize from "rehype-sanitize";

function TemplatesPage() {
  const {
    selectedTemplateId,
    setSelectedTemplateId,
    templates,
    loading,
    error,
    refreshTemplates,
    loadTemplates,
    initialized,
  } = useTemplate();
  const navigate = useNavigate();

  // State for creating/editing templates
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [expandedTemplates, setExpandedTemplates] = useState(new Set());
  const [newTemplate, setNewTemplate] = useState({
    title: "",
    template_id: "",
    text: "",
  });
  const [editedTemplate, setEditedTemplate] = useState({
    title: "",
    text: "",
  });

  // Import/Export state
  const [importMode, setImportMode] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importedSuccessfully, setImportedSuccessfully] = useState(false);
  const [importError, setImportError] = useState(null);

  // Load templates when component mounts
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Function to toggle template expansion
  const toggleTemplateExpansion = (templateId) => {
    const newExpanded = new Set(expandedTemplates);
    if (newExpanded.has(templateId)) {
      newExpanded.delete(templateId);
    } else {
      newExpanded.add(templateId);
    }
    setExpandedTemplates(newExpanded);
  };

  // Function to expand all templates
  const expandAllTemplates = () => {
    const allTemplateIds = templates.map((t) => t.id);
    setExpandedTemplates(new Set(allTemplateIds));
  };

  // Function to collapse all templates
  const collapseAllTemplates = () => {
    setExpandedTemplates(new Set());
  };

  const handleSelect = (tplId) => {
    setSelectedTemplateId(tplId);
    const template = templates.find((t) => t.id === tplId);
    toast.success(`Template "${template.title}" ausgewählt!`);
    navigate("/reports/new");
  };

  const resetForm = () => {
    setNewTemplate({
      title: "",
      template_id: "",
      text: "",
    });
    setImportedSuccessfully(false);
    setImportError(null);
  };

  const handleStartCreating = () => {
    setIsCreating(true);
    setIsEditing(null);
    setImportMode(false);
    resetForm();
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setImportMode(false);
    resetForm();
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!newTemplate.title || !newTemplate.text) {
        toast.error("Bitte alle Pflichtfelder ausfüllen");
        return;
      }

      await createUserTemplate({
        title: newTemplate.title,
        template_id: newTemplate.template_id || undefined, // Let backend generate if empty
        text: newTemplate.text,
      });

      toast.success("Template erfolgreich erstellt");
      setIsCreating(false);
      resetForm();
      refreshTemplates();
    } catch (err) {
      toast.error(`Fehler beim Erstellen: ${err.message}`);
    }
  };

  const handleStartEditing = (template) => {
    // For default templates, use the template ID directly
    // For user templates, use the template_db_id property
    const editId = template.user_created
      ? template.template_db_id
      : template.id;

    setIsEditing(editId);
    setIsCreating(false);
    setEditedTemplate({
      title: template.title,
      text: template.text,
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(null);
    setEditedTemplate({
      title: "",
      text: "",
    });
  };

  const handleEditSubmit = async (
    e,
    templateId,
    isDefaultTemplate = false,
    defaultTemplateId = null
  ) => {
    e.preventDefault();
    try {
      if (!editedTemplate.title || !editedTemplate.text) {
        toast.error("Bitte alle Pflichtfelder ausfüllen");
        return;
      }

      if (isDefaultTemplate) {
        // Handle default template update
        await updateDefaultTemplate(defaultTemplateId, {
          title: editedTemplate.title,
          text: editedTemplate.text,
        });
        toast.success("Template erfolgreich aktualisiert");
      } else {
        // Handle user template update
        await updateUserTemplate(templateId, {
          title: editedTemplate.title,
          text: editedTemplate.text,
        });
        toast.success("Template erfolgreich aktualisiert");
      }

      setIsEditing(null);
      refreshTemplates();
    } catch (err) {
      toast.error(`Fehler beim Aktualisieren: ${err.message}`);
    }
  };

  const handleDelete = async (
    templateId,
    isDefaultTemplate = false,
    isOverride = false
  ) => {
    // Different confirmation messages based on template type
    let confirmMessage;
    if (isDefaultTemplate && isOverride) {
      confirmMessage =
        "Möchten Sie Ihre Anpassungen für dieses Template wirklich löschen? Es wird auf die Standardversion zurückgesetzt.";
    } else if (isDefaultTemplate) {
      confirmMessage =
        "Möchten Sie dieses Standard-Template wirklich aus Ihrer Ansicht entfernen?";
    } else {
      confirmMessage = "Möchten Sie dieses Template wirklich löschen?";
    }

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      if (isDefaultTemplate) {
        // Handle default template deletion (removal from user's view or override deletion)
        await deleteDefaultTemplate(templateId);
        if (isOverride) {
          toast.success(
            "Template-Anpassungen erfolgreich gelöscht - auf Standard zurückgesetzt"
          );
        } else {
          toast.success("Template erfolgreich aus Ihrer Ansicht entfernt");
        }
      } else {
        // Handle user template deletion
        await deleteUserTemplate(templateId);
        toast.success("Template erfolgreich gelöscht");
      }

      refreshTemplates();
    } catch (err) {
      toast.error(`Fehler beim Löschen: ${err.message}`);
    }
  };

  // Export template to JSON
  const handleExportTemplate = (template) => {
    try {
      downloadTemplateAsJSON(template);
      toast.success("Template erfolgreich exportiert");
    } catch (error) {
      toast.error(`Fehler beim Exportieren: ${error.message}`);
    }
  };

  // Handle file import
  const handleImportFile = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null); // Clear previous errors
    try {
      const templateData = await importTemplateFromFile(file);
      setNewTemplate({
        title: templateData.title,
        template_id: templateData.template_id,
        text: templateData.text,
      });
      setImportedSuccessfully(true);
      toast.success("Template erfolgreich importiert!");
    } catch (error) {
      setImportError(error.message);
      toast.error(`Fehler beim Importieren: ${error.message}`);
      setImportedSuccessfully(false);
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = "";
    }
  };

  // Switch to import mode
  const handleSwitchToImport = () => {
    setImportMode(true);
    resetForm();
  };

  // Switch to manual creation mode
  const handleSwitchToManual = () => {
    setImportMode(false);
    resetForm();
  };

  // Download sample template
  const handleDownloadSample = () => {
    try {
      downloadSampleTemplate();
      toast.success("Beispiel-Template heruntergeladen!");
    } catch (error) {
      toast.error(`Fehler beim Download: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 text-white text-center">
        <div className="animate-spin text-purple-400 text-2xl">⌛</div>
        <p className="mt-2">Lade Templates...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 text-white">
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-4">
          <p className="text-white">Error: {error}</p>
          <p className="mt-2">Bitte versuchen Sie es später erneut.</p>
        </div>
      </div>
    );
  }

  // Separate default and user templates
  const defaultTemplates = templates.filter(
    (t) => !t.user_created || t.is_default_override
  );
  const userTemplates = templates.filter(
    (t) => t.user_created && !t.is_default_override
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 text-white">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <FaBookMedical className="text-2xl text-purple-400" />
          <h2 className="text-3xl font-bold text-purple-400">
            Radiologie Vorlagen
          </h2>
        </div>
        <button
          onClick={handleStartCreating}
          className="bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2"
        >
          <FaPlus />
          <span>Neues Template</span>
        </button>
      </div>

      <p className="text-gray-400 mb-6">
        Wähle aus vordefinierten Befundbausteinen für standardisierte
        Radiologieberichte oder erstelle deine eigenen:
      </p>

      {/* Expand/Collapse Controls */}
      {templates.length > 0 && (
        <div className="flex justify-between items-center mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <div className="text-sm text-gray-300">
            <span className="font-medium">{templates.length}</span> Templates
            verfügbar
            {expandedTemplates.size > 0 && (
              <span className="ml-2">({expandedTemplates.size} erweitert)</span>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={expandAllTemplates}
              className="text-sm px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-colors duration-200 flex items-center space-x-1"
            >
              <FaExpandArrowsAlt className="text-xs" />
              <span>Alle erweitern</span>
            </button>
            <button
              onClick={collapseAllTemplates}
              className="text-sm px-3 py-1 bg-gray-600/20 hover:bg-gray-600/30 text-gray-300 rounded-lg transition-colors duration-200 flex items-center space-x-1"
            >
              <FaCompressArrowsAlt className="text-xs" />
              <span>Alle zuklappen</span>
            </button>
          </div>
        </div>
      )}

      {/* Template Creation Form */}
      {isCreating && (
        <div className="mb-8 bg-gray-800 p-6 rounded-xl border border-purple-500/40">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-purple-300 flex items-center">
              <FaPlus className="mr-2" />
              Neues Template erstellen
            </h3>
            <button
              onClick={handleCancelCreate}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors duration-200 text-gray-400 hover:text-white"
              title="Schließen"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Creation Mode Selection */}
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-3 p-1 bg-gray-700/50 rounded-lg mb-6">
              <button
                type="button"
                onClick={handleSwitchToManual}
                className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-all duration-200 ${
                  !importMode
                    ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20"
                    : "text-gray-300 hover:text-white hover:bg-gray-600/50"
                }`}
              >
                <FaKeyboard className="text-lg" />
                <span className="font-medium">Manuell erstellen</span>
              </button>
              <button
                type="button"
                onClick={handleSwitchToImport}
                className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-all duration-200 ${
                  importMode
                    ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20"
                    : "text-gray-300 hover:text-white hover:bg-gray-600/50"
                }`}
              >
                <FaFileImport className="text-lg" />
                <span className="font-medium">Aus JSON importieren</span>
              </button>
            </div>

            {/* Import Mode UI */}
            {importMode && (
              <div className="space-y-4">
                {!importedSuccessfully ? (
                  <div className="space-y-4">
                    {/* Sample Download Section */}
                    <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-xl p-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <FaInfoCircle className="text-indigo-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-indigo-300 font-medium mb-1">
                            Benötigen Sie ein Beispiel?
                          </h4>
                          <p className="text-sm text-gray-300 mb-3">
                            Laden Sie eine Beispiel-JSON-Datei herunter, um das
                            korrekte Format zu verstehen.
                          </p>
                          <button
                            type="button"
                            onClick={handleDownloadSample}
                            className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm rounded-lg transition-colors duration-200"
                          >
                            <FaDownload />
                            <span>Beispiel-Template herunterladen</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* File Upload Section */}
                    <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-xl p-6">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-blue-500/20 rounded-full flex items-center justify-center">
                          <FaUpload className="text-2xl text-blue-400" />
                        </div>
                        <h4 className="text-lg font-semibold text-blue-300 mb-2">
                          JSON-Template importieren
                        </h4>
                        <p className="text-sm text-gray-300 mb-6 max-w-md mx-auto">
                          Wählen Sie eine gültige JSON-Datei aus, um ein
                          existierendes Template zu importieren. Die Datei wird
                          automatisch validiert und verarbeitet.
                        </p>

                        <div className="relative">
                          <input
                            type="file"
                            accept=".json,application/json"
                            onChange={handleImportFile}
                            disabled={isImporting}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                            id="json-file-input"
                          />
                          <label
                            htmlFor="json-file-input"
                            className={`inline-flex items-center space-x-3 px-6 py-3 rounded-lg font-medium transition-all duration-200 cursor-pointer ${
                              isImporting
                                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                                : "bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-blue-500/25"
                            }`}
                          >
                            {isImporting ? (
                              <>
                                <div className="animate-spin w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                                <span>Importiere...</span>
                              </>
                            ) : (
                              <>
                                <FaUpload />
                                <span>JSON-Datei auswählen</span>
                              </>
                            )}
                          </label>
                        </div>

                        <div className="mt-4 text-xs text-gray-400">
                          Unterstützte Formate: .json
                        </div>
                      </div>
                    </div>

                    {/* Error Display */}
                    {importError && (
                      <div className="bg-gradient-to-br from-red-500/10 to-pink-500/10 border border-red-500/30 rounded-xl p-4">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg
                              className="w-4 h-4 text-red-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-red-300 font-medium mb-1">
                              Import-Fehler
                            </h4>
                            <p className="text-sm text-gray-300 mb-2">
                              {importError}
                            </p>
                            {importError.includes("Invalid JSON format") && (
                              <div className="text-xs text-gray-400 bg-gray-800/50 rounded p-2">
                                <strong>Häufige JSON-Fehler:</strong>
                                <ul className="mt-1 space-y-1 list-disc list-inside">
                                  <li>
                                    Fehlende Anführungszeichen bei Eigenschaften
                                  </li>
                                  <li>
                                    Vergessene Kommas zwischen
                                    Objekteigenschaften
                                  </li>
                                  <li>
                                    Nicht-maskierte Anführungszeichen im Text
                                  </li>
                                  <li>Ungültige Zeichen oder Codierung</li>
                                </ul>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => setImportError(null)}
                              className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
                            >
                              Fehler ausblenden
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-4 h-4 text-green-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-green-300 font-medium">
                          Template erfolgreich importiert!
                        </p>
                        <p className="text-sm text-gray-300">
                          Die Formulardaten wurden automatisch ausgefüllt. Sie
                          können sie bei Bedarf anpassen.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setImportedSuccessfully(false);
                          resetForm();
                        }}
                        className="text-gray-400 hover:text-gray-300 transition-colors"
                        title="Andere Datei wählen"
                      >
                        <FaUndoAlt />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form Fields - Only show in manual mode OR after successful import */}
          {(!importMode || importedSuccessfully) && (
            <form onSubmit={handleCreateSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Titel *
                </label>
                <input
                  type="text"
                  value={newTemplate.title}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, title: e.target.value })
                  }
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  placeholder="z.B. MRT Wirbelsäule"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Template ID (optional)
                </label>
                <input
                  type="text"
                  value={newTemplate.template_id}
                  onChange={(e) =>
                    setNewTemplate({
                      ...newTemplate,
                      template_id: e.target.value,
                    })
                  }
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  placeholder="z.B. mrt-spine (wird automatisch generiert, wenn leer)"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Nur Buchstaben, Zahlen und Bindestriche. Leer lassen für
                  automatische Generierung.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Template Text *
                </label>
                <div
                  data-color-mode="dark"
                  className="border border-gray-600 rounded-lg overflow-hidden"
                >
                  <MDEditor
                    value={newTemplate.text}
                    onChange={(value) =>
                      setNewTemplate({ ...newTemplate, text: value || "" })
                    }
                    height={300}
                    preview="edit"
                    previewOptions={{
                      rehypePlugins: [[rehypeSanitize]],
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={handleCancelCreate}
                  className="px-6 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center space-x-2 transition-colors duration-200"
                >
                  <FaUndo className="text-sm" />
                  <span>Abbrechen</span>
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg flex items-center space-x-2 transition-colors duration-200 shadow-lg hover:shadow-purple-500/25"
                >
                  <FaSave className="text-sm" />
                  <span>Template speichern</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* User Templates Section */}
      {userTemplates.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-purple-300 mb-4 flex items-center">
            <FaUserEdit className="mr-2" />
            Meine Templates
          </h3>
          <div className="space-y-6">
            {userTemplates.map((tpl) => {
              const isSelected = tpl.id === selectedTemplateId;
              const isCurrentlyEditing = isEditing === tpl.template_db_id;
              const isExpanded = expandedTemplates.has(tpl.id);

              return (
                <div
                  key={tpl.id}
                  className={`bg-gradient-to-br from-gray-800 to-gray-900 border rounded-xl p-6 hover:shadow-lg transition-all duration-300
                    ${
                      isSelected
                        ? "border-purple-500 shadow-lg shadow-purple-500/20"
                        : "border-gray-700/50"
                    }
                  `}
                >
                  {isCurrentlyEditing ? (
                    <div className="mb-4">
                      <form
                        onSubmit={(e) =>
                          handleEditSubmit(e, tpl.template_db_id)
                        }
                      >
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Titel *
                          </label>
                          <input
                            type="text"
                            value={editedTemplate.title}
                            onChange={(e) =>
                              setEditedTemplate({
                                ...editedTemplate,
                                title: e.target.value,
                              })
                            }
                            className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            required
                          />
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Template Text *
                          </label>
                          <div data-color-mode="dark">
                            <MDEditor
                              value={editedTemplate.text}
                              onChange={(value) =>
                                setEditedTemplate({
                                  ...editedTemplate,
                                  text: value || "",
                                })
                              }
                              height={300}
                              preview="edit"
                              previewOptions={{
                                rehypePlugins: [[rehypeSanitize]],
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center space-x-1"
                          >
                            <FaUndo className="text-sm" />
                            <span>Abbrechen</span>
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center space-x-1"
                          >
                            <FaSave className="text-sm" />
                            <span>Aktualisieren</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-2">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => toggleTemplateExpansion(tpl.id)}
                        >
                          <div className="flex items-center space-x-2">
                            <h3 className="text-xl font-semibold text-purple-300 hover:text-purple-200 transition-colors">
                              {tpl.title}
                            </h3>
                            {isExpanded ? (
                              <FaChevronUp className="text-gray-400 text-sm" />
                            ) : (
                              <FaChevronDown className="text-gray-400 text-sm" />
                            )}
                          </div>
                          {!isExpanded && (
                            <div className="text-xs text-gray-500 mt-1 truncate">
                              {tpl.text
                                .replace(/[#*_`]/g, "")
                                .substring(0, 100)}
                              ...
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditing(tpl);
                            }}
                            className="p-2 hover:bg-blue-500/10 rounded-lg transition-colors duration-200 text-gray-400 hover:text-blue-400"
                            title="Template bearbeiten"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportTemplate(tpl);
                            }}
                            className="p-2 hover:bg-green-500/10 rounded-lg transition-colors duration-200 text-gray-400 hover:text-green-400"
                            title="Template als JSON exportieren"
                          >
                            <FaDownload />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(tpl.template_db_id);
                            }}
                            className="p-2 hover:bg-red-500/10 rounded-lg transition-colors duration-200 text-gray-400 hover:text-red-400"
                            title="Template löschen"
                          >
                            <FaTrashAlt />
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <>
                          <div className="text-sm text-gray-300 whitespace-pre-wrap mb-4">
                            <div data-color-mode="dark">
                              <MDEditor.Markdown
                                source={tpl.text}
                                rehypePlugins={[[rehypeSanitize]]}
                              />
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleSelect(tpl.id)}
                              className="flex items-center space-x-2 bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                            >
                              <span>Mit diesem Template fortfahren</span>
                              <FaArrowRight />
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Default Templates Section */}
      <div>
        <div className="space-y-6">
          {defaultTemplates.map((tpl) => {
            const isSelected = tpl.id === selectedTemplateId;
            const isCurrentlyEditing = isEditing === tpl.id;
            const isExpanded = expandedTemplates.has(tpl.id);
            // Check if this is an override of a default template
            const isOverride = tpl.is_default_override === true;

            return (
              <div
                key={tpl.id}
                className={`bg-gradient-to-br from-gray-800 to-gray-900 border rounded-xl p-6 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300
                  ${
                    isSelected
                      ? "border-purple-500 shadow-lg shadow-purple-500/20"
                      : "border-gray-700/50"
                  }
                  ${isOverride ? "border-l-4 border-l-blue-500" : ""}
                `}
              >
                {isCurrentlyEditing ? (
                  <div className="mb-4">
                    <form
                      onSubmit={(e) => handleEditSubmit(e, null, true, tpl.id)}
                    >
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Titel *
                        </label>
                        <input
                          type="text"
                          value={editedTemplate.title}
                          onChange={(e) =>
                            setEditedTemplate({
                              ...editedTemplate,
                              title: e.target.value,
                            })
                          }
                          className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          required
                        />
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Template Text *
                        </label>
                        <div data-color-mode="dark">
                          <MDEditor
                            value={editedTemplate.text}
                            onChange={(value) =>
                              setEditedTemplate({
                                ...editedTemplate,
                                text: value || "",
                              })
                            }
                            height={300}
                            preview="edit"
                            previewOptions={{
                              rehypePlugins: [[rehypeSanitize]],
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center space-x-1"
                        >
                          <FaUndo className="text-sm" />
                          <span>Abbrechen</span>
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center space-x-1"
                        >
                          <FaSave className="text-sm" />
                          <span>Aktualisieren</span>
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => toggleTemplateExpansion(tpl.id)}
                      >
                        <div className="flex items-center space-x-2">
                          <h3 className="text-xl font-semibold text-purple-300 hover:text-purple-200 transition-colors mb-1">
                            {tpl.title}
                          </h3>
                          {isExpanded ? (
                            <FaChevronUp className="text-gray-400 text-sm" />
                          ) : (
                            <FaChevronDown className="text-gray-400 text-sm" />
                          )}
                        </div>
                        {isOverride && (
                          <div className="text-xs text-blue-400 mb-2 flex items-center">
                            <span className="mr-1">●</span> Angepasste Version
                          </div>
                        )}
                        {!isExpanded && (
                          <div className="text-xs text-gray-500 mt-1 truncate">
                            {tpl.text.replace(/[#*_`]/g, "").substring(0, 100)}
                            ...
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEditing(tpl);
                          }}
                          className="p-2 hover:bg-blue-500/10 rounded-lg transition-colors duration-200 text-gray-400 hover:text-blue-400"
                          title="Template bearbeiten"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportTemplate(tpl);
                          }}
                          className="p-2 hover:bg-green-500/10 rounded-lg transition-colors duration-200 text-gray-400 hover:text-green-400"
                          title="Template als JSON exportieren"
                        >
                          <FaDownload />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(
                              isOverride ? tpl.default_template_id : tpl.id,
                              true,
                              isOverride
                            );
                          }}
                          className="p-2 hover:bg-red-500/10 rounded-lg transition-colors duration-200 text-gray-400 hover:text-red-400"
                          title={
                            isOverride
                              ? "Anpassungen löschen (auf Standard zurücksetzen)"
                              : "Template aus Ansicht entfernen"
                          }
                        >
                          <FaTrashAlt />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <>
                        <div className="text-sm text-gray-300 whitespace-pre-wrap mb-4">
                          <div data-color-mode="dark">
                            <MDEditor.Markdown
                              source={tpl.text}
                              rehypePlugins={[[rehypeSanitize]]}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleSelect(tpl.id)}
                            className="flex items-center space-x-2 bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                          >
                            <span>Mit diesem Template fortfahren</span>
                            <FaArrowRight />
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default TemplatesPage;
