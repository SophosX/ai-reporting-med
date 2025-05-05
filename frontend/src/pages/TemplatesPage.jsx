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
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useTemplate } from "../context/TemplateContext";
import { toast } from "react-toastify";
import {
  createUserTemplate,
  updateUserTemplate,
  deleteUserTemplate,
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
  } = useTemplate();
  const navigate = useNavigate();

  // State for creating/editing templates
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [newTemplate, setNewTemplate] = useState({
    title: "",
    template_id: "",
    text: "",
  });
  const [editedTemplate, setEditedTemplate] = useState({
    title: "",
    text: "",
  });

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
  };

  const handleStartCreating = () => {
    setIsCreating(true);
    setIsEditing(null);
    resetForm();
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
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
    setIsEditing(template.template_db_id);
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

  const handleEditSubmit = async (e, templateId) => {
    e.preventDefault();
    try {
      if (!editedTemplate.title || !editedTemplate.text) {
        toast.error("Bitte alle Pflichtfelder ausfüllen");
        return;
      }

      await updateUserTemplate(templateId, {
        title: editedTemplate.title,
        text: editedTemplate.text,
      });

      toast.success("Template erfolgreich aktualisiert");
      setIsEditing(null);
      refreshTemplates();
    } catch (err) {
      toast.error(`Fehler beim Aktualisieren: ${err.message}`);
    }
  };

  const handleDelete = async (templateId) => {
    if (!window.confirm("Möchten Sie dieses Template wirklich löschen?")) {
      return;
    }

    try {
      await deleteUserTemplate(templateId);
      toast.success("Template erfolgreich gelöscht");
      refreshTemplates();
    } catch (err) {
      toast.error(`Fehler beim Löschen: ${err.message}`);
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
  const defaultTemplates = templates.filter((t) => !t.user_created);
  const userTemplates = templates.filter((t) => t.user_created);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 text-white">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
        <FaBookMedical className="text-2xl text-purple-400" />
          <h2 className="text-3xl font-bold text-purple-400">
            Radiologie Templates
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

      {/* Template Creation Form */}
      {isCreating && (
        <div className="mb-8 bg-gray-800 p-6 rounded-xl border border-purple-500/40">
          <h3 className="text-xl font-semibold text-purple-300 mb-4 flex items-center">
            <FaPlus className="mr-2" />
            Neues Template erstellen
          </h3>
          <form onSubmit={handleCreateSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Titel *
              </label>
              <input
                type="text"
                value={newTemplate.title}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, title: e.target.value })
                }
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="z.B. MRT Wirbelsäule"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
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
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="z.B. mrt-spine (wird automatisch generiert, wenn leer)"
              />
              <p className="text-xs text-gray-400 mt-1">
                Nur Buchstaben, Zahlen und Bindestriche. Leer lassen für
                automatische Generierung.
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Template Text *
              </label>
              <div data-color-mode="dark">
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
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancelCreate}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center space-x-1"
              >
                <FaUndo className="text-sm" />
                <span>Abbrechen</span>
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg flex items-center space-x-1"
              >
                <FaSave className="text-sm" />
                <span>Speichern</span>
              </button>
            </div>
          </form>
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
                        <h3 className="text-xl font-semibold text-purple-300">
                          {tpl.title}
                        </h3>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleStartEditing(tpl)}
                            className="p-2 hover:bg-blue-500/10 rounded-lg transition-colors duration-200 text-gray-400 hover:text-blue-400"
                            title="Template bearbeiten"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDelete(tpl.template_db_id)}
                            className="p-2 hover:bg-red-500/10 rounded-lg transition-colors duration-200 text-gray-400 hover:text-red-400"
                            title="Template löschen"
                          >
                            <FaTrashAlt />
                          </button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-300 whitespace-pre-wrap">
                        <div data-color-mode="dark">
                          <MDEditor.Markdown
                            source={tpl.text}
                            rehypePlugins={[[rehypeSanitize]]}
                          />
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
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
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Default Templates Section */}
      <div>
        <h3 className="text-xl font-semibold text-purple-300 mb-4 flex items-center">
          <FaBookMedical className="mr-2" />
          Standard Templates
        </h3>
      <div className="space-y-6">
          {defaultTemplates.map((tpl) => {
            const isSelected = tpl.id === selectedTemplateId;
          return (
            <div
              key={tpl.id}
              className={`bg-gradient-to-br from-gray-800 to-gray-900 border rounded-xl p-6 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300
                  ${
                    isSelected
                      ? "border-purple-500 shadow-lg shadow-purple-500/20"
                      : "border-gray-700/50"
                  }
              `}
            >
                <h3 className="text-xl font-semibold text-purple-300 mb-3">
                  {tpl.title}
                </h3>
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                {tpl.text}
              </pre>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => handleSelect(tpl.id)}
                  className="flex items-center space-x-2 bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  <span>Mit diesem Template fortfahren</span>
                  <FaArrowRight />
                </button>
              </div>
            </div>
            );
        })}
        </div>
      </div>
    </div>
  );
}

export default TemplatesPage;
