/**
 * Centralized API configuration
 * This file manages the API URL across the application.
 * It reads from the environment variables (.env file) or falls back to a default URL.
 */

// Read API URL from environment variables (.env file) or use fallback
// For production, use /api which will be proxied by nginx to the backend
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default API_URL;
