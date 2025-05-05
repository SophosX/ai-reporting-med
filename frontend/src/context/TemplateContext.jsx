import React, { createContext, useContext, useState, useEffect } from "react";
import { fetchAllTemplates } from "../utils/templateService";
import { toast } from "react-toastify";
import { isAuthenticated } from "../utils/auth";

// Create the context
const TemplateContext = createContext();

// Create a provider component
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

// Custom hook to use the context
export const useTemplate = () => {
  const context = useContext(TemplateContext);
  if (context === undefined) {
    throw new Error("useTemplate must be used within a TemplateProvider");
  }
  return context;
};
