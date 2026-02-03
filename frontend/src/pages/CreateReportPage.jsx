/**
 * @fileoverview CreateReportPage - Hilfsfunktion für Berichterstellung.
 *
 * HINWEIS: Diese Datei enthält nur eine Hilfsfunktion, keine vollständige
 * React-Komponente. Sie wird vermutlich nicht mehr verwendet, da die
 * Berichterstellungs-Logik in NewReportPage integriert ist.
 *
 * Die Funktion holt zuerst den Template-Text und erstellt dann einen
 * Bericht über die API. Der Template-Text wird mitgespeichert, um
 * später den Diff-Vergleich zu ermöglichen.
 *
 * @deprecated Diese Funktion wird möglicherweise nicht mehr verwendet.
 *             Siehe NewReportPage.handleSaveReport für die aktuelle Implementierung.
 */

/**
 * Erstellt einen neuen Bericht mit optionalem Template.
 *
 * @param {string} inputText - Das Diktat/Stichpunkte des Radiologen
 * @param {string|null} templateId - Die ID des zu verwendenden Templates
 * @returns {Promise<Object>} Das erstellte Report-Objekt
 * @throws {Error} Wenn die Erstellung fehlschlägt
 */
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