import React, { useState, useEffect, useRef } from "react";
import {
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
  FaCheckSquare,
  FaSquare,
  FaFileExport,
  FaTimes,
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
  downloadSampleMultipleTemplates,
  downloadMultipleTemplatesAsJSON,
  createMultipleUserTemplates,
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
  const [importedData, setImportedData] = useState(null);
  const [isCreatingMultiple, setIsCreatingMultiple] = useState(false);

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState(new Set());
  const [isExporting, setIsExporting] = useState(false);

  // Load templates when component mounts
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Ref to track if component is mounted
  const isMountedRef = useRef(true);

  // Cleanup function to prevent state updates on unmounted component
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Reset all state when component unmounts
      setSelectionMode(false);
      setSelectedTemplates(new Set());
      setIsExporting(false);
      setIsEditing(null);
      setIsCreating(false);
    };
  }, []);

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
      text: "",
    });
    setImportedSuccessfully(false);
    setImportError(null);
    setImportedData(null);
  };

  const handleStartCreating = () => {
    // Exit selection mode first if active
    if (selectionMode) {
      setSelectionMode(false);
      setSelectedTemplates(new Set());
    }

    // Cancel any ongoing editing
    if (isEditing !== null) {
      setIsEditing(null);
      setEditedTemplate({
        title: "",
        text: "",
      });
    }

    // Set creation mode immediately
    setIsCreating(true);
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
      // Check if we're creating multiple templates
      if (importedData?.isMultiple) {
        setIsCreatingMultiple(true);
        const result = await createMultipleUserTemplates(
          importedData.templates
        );

        if (result.failureCount === 0) {
          toast.success(
            `Alle ${result.successCount} Templates erfolgreich erstellt`
          );
        } else if (result.successCount === 0) {
          toast.error(`Fehler: Keine Templates konnten erstellt werden`);
        } else {
          toast.warning(
            `${result.successCount} Templates erstellt, ${result.failureCount} fehlgeschlagen`
          );
        }

        // Show detailed results if there were failures
        if (result.failureCount > 0) {
          result.failed.forEach((failure) => {
            toast.error(`Template "${failure.title}": ${failure.error}`);
          });
        }
      } else {
        // Single template creation
        if (!newTemplate.title || !newTemplate.text) {
          toast.error("Bitte alle Pflichtfelder ausfüllen");
          return;
        }

        // Check if this is an import to pass the correct flag
        const isImport = importedData && !importedData.isMultiple;
        await createUserTemplate(
          {
            title: newTemplate.title,
            text: newTemplate.text,
            // Exclude template_id to let backend auto-generate unique ID
          },
          isImport
        );

        toast.success("Template erfolgreich erstellt");
      }

      setIsCreating(false);
      setIsCreatingMultiple(false);
      resetForm();
      refreshTemplates();
    } catch (err) {
      toast.error(`Fehler beim Erstellen: ${err.message}`);
      setIsCreatingMultiple(false);
    }
  };

  const handleStartEditing = (template) => {
    // Exit selection mode first if active
    if (selectionMode) {
      setSelectionMode(false);
      setSelectedTemplates(new Set());
    }

    // Cancel any creation mode
    if (isCreating) {
      setIsCreating(false);
      setImportMode(false);
      resetForm();
    }

    // Use requestAnimationFrame for smoother state transition
    requestAnimationFrame(() => {
      if (isMountedRef.current) {
        // For default templates, use the template ID directly
        // For user templates, use the template_db_id property
        const editId = template.user_created
          ? template.template_db_id
          : template.id;

        setIsEditing(editId);
        setEditedTemplate({
          title: template.title,
          text: template.text,
        });
      }
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
      const importResult = await importTemplateFromFile(file);

      // Remove template_id from imported data to allow auto-generation
      if (importResult.isMultiple) {
        // Multiple templates imported - remove template_id from all
        const templatesWithoutIds = importResult.templates.map((template) => ({
          title: template.title,
          text: template.text,
          // Exclude template_id to allow backend auto-generation
        }));

        setImportedData({
          ...importResult,
          templates: templatesWithoutIds,
        });
        setImportedSuccessfully(true);
        toast.success(
          `${importResult.count} Templates erfolgreich importiert!`
        );
      } else {
        // Single template imported - remove template_id
        const templateWithoutId = {
          title: importResult.template.title,
          text: importResult.template.text,
          // Exclude template_id to allow backend auto-generation
        };

        setNewTemplate(templateWithoutId);
        setImportedData({
          ...importResult,
          template: templateWithoutId,
        });
        setImportedSuccessfully(true);
        toast.success("Template erfolgreich importiert!");
      }
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

  // Download sample multiple templates
  const handleDownloadSampleMultiple = () => {
    try {
      downloadSampleMultipleTemplates();
      toast.success("Beispiel für mehrere Templates heruntergeladen!");
    } catch (error) {
      toast.error(`Fehler beim Download: ${error.message}`);
    }
  };

  // Selection mode functions
  const handleEnterSelectionMode = () => {
    // First cancel any ongoing editing to prevent MDEditor conflicts
    if (isEditing !== null) {
      setIsEditing(null);
      setEditedTemplate({
        title: "",
        text: "",
      });
    }

    // Cancel creation mode if active
    if (isCreating) {
      setIsCreating(false);
      setImportMode(false);
      resetForm();
    }

    // Enable selection mode immediately
    setSelectionMode(true);
    setSelectedTemplates(new Set());
  };

  const handleExitSelectionMode = () => {
    // Exit selection mode immediately
    setSelectionMode(false);
    setSelectedTemplates(new Set());
  };

  const handleToggleTemplateSelection = (templateId) => {
    const newSelected = new Set(selectedTemplates);
    if (newSelected.has(templateId)) {
      newSelected.delete(templateId);
    } else {
      newSelected.add(templateId);
    }
    setSelectedTemplates(newSelected);
  };

  const handleSelectAllTemplates = () => {
    const allTemplateIds = templates.map((t) => t.id);
    setSelectedTemplates(new Set(allTemplateIds));
  };

  const handleClearSelection = () => {
    setSelectedTemplates(new Set());
  };

  // Bulk export functions
  const handleBulkExportAsJSON = async () => {
    if (selectedTemplates.size === 0) {
      toast.error("Bitte wählen Sie mindestens ein Template aus");
      return;
    }

    if (isExporting) {
      return; // Prevent multiple simultaneous exports
    }

    setIsExporting(true);
    try {
      const selectedTemplateObjs = templates.filter((t) =>
        selectedTemplates.has(t.id)
      );

      // Use requestAnimationFrame to ensure DOM is stable before export
      await new Promise((resolve) => requestAnimationFrame(resolve));

      downloadMultipleTemplatesAsJSON(selectedTemplateObjs);
      toast.success(
        `${selectedTemplates.size} Templates erfolgreich als JSON exportiert`
      );

      // Exit selection mode after successful export
      handleExitSelectionMode();
    } catch (error) {
      console.error("Bulk export error:", error);
      toast.error(`Fehler beim Exportieren: ${error.message}`);
    } finally {
      // Use requestAnimationFrame instead of setTimeout for better performance
      requestAnimationFrame(() => {
        if (isMountedRef.current) {
          setIsExporting(false);
        }
      });
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-purple-400">
            Radiologie Vorlagen
          </h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          {selectionMode ? (
            <button
              onClick={handleExitSelectionMode}
              className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-3 sm:px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg text-sm sm:text-base"
            >
              <FaTimes className="text-sm" />
              <span className="whitespace-nowrap">Auswahl beenden</span>
            </button>
          ) : (
            <button
              onClick={handleEnterSelectionMode}
              className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 sm:px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-blue-500/25 text-sm sm:text-base"
            >
              <span className="whitespace-nowrap">Templates Exportieren</span>
            </button>
          )}
          {!selectionMode && (
            <>
              <button
                onClick={() => {
                  handleStartCreating();
                  setImportMode(true);
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 sm:px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-blue-500/25 text-sm sm:text-base"
              >
                <span className="whitespace-nowrap">Aus JSON importieren</span>
              </button>
              <button
                onClick={handleStartCreating}
                className="bg-purple-500 hover:bg-purple-600 text-white py-2 px-3 sm:px-4 rounded-lg transition-colors duration-200 flex items-center justify-center text-sm sm:text-base"
              >
                <span className="whitespace-nowrap">Neues Template</span>
              </button>
            </>
          )}
        </div>
      </div>

      <p className="text-gray-400 mb-6">
        Wähle aus vordefinierten Befundbausteinen für standardisierte
        Radiologieberichte oder erstelle deine eigenen:
      </p>

      {/* Expand/Collapse Controls */}
      {templates.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <div className="text-sm text-gray-300">
            {selectionMode ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <span className="font-medium text-center sm:text-left">
                  {selectedTemplates.size} von {templates.length} ausgewählt
                </span>
                {selectedTemplates.size > 0 && (
                  <div className="flex justify-center sm:justify-start">
                    <button
                      onClick={handleBulkExportAsJSON}
                      disabled={isExporting}
                      className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-colors duration-200 flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FaFileExport className="text-xs" />
                      <span className="whitespace-nowrap">
                        Als JSON exportieren
                      </span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center sm:text-left">
                <span className="font-medium">{templates.length}</span>{" "}
                Templates verfügbar
                {expandedTemplates.size > 0 && (
                  <span className="ml-2">
                    ({expandedTemplates.size} erweitert)
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {selectionMode ? (
              <>
                <button
                  onClick={handleSelectAllTemplates}
                  className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-1"
                >
                  <span className="whitespace-nowrap">Alle auswählen</span>
                </button>
                <button
                  onClick={handleClearSelection}
                  className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-gray-600/20 hover:bg-gray-600/30 text-gray-300 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-1"
                >
                  <span className="whitespace-nowrap">Auswahl löschen</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={expandAllTemplates}
                  className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-1"
                >
                  <FaExpandArrowsAlt className="text-xs" />
                  <span className="whitespace-nowrap">Alle erweitern</span>
                </button>
                <button
                  onClick={collapseAllTemplates}
                  className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-gray-600/20 hover:bg-gray-600/30 text-gray-300 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-1"
                >
                  <FaCompressArrowsAlt className="text-xs" />
                  <span className="whitespace-nowrap">Alle zuklappen</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Template Creation Form */}
      {isCreating && !selectionMode && (
        <div
          key="template-creation-form"
          className="mb-8 bg-gray-800 p-6 rounded-xl border border-purple-500/40"
        >
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
                            Laden Sie Beispiel-JSON-Dateien herunter, um das
                            korrekte Format zu verstehen.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={handleDownloadSample}
                              className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm rounded-lg transition-colors duration-200"
                            >
                              <FaDownload />
                              <span>Einzelnes Template</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleDownloadSampleMultiple}
                              className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded-lg transition-colors duration-200"
                            >
                              <FaDownload />
                              <span>Mehrere Templates</span>
                            </button>
                          </div>
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
                          {importedData?.isMultiple
                            ? `${importedData.count} Templates erfolgreich importiert!`
                            : "Template erfolgreich importiert!"}
                        </p>
                        <p className="text-sm text-gray-300">
                          {importedData?.isMultiple
                            ? "Die Templates sind bereit zum Erstellen. Überprüfen Sie die Vorschau unten."
                            : "Das Template ist bereit zum Erstellen. Überprüfen Sie die Vorschau unten."}
                        </p>
                        {/* Templates preview */}
                        {importedData && (
                          <div className="mt-3 space-y-2">
                            <h5 className="text-sm font-medium text-green-300">
                              {importedData.isMultiple
                                ? "Vorschau der importierten Templates:"
                                : "Vorschau des importierten Templates:"}
                            </h5>
                            <div className="max-h-40 overflow-y-auto space-y-2">
                              {(importedData.isMultiple
                                ? importedData.templates
                                : [importedData.template]
                              ).map((template, index) => (
                                <div
                                  key={index}
                                  className="bg-gray-800/50 rounded p-2 text-xs"
                                >
                                  <div className="font-medium text-gray-200">
                                    {template.title}
                                  </div>
                                  {template.template_id && (
                                    <div className="text-gray-400">
                                      ID: {template.template_id}
                                    </div>
                                  )}
                                  <div className="text-gray-400 truncate">
                                    {template.text.substring(0, 60)}...
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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

          {/* Form Fields - Only show in manual mode */}
          {!importMode && (
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

              {/* Template ID field removed - now auto-generated by backend */}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Template Text *
                </label>
                <div
                  data-color-mode="dark"
                  className="border border-gray-600 rounded-lg overflow-hidden"
                >
                  <MDEditor
                    key={`new-template-editor-${
                      importMode ? "import" : "manual"
                    }`}
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
                  disabled={isCreatingMultiple}
                  className={`px-6 py-2.5 text-white rounded-lg flex items-center space-x-2 transition-colors duration-200 shadow-lg ${
                    isCreatingMultiple
                      ? "bg-gray-500 cursor-not-allowed"
                      : "bg-purple-500 hover:bg-purple-600 hover:shadow-purple-500/25"
                  }`}
                >
                  {isCreatingMultiple ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>
                        {importedData?.isMultiple
                          ? `Templates werden erstellt...`
                          : "Template wird erstellt..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <FaSave className="text-sm" />
                      <span>
                        {importedData?.isMultiple
                          ? `${importedData.count} Templates erstellen`
                          : "Template speichern"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Template action buttons - shown when any templates are imported */}
          {importMode && importedSuccessfully && importedData && (
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
                type="button"
                onClick={handleCreateSubmit}
                disabled={isCreatingMultiple}
                className={`px-6 py-2.5 text-white rounded-lg flex items-center space-x-2 transition-colors duration-200 shadow-lg ${
                  isCreatingMultiple
                    ? "bg-gray-500 cursor-not-allowed"
                    : "bg-purple-500 hover:bg-purple-600 hover:shadow-purple-500/25"
                }`}
              >
                {isCreatingMultiple ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>
                      {importedData.isMultiple
                        ? "Templates werden erstellt..."
                        : "Template wird erstellt..."}
                    </span>
                  </>
                ) : (
                  <>
                    <FaSave className="text-sm" />
                    <span>
                      {importedData.isMultiple
                        ? `${importedData.count} Templates erstellen`
                        : "Template erstellen"}
                    </span>
                  </>
                )}
              </button>
            </div>
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
              const isSelectedForExport = selectedTemplates.has(tpl.id);

              return (
                <div
                  key={tpl.id}
                  className={`bg-gradient-to-br from-gray-800 to-gray-900 border rounded-xl p-6 hover:shadow-lg transition-all duration-300
                    ${
                      isSelected
                        ? "border-purple-500 shadow-lg shadow-purple-500/20"
                        : isSelectedForExport && selectionMode
                        ? "border-blue-500 shadow-lg shadow-blue-500/20 bg-blue-500/5"
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
                              key={`edit-user-template-${tpl.template_db_id}-${
                                isCurrentlyEditing ? "editing" : "stable"
                              }`}
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
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                        <div className="flex items-start w-full">
                          {selectionMode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleTemplateSelection(tpl.id);
                              }}
                              className="mr-3 mt-1 p-1 rounded transition-colors duration-200 hover:bg-gray-700 flex-shrink-0"
                            >
                              {isSelectedForExport ? (
                                <FaCheckSquare className="text-blue-400 text-lg" />
                              ) : (
                                <FaSquare className="text-gray-400 text-lg hover:text-gray-300" />
                              )}
                            </button>
                          )}
                          <div
                            className="flex-1 cursor-pointer min-w-0"
                            onClick={() => toggleTemplateExpansion(tpl.id)}
                          >
                            <div className="flex items-center space-x-2">
                              <h3 className="text-lg sm:text-xl font-semibold text-purple-300 hover:text-purple-200 transition-colors truncate">
                                {tpl.title}
                              </h3>
                              {isExpanded ? (
                                <FaChevronUp className="text-gray-400 text-sm flex-shrink-0" />
                              ) : (
                                <FaChevronDown className="text-gray-400 text-sm flex-shrink-0" />
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
                        </div>
                        <div className="flex space-x-1 sm:space-x-2 sm:ml-4 justify-end sm:justify-start flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditing(tpl);
                            }}
                            className="p-1.5 sm:p-2 hover:bg-blue-500/10 rounded-lg transition-colors duration-200 text-gray-400 hover:text-blue-400"
                            title="Template bearbeiten"
                          >
                            <FaEdit className="text-sm" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportTemplate(tpl);
                            }}
                            className="p-1.5 sm:p-2 hover:bg-green-500/10 rounded-lg transition-colors duration-200 text-gray-400 hover:text-green-400"
                            title="Template als JSON exportieren"
                          >
                            <FaDownload className="text-sm" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(tpl.template_db_id);
                            }}
                            className="p-1.5 sm:p-2 hover:bg-red-500/10 rounded-lg transition-colors duration-200 text-gray-400 hover:text-red-400"
                            title="Template löschen"
                          >
                            <FaTrashAlt className="text-sm" />
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
                          <div className="flex justify-center sm:justify-end">
                            <button
                              onClick={() => handleSelect(tpl.id)}
                              className="flex items-center justify-center space-x-2 bg-purple-500 hover:bg-purple-600 text-white py-2 px-3 sm:px-4 rounded-lg transition-colors duration-200 text-sm sm:text-base w-full sm:w-auto"
                            >
                              <span className="whitespace-nowrap">
                                Mit diesem Template fortfahren
                              </span>
                              <FaArrowRight className="text-sm flex-shrink-0" />
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
            const isSelectedForExport = selectedTemplates.has(tpl.id);
            // Check if this is an override of a default template
            const isOverride = tpl.is_default_override === true;

            return (
              <div
                key={tpl.id}
                className={`bg-gradient-to-br from-gray-800 to-gray-900 border rounded-xl p-6 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300
                  ${
                    isSelected
                      ? "border-purple-500 shadow-lg shadow-purple-500/20"
                      : isSelectedForExport && selectionMode
                      ? "border-blue-500 shadow-lg shadow-blue-500/20 bg-blue-500/5"
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
                            key={`edit-default-template-${tpl.id}-${
                              isCurrentlyEditing ? "editing" : "stable"
                            }`}
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
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                      <div className="flex items-start w-full">
                        {selectionMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleTemplateSelection(tpl.id);
                            }}
                            className="mr-3 mt-1 p-1 rounded transition-colors duration-200 hover:bg-gray-700 flex-shrink-0"
                          >
                            {isSelectedForExport ? (
                              <FaCheckSquare className="text-blue-400 text-lg" />
                            ) : (
                              <FaSquare className="text-gray-400 text-lg hover:text-gray-300" />
                            )}
                          </button>
                        )}
                        <div
                          className="flex-1 cursor-pointer min-w-0"
                          onClick={() => toggleTemplateExpansion(tpl.id)}
                        >
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg sm:text-xl font-semibold text-purple-300 hover:text-purple-200 transition-colors mb-1 truncate">
                              {tpl.title}
                            </h3>
                            {isExpanded ? (
                              <FaChevronUp className="text-gray-400 text-sm flex-shrink-0" />
                            ) : (
                              <FaChevronDown className="text-gray-400 text-sm flex-shrink-0" />
                            )}
                          </div>
                          {isOverride && (
                            <div className="text-xs text-blue-400 mb-2 flex items-center">
                              <span className="mr-1">●</span> Angepasste Version
                            </div>
                          )}
                          {!isExpanded && (
                            <div className="text-xs text-gray-500 mt-1 truncate">
                              {tpl.text
                                .replace(/[#*_`]/g, "")
                                .substring(0, 100)}
                              ...
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-1 sm:space-x-2 sm:ml-4 justify-end sm:justify-start flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEditing(tpl);
                          }}
                          className="p-1.5 sm:p-2 hover:bg-blue-500/10 rounded-lg transition-colors duration-200 text-gray-400 hover:text-blue-400"
                          title="Template bearbeiten"
                        >
                          <FaEdit className="text-sm" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportTemplate(tpl);
                          }}
                          className="p-1.5 sm:p-2 hover:bg-green-500/10 rounded-lg transition-colors duration-200 text-gray-400 hover:text-green-400"
                          title="Template als JSON exportieren"
                        >
                          <FaDownload className="text-sm" />
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
                          className="p-1.5 sm:p-2 hover:bg-red-500/10 rounded-lg transition-colors duration-200 text-gray-400 hover:text-red-400"
                          title={
                            isOverride
                              ? "Anpassungen löschen (auf Standard zurücksetzen)"
                              : "Template aus Ansicht entfernen"
                          }
                        >
                          <FaTrashAlt className="text-sm" />
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
                        <div className="flex justify-center sm:justify-end">
                          <button
                            onClick={() => handleSelect(tpl.id)}
                            className="flex items-center justify-center space-x-2 bg-purple-500 hover:bg-purple-600 text-white py-2 px-3 sm:px-4 rounded-lg transition-colors duration-200 text-sm sm:text-base w-full sm:w-auto"
                          >
                            <span className="whitespace-nowrap">
                              Mit diesem Template fortfahren
                            </span>
                            <FaArrowRight className="text-sm flex-shrink-0" />
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
