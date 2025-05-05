import { authenticatedFetch } from "./auth";
import API_URL from "./apiConfig";

export const fetchAllTemplates = async () => {
  try {
    const response = await authenticatedFetch(`${API_URL}/templates`);
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
    const response = await authenticatedFetch(`${API_URL}/user-templates`);
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

    const response = await authenticatedFetch(`${API_URL}/user-templates`, {
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
      `${API_URL}/user-templates/${templateId}`,
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
      `${API_URL}/user-templates/${templateId}`,
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
