import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import { ToastContainer } from "react-toastify";
import { TemplateProvider } from "./context/TemplateContext";
import { StudyProvider } from "./context/StudyContext";

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
