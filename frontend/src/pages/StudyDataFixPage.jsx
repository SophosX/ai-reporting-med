import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authenticatedFetch } from "../utils/auth";
import API_URL from "../utils/apiConfig";

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