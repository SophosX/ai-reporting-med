// Utility functions for study-related authentication checks

export const isStudyParticipant = () => {
  const userStr = localStorage.getItem("user");
  if (!userStr) return false;
  
  try {
    const user = JSON.parse(userStr);
    return user.study_participant === true;
  } catch (error) {
    console.error("Error parsing user data:", error);
    return false;
  }
};

export const getStudyUserInfo = () => {
  const userStr = localStorage.getItem("user");
  if (!userStr) return null;
  
  try {
    const user = JSON.parse(userStr);
    return {
      isStudyParticipant: user.study_participant || false,
      experienceLevel: user.experience_level || null,
      fullName: user.full_name || null
    };
  } catch (error) {
    console.error("Error parsing user data:", error);
    return null;
  }
};