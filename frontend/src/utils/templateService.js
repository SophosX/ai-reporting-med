/**
 * @fileoverview templateService - API-Service für Template-Verwaltung.
 *
 * Dieses Modul stellt alle Template-bezogenen API-Funktionen bereit.
 * Es abstrahiert die HTTP-Aufrufe und bietet eine einheitliche Schnittstelle
 * für CRUD-Operationen auf Templates sowie Import/Export-Funktionalität.
 *
 * Template-Typen:
 * - Standard-Templates: Vordefinierte System-Templates (GET /templates/)
 * - User-Templates: Vom Benutzer erstellte Templates (GET /user-templates/)
 * - Overrides: Benutzer-Anpassungen von Standard-Templates
 *
 * API-Endpunkte:
 * - GET /templates/ - Alle Templates (Standard + User + Overrides)
 * - GET /user-templates/ - Nur eigene Templates
 * - POST /user-templates/ - Neues Template erstellen
 * - PUT /user-templates/:id/ - Template aktualisieren
 * - DELETE /user-templates/:id/ - Template löschen
 * - PUT /templates/:id - Standard-Template überschreiben (Override)
 * - DELETE /templates/:id - Override löschen / Template ausblenden
 *
 * Import/Export:
 * - JSON-Export (einzeln und bulk)
 * - JSON-Import mit Validierung
 * - Beispiel-Templates zum Download
 * - ZIP-Export für mehrere Templates (optional)
 */

import { authenticatedFetch } from "./auth";
import API_URL from "./apiConfig";

/**
 * Lädt alle verfügbaren Templates (Standard + User + Overrides).
 *
 * Die API gibt bereits eine zusammengeführte Liste zurück,
 * wobei Overrides die Standard-Templates ersetzen.
 *
 * @returns {Promise<Array>} Array aller Template-Objekte
 * @throws {Error} Bei Netzwerk- oder Authentifizierungsfehlern
 *
 * @example
 * const templates = await fetchAllTemplates();
 * // templates[0] = { id: "mrt-spine", title: "MRT Wirbelsäule", text: "...", user_created: false }
 */
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

/**
 * Lädt nur die eigenen User-Templates (ohne Standard-Templates).
 *
 * @returns {Promise<Array>} Array der eigenen Template-Objekte
 * @throws {Error} Bei Netzwerk- oder Authentifizierungsfehlern
 */
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

/**
 * Erstellt ein neues User-Template.
 *
 * Die template_id wird automatisch vom Backend generiert
 * (slugified title + optional numeric suffix bei Konflikten).
 *
 * @param {Object} templateData - Die Template-Daten
 * @param {string} templateData.title - Titel des Templates
 * @param {string} templateData.text - Markdown-Inhalt
 * @param {boolean} [fromImport=false] - True wenn aus JSON importiert (andere ID-Generierung)
 * @returns {Promise<Object>} Das erstellte Template mit generierter ID
 * @throws {Error} Bei Validierungs- oder Authentifizierungsfehlern
 *
 * @example
 * const newTemplate = await createUserTemplate({
 *   title: "MRT Knie",
 *   text: "# MRT Knie\n\n..."
 * });
 */
