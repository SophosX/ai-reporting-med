/**
 * @fileoverview LoginPage - Authentifizierungs-Seite mit Login und Registrierung.
 *
 * Diese Seite bietet zwei Tab-Ansichten:
 * - Anmelden: Login mit Email/Username und Passwort
 * - Registrieren: Neuen Account erstellen mit optionaler Studienteilnahme
 *
 * Features:
 * - Flexible Login-Identifizierung (Email ODER Username)
 * - Optionale Studienteilnahme bei Registrierung
 * - Studien-Token-Validierung
 * - Erfahrungslevel-Auswahl (Assistenzarzt/Facharzt/Oberarzt)
 * - Client-seitige Validierung mit Fehlermeldungen
 * - Automatisches Wechseln zum Login-Tab nach erfolgreicher Registrierung
 *
 * Nach erfolgreichem Login werden in localStorage gespeichert:
 * - token: JWT-Token für API-Authentifizierung
 * - user_id: Benutzer-ID
 * - user: Vollständiges User-Objekt mit Study-Status
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaFlask, FaInfoCircle, FaUser, FaBriefcase } from "react-icons/fa";
import API_URL from "../utils/apiConfig";

/**
 * Kombinierte Login/Registrierungs-Seite mit Tab-Navigation.
 *
 * @returns {JSX.Element} Die gerenderte Login/Register-Seite
 */
