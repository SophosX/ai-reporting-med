// Authentication utilities

/**
 * Checks if the token is present and not expired
 * @returns {boolean} Whether the user is authenticated
 */
export const isAuthenticated = () => {
  const token = localStorage.getItem("token");
  if (!token) {
    return false;
  }

  try {
    // Try to decode the token to check expiration
    // This is a simple check without validation
    const payload = JSON.parse(atob(token.split(".")[1]));

    // Check if token is expired
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      console.log("Token expired");
      logout();
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error validating token:", error);
    logout();
    return false;
  }
};

/**
 * Logs out the user by removing the token and user_id from localStorage
 */
export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user_id");
  localStorage.removeItem("user");
};

// To prevent multiple session expired messages
let isRedirecting = false;

/**
 * Makes an authenticated API request, handling token expiration
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Promise} - Fetch response
 */
export const authenticatedFetch = async (url, options = {}) => {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Not authenticated");
  }

  // Add authorization header
  const fetchOptions = {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  const response = await fetch(url, fetchOptions);

  // If we get a 401 (Unauthorized), it means our token is invalid or expired
  if (response.status === 401) {
    logout();

    // Prevent multiple redirects and messages
    if (!isRedirecting) {
      isRedirecting = true;
      // Only redirect if we're not already on the login page
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
        throw new Error("Session expired. Please login again.");
      }
    }
    throw new Error("Authentication required");
  }

  return response;
};

/**
 * Gets the current user information from localStorage
 * @returns {Object|null} User object with id or null if not authenticated
 */
export const getCurrentUser = () => {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("user_id");
  
  if (!token || !isAuthenticated()) {
    return null;
  }
  
  return {
    id: userId,
    token: token
  };
};
