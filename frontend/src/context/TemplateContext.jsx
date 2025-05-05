import React, { createContext, useContext, useState, useEffect } from "react";
import { fetchAllTemplates } from "../utils/templateService";
import { toast } from "react-toastify";

// Create the context
const TemplateContext = createContext();

// Create a provider component
export const TemplateProvider = ({ children }) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch templates on component mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchAllTemplates();
        setTemplates(data);
      } catch (err) {
        console.error("Error loading templates:", err);
        setError("Failed to load templates");
        toast.error("Failed to load templates");
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, []);

  // Refresh templates
  const refreshTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAllTemplates();
      setTemplates(data);
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
