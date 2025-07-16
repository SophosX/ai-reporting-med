import React, { createContext, useContext, useState, useEffect } from "react";
import { authenticatedFetch } from "../utils/auth";
import API_URL from "../utils/apiConfig";

const StudyContext = createContext();

export function useStudy() {
  return useContext(StudyContext);
}

export function StudyProvider({ children }) {
  const [isStudyMode, setIsStudyMode] = useState(false);
  const [studySessionId, setStudySessionId] = useState(null);
  const [studyTimerData, setStudyTimerData] = useState(null);
  const [generatedReportId, setGeneratedReportId] = useState(null);
  const [editOperations, setEditOperations] = useState(0);
  const [originalGeneratedText, setOriginalGeneratedText] = useState("");
  const [firstGenerationTime, setFirstGenerationTime] = useState(null);

  // Load study mode status on mount
  useEffect(() => {
    checkStudyMode();
  }, []);

  const checkStudyMode = async () => {
    try {
      const response = await authenticatedFetch(
        `${API_URL}/study/study-mode/status`
      );
      
      if (response.ok) {
        const data = await response.json();
        // Only set study mode active if user is a study participant AND has study mode active
        setIsStudyMode(data.study_participant && data.study_mode_active);
      }
    } catch (error) {
      console.error("Error checking study mode:", error);
    }
  };

  const startStudySession = async (templateId = null) => {
    try {
      const response = await authenticatedFetch(
        `${API_URL}/study/study-session/start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            template_id: templateId || null,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStudySessionId(data.session_id);
        return data.session_id;
      }
    } catch (error) {
      console.error("Error starting study session:", error);
      throw error;
    }
  };

  const value = {
    isStudyMode,
    setIsStudyMode,
    studySessionId,
    setStudySessionId,
    studyTimerData,
    setStudyTimerData,
    generatedReportId,
    setGeneratedReportId,
    editOperations,
    setEditOperations,
    originalGeneratedText,
    setOriginalGeneratedText,
    firstGenerationTime,
    setFirstGenerationTime,
    checkStudyMode,
    startStudySession,
  };

  return (
    <StudyContext.Provider value={value}>
      {children}
    </StudyContext.Provider>
  );
}