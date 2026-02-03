/**
 * @fileoverview ProtectedRoute-Komponente - Zugriffskontrolle für geschützte Seiten.
 *
 * Diese Wrapper-Komponente schützt Routen, die eine Authentifizierung erfordern.
 * Nicht authentifizierte Benutzer werden automatisch zur Login-Seite weitergeleitet.
 */

import React, { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { isAuthenticated } from "../utils/auth";
import { toast } from "react-toastify";

/**
 * Route-Wrapper für Authentifizierungsprüfung.
 *
 * Prüft den Authentifizierungsstatus und:
 * - Zeigt die geschützte Komponente wenn authentifiziert
 * - Leitet zur Login-Seite weiter wenn nicht authentifiziert
 * - Zeigt eine Toast-Benachrichtigung bei Session-Ablauf
 *
 * @param {Object} props - Komponenten-Props
 * @param {React.ReactNode} props.children - Die zu schützende(n) Kind-Komponente(n)
 * @returns {JSX.Element} Die geschützte Komponente oder Redirect
 *
 * @example
 * <Route path="/dashboard" element={
 *   <ProtectedRoute>
 *     <Dashboard />
 *   </ProtectedRoute>
 * } />
 */
function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const authenticated = isAuthenticated();

  useEffect(() => {
    // If the user isn't authenticated, show a message
    if (!authenticated) {
      toast.error("Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.");
    }
  }, [authenticated]);

  if (!authenticated) {
    // Not logged in -> redirect to login
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
