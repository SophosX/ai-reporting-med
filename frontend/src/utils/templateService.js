import { authenticatedFetch } from "./auth";
import API_URL from "./apiConfig";

export const fetchAllTemplates = async () => {
  try {
    const response = await authenticatedFetch(`${API_URL}/templates/`);
    if (!response.ok) {
      throw new Error("Failed to fetch templates");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching templates:", error);
    throw error;
  }
};

export const fetchUserTemplates = async () => {
  try {
    const response = await authenticatedFetch(`${API_URL}/user-templates/`);
    if (!response.ok) {
      throw new Error("Failed to fetch user templates");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching user templates:", error);
    throw error;
  }
};

export const createUserTemplate = async (templateData) => {
  try {
    // Make sure template_id is not an empty string
    const dataToSend = { ...templateData };
    if (dataToSend.template_id === "") {
      delete dataToSend.template_id;
    }

    const response = await authenticatedFetch(`${API_URL}/user-templates/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataToSend),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.detail || "Failed to create template";
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating template:", error);
    throw error;
  }
};

export const updateUserTemplate = async (templateId, templateData) => {
  try {
    const response = await authenticatedFetch(
      `${API_URL}/user-templates/${templateId}/`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(templateData),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.detail || "Failed to update template";
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating template:", error);
    throw error;
  }
};

export const deleteUserTemplate = async (templateId) => {
  try {
    const response = await authenticatedFetch(
      `${API_URL}/user-templates/${templateId}/`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.detail || "Failed to delete template";
      throw new Error(errorMessage);
    }

    return true;
  } catch (error) {
    console.error("Error deleting template:", error);
    throw error;
  }
};

export const updateDefaultTemplate = async (templateId, templateData) => {
  try {
    // Using the PUT endpoint, which will now create an override
    const response = await authenticatedFetch(
      `${API_URL}/templates/${templateId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(templateData),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.detail || "Failed to update template";
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating default template:", error);
    throw error;
  }
};

// Updated to handle deletion of default templates and their overrides
export const deleteDefaultTemplate = async (templateId) => {
  try {
    const response = await authenticatedFetch(
      `${API_URL}/templates/${templateId}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.detail || "Failed to delete template";
      throw new Error(errorMessage);
    }

    return true;
  } catch (error) {
    console.error("Error deleting default template:", error);
    throw error;
  }
};

// Export template to JSON
export const exportTemplateToJSON = (template) => {
  const exportData = {
    title: template.title,
    template_id: template.template_id || template.id,
    text: template.text,
    exported_at: new Date().toISOString(),
    version: "1.0",
  };

  return JSON.stringify(exportData, null, 2);
};

// Download template as JSON file
export const downloadTemplateAsJSON = (template) => {
  const jsonData = exportTemplateToJSON(template);
  const blob = new Blob([jsonData], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  // Create safe filename
  const safeTitle = template.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const filename = `template_${safeTitle}_${
    new Date().toISOString().split("T")[0]
  }.json`;

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Parse and validate imported JSON template
export const parseImportedTemplate = (jsonString) => {
  try {
    const parsed = JSON.parse(jsonString);

    // Validate required fields
    if (!parsed.title || typeof parsed.title !== "string") {
      throw new Error("Template must have a valid title");
    }

    if (!parsed.text || typeof parsed.text !== "string") {
      throw new Error("Template must have valid text content");
    }

    // Return sanitized template data
    return {
      title: parsed.title.trim(),
      template_id: parsed.template_id || "",
      text: parsed.text.trim(),
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Invalid JSON format");
    }
    throw error;
  }
};

// Import template from file
export const importTemplateFromFile = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file selected"));
      return;
    }

    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
      reject(new Error("Please select a JSON file"));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const templateData = parseImportedTemplate(e.target.result);
        resolve(templateData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
};

// Create and download sample template JSON file
export const downloadSampleTemplate = () => {
  const sampleTemplate = {
    title: "MRT Wirbelsäule - Beispiel Template",
    template_id: "mrt-spine-sample",
    text: "# MRT-Befund Wirbelsäule\n\n## Untersuchung\n**Untersuchung:** MRT der Lendenwirbelsäule\n**Sequenzen:** T1w sagittal, T2w sagittal, T2w axial\n\n## Befund\n### Wirbelkörper\n- Regelrechte Signalintensität und Höhe der Wirbelkörper\n- Keine Frakturen oder destruktiven Läsionen\n\n### Bandscheiben\n- Bandscheiben L1/L2 bis L4/L5: Regelrechte Signalintensität und Höhe\n- **L5/S1:** [BEFUND EINTRAGEN]\n\n### Spinalkanal\n- Regelrechte Weite des Spinalkanals\n- Keine Zeichen einer Spinalkanalstenose\n\n## Beurteilung\n[BEURTEILUNG EINTRAGEN]\n\n---\n*Erstellt mit AI Reporting System*",
    exported_at: new Date().toISOString(),
    version: "1.0",
  };

  const jsonData = JSON.stringify(sampleTemplate, null, 2);
  const blob = new Blob([jsonData], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const filename = `sample_template_${
    new Date().toISOString().split("T")[0]
  }.json`;

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
