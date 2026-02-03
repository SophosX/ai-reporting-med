/**
 * @fileoverview App - Haupt-Anwendungskomponente mit Routing.
 *
 * Diese Datei definiert die gesamte Routing-Struktur der Anwendung.
 * Sie verwendet React Router für clientseitiges Routing und
 * Context Provider für globalen State.
 *
 * Routing-Struktur:
 *
 * Öffentliche Routen (ohne Auth):
 * - /login - Anmeldung und Registrierung
 * - /register - Standalone-Registrierung
 *
 * Geschützte Routen (mit ProtectedRoute):
 * - / - HomePage (Dashboard)
 * - /templates - Template-Verwaltung
 * - /reports/new - Neuen Bericht erstellen
 * - /reports/history - Berichtshistorie
 * - /reports/:reportId - Einzelner Bericht
 * - /study/export - Eigene Studiendaten exportieren
 * - /admin/export - Admin-Export (alle Daten)
 * - /study/fix - Benutzerdaten-Synchronisation
 * - /study/manual-report - Manueller Bericht (ohne KI)
 *
 * Context Provider Hierarchie:
 * 1. BrowserRouter - Routing
 * 2. StudyProvider - Studien-Session-State (global)
 * 3. TemplateProvider - Template-State (nur wo benötigt)
 *
 * TemplateProvider wird pro Route eingefügt (nicht global), um
 * unnötige API-Aufrufe auf Seiten zu vermeiden, die keine
 * Templates benötigen.
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import TemplatesPage from "./pages/TemplatesPage";
import NewReportPage from "./pages/NewReportPage";
import ReportsHistoryPage from "./pages/ReportsHistoryPage";
import ReportDetailPage from "./pages/ReportDetailPage";
import StudyExportPage from "./pages/StudyExportPage";
import AdminExportPage from "./pages/AdminExportPage";
import StudyDataFixPage from "./pages/StudyDataFixPage";
import ManualReportPage from "./pages/ManualReportPage";
import { ToastContainer } from "react-toastify";
import { TemplateProvider } from "./context/TemplateContext";
import { StudyProvider } from "./context/StudyContext";

/**
 * Haupt-App-Komponente mit vollständiger Routing-Konfiguration.
 *
 * Rendert die Navbar global und wrappt geschützte Routen
 * mit ProtectedRoute für Authentifizierungsprüfung.
 *
 * @returns {JSX.Element} Die gesamte Anwendung
 */
function App() {
  return (
    <BrowserRouter>
      <StudyProvider>
        <div className="pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
          <Navbar />
          <Routes>
          {/* Public routes - no template provider needed */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes with TemplateProvider */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <TemplateProvider>
                  <HomePage />
                </TemplateProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/templates"
            element={
              <ProtectedRoute>
                <TemplateProvider>
                  <TemplatesPage />
                </TemplateProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/new"
            element={
              <ProtectedRoute>
                <TemplateProvider>
                  <NewReportPage />
                </TemplateProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/history"
            element={
              <ProtectedRoute>
                <TemplateProvider>
                  <ReportsHistoryPage />
                </TemplateProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/:reportId"
            element={
              <ProtectedRoute>
                <TemplateProvider>
                  <ReportDetailPage />
                </TemplateProvider>
              </ProtectedRoute>
            }
          />
          {/* Redirect /reports to /reports/history - must be after :reportId route */}
          <Route
            path="/reports"
            element={<Navigate to="/reports/history" replace />}
          />
          <Route
            path="/study/export"
            element={
              <ProtectedRoute>
                <StudyExportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/export"
            element={
              <ProtectedRoute>
                <AdminExportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/study/fix"
            element={
              <ProtectedRoute>
                <StudyDataFixPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/study/manual-report"
            element={
              <ProtectedRoute>
                <TemplateProvider>
                  <ManualReportPage />
                </TemplateProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
        {/* Toast container */}
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </div>
      </StudyProvider>
    </BrowserRouter>
  );
}

export default App;
