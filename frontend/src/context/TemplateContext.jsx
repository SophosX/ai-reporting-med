/**
 * @fileoverview TemplateContext - Globaler State für Templates.
 *
 * Dieser Context verwaltet den globalen Template-Zustand der Anwendung.
 * Er ermöglicht das Teilen von Templates zwischen verschiedenen Komponenten
 * ohne Prop-Drilling.
 *
 * Features:
 * - Lazy Loading: Templates werden erst bei Bedarf geladen
 * - Caching: Einmal geladene Templates bleiben im State
 * - Authentifizierungs-Check: Keine API-Aufrufe ohne Login
 * - Fehlerbehandlung: Mit Toast-Benachrichtigungen
 *
 * State-Werte:
 * - selectedTemplateId: Das aktuell ausgewählte Template
 * - templates: Array aller geladenen Templates
 * - loading: Boolean während des Ladens
 * - error: Fehlermeldung falls Laden fehlschlägt
 * - initialized: True nach erstem erfolgreichen Laden
 *
 * Verwendung:
 * ```jsx
 * // In App.jsx
 * <TemplateProvider>
 *   <App />
 * </TemplateProvider>
 *
 * // In einer Komponente
 * const { templates, loadTemplates, selectedTemplateId } = useTemplate();
 * ```
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import { fetchAllTemplates } from "../utils/templateService";
import { toast } from "react-toastify";
import { isAuthenticated } from "../utils/auth";

/**
 * React Context für Template-State.
 * @type {React.Context}
 */
const TemplateContext = createContext();

/**
 * Provider-Komponente für den Template-Context.
 *
 * Wrapt die Anwendung und stellt den Template-State allen
 * Kind-Komponenten zur Verfügung.
 *
 * @param {Object} props - Komponenten-Props
 * @param {React.ReactNode} props.children - Kind-Komponenten
 * @returns {JSX.Element} Der Context-Provider mit Kindern
 */
export const TemplateProvider = ({ children }) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  // Only fetch templates when they're actually needed and if user is authenticated
  const loadTemplates = async () => {
    // Skip if we already have templates or are not authenticated
    if (templates.length > 0 || !isAuthenticated()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchAllTemplates();
      setTemplates(data);
      setInitialized(true);
    } catch (err) {
      console.error("Error loading templates:", err);
      // Don't show toast on initial load, only when explicitly refreshing
      if (initialized) {
        setError("Failed to load templates");
        toast.error("Failed to load templates");
      }
    } finally {
      setLoading(false);
    }
  };

  // Refresh templates
  const refreshTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAllTemplates();
      setTemplates(data);
      setInitialized(true);
      return data;
    } catch (err) {
      console.error("Error refreshing templates:", err);
      setError("Failed to refresh templates");
      toast.error("Failed to refresh templates");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    selectedTemplateId,
    setSelectedTemplateId,
    templates,
    setTemplates,
    loading,
    error,
    refreshTemplates,
    loadTemplates,
    initialized,
  };

  return (
    <TemplateContext.Provider value={value}>
      {children}
    </TemplateContext.Provider>
  );
};

/**
 * Custom Hook für den Zugriff auf den Template-Context.
 *
 * Muss innerhalb eines TemplateProvider verwendet werden.
 *
 * @returns {Object} Der Template-Context mit allen State-Werten und Funktionen
 * @property {string} selectedTemplateId - ID des ausgewählten Templates
 * @property {Function} setSelectedTemplateId - Setter für selectedTemplateId
 * @property {Array} templates - Array aller Templates
 * @property {Function} setTemplates - Setter für templates (für direkte Updates)
 * @property {boolean} loading - True während Templates geladen werden
 * @property {string|null} error - Fehlermeldung oder null
 * @property {Function} refreshTemplates - Erzwingt Neuladen der Templates
 * @property {Function} loadTemplates - Lädt Templates (mit Cache-Check)
 * @property {boolean} initialized - True nach erstem Laden
 * @throws {Error} Wenn außerhalb eines TemplateProvider verwendet
 *
 * @example
 * const { templates, selectedTemplateId, setSelectedTemplateId } = useTemplate();
 */
export const useTemplate = () => {
  const context = useContext(TemplateContext);
  if (context === undefined) {
    throw new Error("useTemplate must be used within a TemplateProvider");
  }
  return context;
};
