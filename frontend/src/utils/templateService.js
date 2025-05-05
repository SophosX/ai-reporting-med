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

// Deprecated - No longer used as the reset functionality has been removed
// Keeping the function signature to prevent any unexpected references but making it clear it's not functional
export const deleteDefaultTemplate = async (templateId) => {
  console.warn("deleteDefaultTemplate is deprecated and no longer functional");
  throw new Error("This functionality has been removed");
};