export const createUserTemplate = async (templateData, fromImport = false) => {
  try {
    // Make sure template_id is not an empty string
    const dataToSend = { ...templateData };
    if (dataToSend.template_id === "") {
      delete dataToSend.template_id;
    }

    // Add query parameter for imports
    const url = fromImport
      ? `${API_URL}/user-templates/?from_import=true`
      : `${API_URL}/user-templates/`;

    const response = await authenticatedFetch(url, {
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

/**
 * Erstellt mehrere User-Templates in einer Batch-Operation.
 *
 * Verarbeitet Templates einzeln, sodass Fehler bei einem Template
 * nicht die anderen blockieren. Gibt detaillierte Ergebnisse zurück.
 *
 * @param {Array<Object>} templatesData - Array von Template-Daten
 * @returns {Promise<Object>} Ergebnis-Objekt mit Erfolgen und Fehlern
 * @property {Array} successful - Erfolgreich erstellte Templates
 * @property {Array} failed - Fehlgeschlagene Templates mit Fehlermeldung
 * @property {number} successCount - Anzahl erfolgreicher Erstellungen
 * @property {number} failureCount - Anzahl fehlgeschlagener Erstellungen
 *
 * @example
 * const result = await createMultipleUserTemplates([
 *   { title: "Template 1", text: "..." },
 *   { title: "Template 2", text: "..." }
 * ]);
 * console.log(`${result.successCount} erstellt, ${result.failureCount} fehlgeschlagen`);
 */
export const createMultipleUserTemplates = async (templatesData) => {
  try {
    const results = [];
    const errors = [];

    // Create templates one by one to handle individual failures
    for (let i = 0; i < templatesData.length; i++) {
      try {
        // Pass true for fromImport since this function is only used for JSON imports
        const result = await createUserTemplate(templatesData[i], true);
        results.push({ success: true, template: result, index: i });
      } catch (error) {
        errors.push({
          success: false,
          error: error.message,
          index: i,
          title: templatesData[i].title,
        });
      }
    }

    return {
      successful: results,
      failed: errors,
      totalAttempted: templatesData.length,
      successCount: results.length,
      failureCount: errors.length,
    };
  } catch (error) {
    console.error("Error creating multiple templates:", error);
    throw error;
  }
};

/**
 * Aktualisiert ein bestehendes User-Template.
 *
 * @param {number} templateId - Die Datenbank-ID des Templates
 * @param {Object} templateData - Die aktualisierten Daten
 * @param {string} [templateData.title] - Neuer Titel
 * @param {string} [templateData.text] - Neuer Inhalt
 * @returns {Promise<Object>} Das aktualisierte Template
 * @throws {Error} Bei Validierungs- oder Berechtigungsfehlern
 */
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

/**
 * Löscht ein User-Template permanent.
 *
 * @param {number} templateId - Die Datenbank-ID des Templates
 * @returns {Promise<boolean>} True bei Erfolg
 * @throws {Error} Bei Berechtigungs- oder Nicht-gefunden-Fehlern
 */
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

/**
 * Erstellt eine Benutzer-Überschreibung (Override) für ein Standard-Template.
 *
 * Das Original-Template bleibt unverändert. Stattdessen wird ein
 * UserTemplate mit is_default_override=true erstellt, das für diesen
 * Benutzer Priorität hat.
 *
 * @param {string} templateId - Die ID des Standard-Templates (z.B. "mrt-spine")
 * @param {Object} templateData - Die angepassten Daten
 * @returns {Promise<Object>} Das Override-Template
 * @throws {Error} Bei Fehlern
 */
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

/**
 * Löscht eine Override oder blendet ein Standard-Template aus.
 *
 * Verhalten je nach Template-Typ:
 * - Bei Override: Löscht die Überschreibung, Standard wird wieder sichtbar
 * - Bei Standard: Markiert als gelöscht (erscheint nicht mehr in Liste)
 *
 * @param {string} templateId - Die ID des Templates
 * @returns {Promise<boolean>} True bei Erfolg
 * @throws {Error} Bei Berechtigungsfehlern
 */
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

/**
 * Konvertiert ein Template-Objekt in einen JSON-String.
 *
 * Fügt Export-Metadaten (Zeitstempel, Version) hinzu.
 *
 * @param {Object} template - Das Template-Objekt
 * @returns {string} Formatierter JSON-String
 */
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

/**
 * Lädt ein einzelnes Template als JSON-Datei herunter.
 *
 * Erstellt einen temporären Download-Link und löst ihn aus.
 * Der Dateiname wird aus dem Template-Titel generiert.
 *
 * @param {Object} template - Das zu exportierende Template
 * @throws {Error} Bei Download-Fehlern
 *
 * @example
 * downloadTemplateAsJSON(myTemplate);
 * // Lädt: template_mrt_wirbelsaeule_2025-02-03.json
 */
export const downloadTemplateAsJSON = (template) => {
  const jsonData = exportTemplateToJSON(template);
  const blob = new Blob([jsonData], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  // Create safe filename
  const safeTitle = template.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const filename = `template_${safeTitle}_${
    new Date().toISOString().split("T")[0]
  }.json`;

  // Use a more robust download approach
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();

    // Clean up with a small delay to ensure download starts
    setTimeout(() => {
      try {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
      } catch (error) {
        console.warn("Cleanup warning:", error);
      }
    }, 100);
  } catch (error) {
    console.error("Download error:", error);
    URL.revokeObjectURL(url);
    throw error;
  }
};

/**
 * Parst und validiert importierte JSON-Template-Daten.
 *
 * Unterstützt zwei Formate:
 * 1. Einzelnes Template: { title, text, ... }
 * 2. Mehrere Templates: { templates: [...], template_count: n }
 *
 * Validiert Pflichtfelder (title, text) und gibt sanitisierte Daten zurück.
 *
 * @param {string} jsonString - Der JSON-String aus der Datei
 * @returns {Object} Validiertes Import-Objekt
 * @property {boolean} isMultiple - True wenn Bulk-Import
 * @property {Object} [template] - Einzelnes Template (wenn !isMultiple)
 * @property {Array} [templates] - Array von Templates (wenn isMultiple)
 * @property {number} [count] - Anzahl der Templates (wenn isMultiple)
 * @throws {Error} Bei ungültigem JSON oder fehlenden Pflichtfeldern
 *
 * @example
 * const result = parseImportedTemplate('{"title":"Test","text":"..."}');
 * if (result.isMultiple) {
 *   result.templates.forEach(t => createTemplate(t));
 * } else {
 *   createTemplate(result.template);
 * }
 */
export const parseImportedTemplate = (jsonString) => {
  try {
    const parsed = JSON.parse(jsonString);

    // Check if this is a multiple template format (exported from bulk export)
    if (parsed.templates && Array.isArray(parsed.templates)) {
      // Validate multiple template format
      if (
        !parsed.template_count ||
        parsed.template_count !== parsed.templates.length
      ) {
        throw new Error(
          "Invalid multiple template format: template_count mismatch"
        );
      }

      // Validate each template in the array
      const validatedTemplates = parsed.templates.map((template, index) => {
        if (!template.title || typeof template.title !== "string") {
          throw new Error(`Template ${index + 1} must have a valid title`);
        }

        if (!template.text || typeof template.text !== "string") {
          throw new Error(`Template ${index + 1} must have valid text content`);
        }

        return {
          title: template.title.trim(),
          text: template.text.trim(),
          // template_id excluded to allow backend auto-generation
        };
      });

      return {
        isMultiple: true,
        templates: validatedTemplates,
        count: validatedTemplates.length,
      };
    } else {
      // Single template format
      // Validate required fields
      if (!parsed.title || typeof parsed.title !== "string") {
        throw new Error("Template must have a valid title");
      }

      if (!parsed.text || typeof parsed.text !== "string") {
        throw new Error("Template must have valid text content");
      }

      // Return sanitized template data
      return {
        isMultiple: false,
        template: {
          title: parsed.title.trim(),
          text: parsed.text.trim(),
          // template_id excluded to allow backend auto-generation
        },
      };
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Invalid JSON format");
    }
    throw error;
  }
};

/**
 * Importiert ein Template aus einer JSON-Datei.
 *
 * Liest die Datei über FileReader und parst/validiert den Inhalt.
 * Gibt ein Promise zurück, das mit den validierten Daten auflöst.
 *
 * @param {File} file - Die hochgeladene Datei
 * @returns {Promise<Object>} Validiertes Import-Objekt (wie parseImportedTemplate)
 * @throws {Error} Bei Datei-Lese-Fehlern oder ungültigem Format
 */
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

/**
 * Lädt ein Beispiel-Template als JSON herunter.
 *
 * Dient als Vorlage für das erwartete Import-Format.
 * Enthält ein vollständiges MRT-Wirbelsäule-Template.
 */
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

  // Use a more robust download approach
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();

    // Clean up with a small delay to ensure download starts
    setTimeout(() => {
      try {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
      } catch (error) {
        console.warn("Cleanup warning:", error);
      }
    }, 100);
  } catch (error) {
    console.error("Download error:", error);
    URL.revokeObjectURL(url);
    throw error;
  }
};

/**
 * Lädt ein Beispiel für Bulk-Import mit mehreren Templates herunter.
 *
 * Zeigt das Format für den Import mehrerer Templates gleichzeitig.
 * Enthält zwei Beispiel-Templates (MRT Wirbelsäule, CT Thorax).
 */
export const downloadSampleMultipleTemplates = () => {
  const sampleMultipleTemplates = {
    exported_at: new Date().toISOString(),
    version: "1.0",
    template_count: 2,
    templates: [
      {
        title: "MRT Wirbelsäule - Beispiel Template",
        template_id: "mrt-spine-sample",
        text: "# MRT-Befund Wirbelsäule\n\n## Untersuchung\n**Untersuchung:** MRT der Lendenwirbelsäule\n**Sequenzen:** T1w sagittal, T2w sagittal, T2w axial\n\n## Befund\n### Wirbelkörper\n- Regelrechte Signalintensität und Höhe der Wirbelkörper\n- Keine Frakturen oder destruktiven Läsionen\n\n### Bandscheiben\n- Bandscheiben L1/L2 bis L4/L5: Regelrechte Signalintensität und Höhe\n- **L5/S1:** [BEFUND EINTRAGEN]\n\n### Spinalkanal\n- Regelrechte Weite des Spinalkanals\n- Keine Zeichen einer Spinalkanalstenose\n\n## Beurteilung\n[BEURTEILUNG EINTRAGEN]\n\n---\n*Erstellt mit AI Reporting System*",
        user_created: false,
        is_default_override: false,
      },
      {
        title: "CT Thorax - Beispiel Template",
        template_id: "ct-thorax-sample",
        text: "# CT-Befund Thorax\n\n## Untersuchung\n**Untersuchung:** CT des Thorax\n**Kontrastmittel:** [KM-Gabe spezifizieren]\n\n## Befund\n### Lunge\n- Regelrechte Belüftung beider Lungen\n- Keine Infiltrate oder Raumforderungen\n\n### Mediastinum\n- Mediastinum mittelständig\n- Herz regelrecht konfiguriert\n\n### Pleura\n- Keine Pleuraergüsse\n- Keine Pneumothoraxzeichen\n\n## Beurteilung\n[BEURTEILUNG EINTRAGEN]\n\n---\n*Erstellt mit AI Reporting System*",
        user_created: false,
        is_default_override: false,
      },
    ],
  };

  const jsonData = JSON.stringify(sampleMultipleTemplates, null, 2);
  const blob = new Blob([jsonData], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const filename = `sample_multiple_templates_${
    new Date().toISOString().split("T")[0]
  }.json`;

  // Use a more robust download approach
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();

    // Clean up with a small delay to ensure download starts
    setTimeout(() => {
      try {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
      } catch (error) {
        console.warn("Cleanup warning:", error);
      }
    }, 100);
  } catch (error) {
    console.error("Download error:", error);
    URL.revokeObjectURL(url);
    throw error;
  }
};

/**
 * Exportiert mehrere Templates als ZIP-Archiv.
 *
 * Jedes Template wird als separate JSON-Datei im ZIP gespeichert.
 * Verwendet dynamischen Import von JSZip nur bei Bedarf.
 *
 * @param {Array<Object>} templates - Die zu exportierenden Templates
 * @throws {Error} Bei Export-Fehlern
 */
export const downloadMultipleTemplatesAsZip = async (templates) => {
  // Dynamically import JSZip only when needed
  const JSZip = (await import("jszip")).default;

  const zip = new JSZip();
  const timestamp = new Date().toISOString().split("T")[0];

  templates.forEach((template, index) => {
    const jsonData = exportTemplateToJSON(template);
    const safeTitle = template.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const filename = `${String(index + 1).padStart(2, "0")}_${safeTitle}.json`;
    zip.file(filename, jsonData);
  });

  // Generate ZIP file
  const zipBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipBlob);

  const filename = `templates_export_${timestamp}.zip`;

  // Use a more robust download approach
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();

    // Clean up with a small delay to ensure download starts
    setTimeout(() => {
      try {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
      } catch (error) {
        console.warn("Cleanup warning:", error);
      }
    }, 100);
  } catch (error) {
    console.error("Download error:", error);
    URL.revokeObjectURL(url);
    throw error;
  }
};

