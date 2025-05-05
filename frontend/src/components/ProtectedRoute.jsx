import React, { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { isAuthenticated } from "../utils/auth";
import { toast } from "react-toastify";

function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const authenticated = isAuthenticated();

  useEffect(() => {
    // If the user isn't authenticated, show a message
    if (!authenticated) {
      toast.error("Your session has expired. Please log in again.");
    }
  }, [authenticated]);

  if (!authenticated) {
    // Not logged in -> redirect to login
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
