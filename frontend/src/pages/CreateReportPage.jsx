const createReport = async (inputText, templateId) => {
  try {
    // First get the template text if a template is selected
    let templateText = "";
    if (templateId) {
      const templateResponse = await authenticatedFetch(
        `${API_URL}/templates/${templateId}`
      );
      if (templateResponse.ok) {
        const templateData = await templateResponse.json();
        templateText = templateData.text;
      }
    }

    const response = await authenticatedFetch(`${API_URL}/reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input_text: inputText,
        template_id: templateId,
        template_text: templateText, // Add template text to the report
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create report");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating report:", error);
    throw error;
  }
}; 