function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState(""); // Hier kann Email oder Username eingegeben werden
  const [password, setPassword] = useState("");

  const [regEmail, setRegEmail] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");
  const [regErrors, setRegErrors] = useState({});
  
  // Study fields
  const [isStudyParticipant, setIsStudyParticipant] = useState(false);
  const [studyToken, setStudyToken] = useState("");
  const [fullName, setFullName] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");

  const navigate = useNavigate();

  // Validation for registration form
  const validateRegistration = () => {
    const errors = {};

    if (!regUsername.trim()) {
      errors.username = "Username is required";
    } else if (regUsername.length < 3) {
      errors.username = "Username must be at least 3 characters long";
    }

    if (!regEmail.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) {
      errors.email = "Please enter a valid email address";
    }

    if (!regPassword) {
      errors.password = "Password is required";
    } else if (regPassword.length < 6) {
      errors.password = "Password must be at least 6 characters long";
    }

    if (!regPasswordConfirm) {
      errors.passwordConfirm = "Please confirm your password";
    } else if (regPassword !== regPasswordConfirm) {
      errors.passwordConfirm = "Passwords do not match";
    }

    // Study participant validation
    if (isStudyParticipant) {
      if (!studyToken.trim()) {
        errors.studyToken = "Study token is required for study participants";
      }
      if (!fullName.trim()) {
        errors.fullName = "Full name is required for study participants";
      }
      if (!experienceLevel) {
        errors.experienceLevel = "Experience level is required for study participants";
      }
    }

    setRegErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("user_id", data.user_id);
        // Store user information
        const userInfo = {
          id: data.user_id,
          username: data.username,
          email: data.email,
          full_name: data.full_name,
          study_participant: data.study_participant,
          experience_level: data.experience_level,
          study_mode_active: data.study_mode_active
        };
        localStorage.setItem("user", JSON.stringify(userInfo));
        toast.success("Login erfolgreich!");
        navigate("/");
      } else {
        toast.error(data.detail || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("An error occurred. Please try again.");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // Clear previous errors
    setRegErrors({});

    // Validate form
    if (!validateRegistration()) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername,
          email: regEmail,
          password: regPassword,
          password_confirm: regPasswordConfirm,
          ...(isStudyParticipant && {
            study_token: studyToken,
            full_name: fullName,
            experience_level: experienceLevel,
          }),
        }),
      });
      const data = await response.json();

      if (response.ok) {
        // Clear registration form
        setRegUsername("");
        setRegEmail("");
        setRegPassword("");
        setRegPasswordConfirm("");
        setRegErrors({});
        setIsStudyParticipant(false);
        setStudyToken("");
        setFullName("");
        setExperienceLevel("");

        // Show success message and switch to login tab
        toast.success("Registration successful! Please login.");
        setIsLogin(true);

        // Pre-fill the login form with the email
        setIdentifier(regEmail);
      } else {
        // Handle specific error messages from the backend
        if (data.detail) {
          if (data.detail.includes("Username already exists")) {
            setRegErrors({ username: data.detail });
          } else if (
            data.detail.includes("Email address is already registered")
          ) {
            setRegErrors({ email: data.detail });
          } else if (data.detail.includes("Passwords do not match")) {
            setRegErrors({ passwordConfirm: data.detail });
          } else if (data.detail.includes("Invalid study token")) {
            setRegErrors({ studyToken: data.detail });
          } else {
            toast.error(data.detail);
          }
        } else {
          toast.error("Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.");
        }
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("An error occurred. Please try again.");
    }
  };

  return (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white min-h-screen flex items-center justify-center">
      <div className="bg-gray-800 p-6 rounded shadow-md w-full max-w-md">
        <div className="mb-4 text-center">
          <h1 className="text-2xl text-blue-400 font-semibold">
            Medizinischer Berichtsassistent
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex mb-6">
          <button
            className={`flex-1 py-2 text-center border-b-2 font-semibold focus:outline-none transition-all ${
              isLogin
                ? "border-blue-400 text-blue-400"
                : "border-transparent hover:border-gray-500"
            }`}
            onClick={() => setIsLogin(true)}
          >
            Anmelden
          </button>
          <button
            className={`flex-1 py-2 text-center border-b-2 font-semibold focus:outline-none transition-all ${
              !isLogin
                ? "border-blue-400 text-blue-400"
                : "border-transparent hover:border-gray-500"
            }`}
            onClick={() => setIsLogin(false)}
          >
            Registrieren
          </button>
        </div>

        {/* Login Form */}
        {isLogin && (
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block mb-1">Email oder Username</label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full p-2 bg-gray-700 rounded"
                placeholder="Email oder Username eingeben"
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1">Passwort</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 bg-gray-700 rounded"
                placeholder="Passwort eingeben"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 py-2 rounded font-semibold"
            >
              Anmelden
            </button>
          </form>
        )}

        {/* Register Form */}
        {!isLogin && (
          <form onSubmit={handleRegister}>
            <div className="mb-4">
              <label className="block mb-1">Benutzername</label>
              <input
                type="text"
                required
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                className={`w-full p-2 bg-gray-700 rounded border ${
                  regErrors.username ? "border-red-500" : "border-gray-600"
                }`}
                placeholder="Benutzername eingeben"
              />
              {regErrors.username && (
                <p className="text-red-400 text-sm mt-1">
                  {regErrors.username}
                </p>
              )}
            </div>
            <div className="mb-4">
              <label className="block mb-1">E-Mail</label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className={`w-full p-2 bg-gray-700 rounded border ${
                  regErrors.email ? "border-red-500" : "border-gray-600"
                }`}
                placeholder="E-Mail eingeben"
              />
              {regErrors.email && (
                <p className="text-red-400 text-sm mt-1">{regErrors.email}</p>
              )}
            </div>
            <div className="mb-4">
              <label className="block mb-1">Passwort</label>
              <input
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className={`w-full p-2 bg-gray-700 rounded border ${
                  regErrors.password ? "border-red-500" : "border-gray-600"
                }`}
                placeholder="Passwort eingeben (min. 6 Zeichen)"
              />
              {regErrors.password && (
                <p className="text-red-400 text-sm mt-1">
                  {regErrors.password}
                </p>
              )}
            </div>
            <div className="mb-4">
              <label className="block mb-1">Passwort bestätigen</label>
              <input
                type="password"
                required
                value={regPasswordConfirm}
                onChange={(e) => setRegPasswordConfirm(e.target.value)}
                className={`w-full p-2 bg-gray-700 rounded border ${
                  regErrors.passwordConfirm
                    ? "border-red-500"
                    : "border-gray-600"
                }`}
                placeholder="Passwort bestätigen"
              />
              {regErrors.passwordConfirm && (
                <p className="text-red-400 text-sm mt-1">
                  {regErrors.passwordConfirm}
                </p>
              )}
            </div>
            
            {/* Study Participation Section */}
            <div className="mb-4 p-3 bg-purple-900/20 border border-purple-600/50 rounded-lg">
              <div className="flex items-center mb-2">
                <FaFlask className="text-purple-400 mr-2" />
                <h3 className="font-semibold">Studienteilnahme</h3>
              </div>
              
              <label className="flex items-center cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={isStudyParticipant}
                  onChange={(e) => setIsStudyParticipant(e.target.checked)}
                  className="mr-2 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500"
                />
                <span className="text-sm">
                  Ich möchte an der Studie zur radiologischen Effizienz teilnehmen
                </span>
              </label>
              
              {isStudyParticipant && (
                <div className="space-y-3 mt-3">
                  <div className="p-2 bg-blue-900/30 border border-blue-700 rounded text-xs">
                    <div className="flex items-start">
                      <FaInfoCircle className="text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                      <p className="text-blue-200">
                        Diese Studie untersucht die Effizienz der KI-gestützten Berichterstellung.
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block mb-1 text-sm">Studien-Token *</label>
                    <input
                      type="text"
                      value={studyToken}
                      onChange={(e) => setStudyToken(e.target.value.toUpperCase())}
                      className={`w-full p-2 bg-gray-600 rounded border ${
                        regErrors.studyToken ? "border-red-500" : "border-gray-500"
                      }`}
                      placeholder="Token eingeben"
                    />
                    {regErrors.studyToken && (
                      <p className="text-red-400 text-xs mt-1">{regErrors.studyToken}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block mb-1 text-sm">
                      <FaUser className="inline mr-1" />
                      Vollständiger Name *
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={`w-full p-2 bg-gray-600 rounded border ${
                        regErrors.fullName ? "border-red-500" : "border-gray-500"
                      }`}
                      placeholder="Dr. Max Mustermann"
                    />
                    {regErrors.fullName && (
                      <p className="text-red-400 text-xs mt-1">{regErrors.fullName}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block mb-1 text-sm">
                      <FaBriefcase className="inline mr-1" />
                      Erfahrungsstufe *
                    </label>
                    <select
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                      className={`w-full p-2 bg-gray-600 rounded border ${
                        regErrors.experienceLevel ? "border-red-500" : "border-gray-500"
                      }`}
                    >
                      <option value="">Wählen Sie Ihre Erfahrungsstufe</option>
                      <option value="assistenzarzt">Assistenzarzt</option>
                      <option value="facharzt">Facharzt</option>
                      <option value="oberarzt">Oberarzt</option>
                    </select>
                    {regErrors.experienceLevel && (
                      <p className="text-red-400 text-xs mt-1">{regErrors.experienceLevel}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <button
              type="submit"
              className="w-full bg-green-500 hover:bg-green-600 py-2 rounded font-semibold"
            >
              Registrieren
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
