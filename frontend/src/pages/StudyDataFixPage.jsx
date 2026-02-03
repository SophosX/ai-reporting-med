/**
 * @fileoverview StudyDataFixPage - Synchronisiert lokale Benutzerdaten.
 *
 * Diese Utility-Seite synchronisiert die im localStorage gespeicherten
 * Benutzerdaten mit dem Backend. Sie wird verwendet, wenn die lokalen
 * Daten veraltet sind (z.B. nach einem Backend-Update oder wenn der
 * Studienteilnehmer-Status geändert wurde).
 *
 * Workflow:
 * 1. Seite wird geladen (z.B. via /study/fix-data Route)
 * 2. API-Aufruf zu /study/study-mode/status
 * 3. localStorage "user" wird mit aktuellen Daten aktualisiert
 * 4. Nach 1 Sekunde Weiterleitung zur HomePage mit page reload
 *
 * Aktualisierte Felder:
 * - study_participant: Boolean ob Studienteilnehmer
 * - study_mode_active: Boolean ob Studienmodus aktiv
 * - experience_level: Erfahrungsstufe (assistenzarzt/facharzt/oberarzt)
 * - full_name: Vollständiger Name
 *
 * Die Seite zeigt nur einen Lade-Spinner und wird nicht interaktiv verwendet.
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authenticatedFetch } from "../utils/auth";
import API_URL from "../utils/apiConfig";

/**
 * Utility-Seite zur Synchronisierung der lokalen Benutzerdaten.
 *
 * Zeigt einen Lade-Spinner und leitet nach erfolgreicher Synchronisation
 * automatisch zur HomePage weiter.
 *
 * @returns {JSX.Element} Lade-Spinner oder Weiterleitungs-Nachricht
 */
function StudyDataFixPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fixUserData = async () => {
      try {
        // Fetch current user data from the study status endpoint
        const response = await authenticatedFetch(`${API_URL}/study/study-mode/status`);
        
        if (response.ok) {
          const data = await response.json();
          
          // Get existing user data or create new object
          const existingUser = JSON.parse(localStorage.getItem("user") || "{}");
          
          // Update with study information
          const updatedUser = {
            ...existingUser,
            study_participant: data.study_participant,
            study_mode_active: data.study_mode_active,
            experience_level: data.experience_level,
            full_name: data.full_name
          };
          
          // Save updated user data
          localStorage.setItem("user", JSON.stringify(updatedUser));
          
          console.log("User data updated:", updatedUser);
          
          // Redirect to home
          setTimeout(() => {
            navigate("/");
            // Force page reload to update navbar
            window.location.reload();
          }, 1000);
        }
      } catch (error) {
        console.error("Error fixing user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fixUserData();
  }, [navigate]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-white text-center">
      <div className="glass-effect rounded-xl shadow-lg p-8">
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Aktualisiere Benutzerdaten...</p>
          </>
        ) : (
          <p>Weiterleitung...</p>
        )}
      </div>
    </div>
  );
}

export default StudyDataFixPage;