/**
 * Exportiert mehrere Templates als einzelne JSON-Datei.
 *
 * Bevorzugtes Format für Bulk-Export, da es ohne externe
 * Bibliotheken funktioniert und einfach wieder importiert werden kann.
 *
 * @param {Array<Object>} templates - Die zu exportierenden Templates
 * @throws {Error} Bei Export-Fehlern
 *
 * @example
 * downloadMultipleTemplatesAsJSON(selectedTemplates);
 * // Lädt: templates_bulk_export_2025-02-03.json
 */
export const downloadMultipleTemplatesAsJSON = (templates) => {
  const exportData = {
    exported_at: new Date().toISOString(),
    version: "1.0",
    template_count: templates.length,
    templates: templates.map((template) => ({
      title: template.title,
      template_id: template.template_id || template.id,
      text: template.text,
      user_created: template.user_created || false,
      is_default_override: template.is_default_override || false,
    })),
  };

  const jsonData = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonData], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `templates_bulk_export_${timestamp}.json`;

  // Use a more robust download approach
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();

    // Clean up with a small delay to ensure download starts
    setTimeout(() => {
      try {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
      } catch (error) {
        console.warn("Cleanup warning:", error);
      }
    }, 100);
  } catch (error) {
    console.error("Download error:", error);
    URL.revokeObjectURL(url);
    throw error;
  }
};

// Conflict resolution functions removed since template IDs are now auto-generated
