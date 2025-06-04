import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import API_URL from "../utils/apiConfig";

function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState(""); // Hier kann Email oder Username eingegeben werden
  const [password, setPassword] = useState("");

  const [regEmail, setRegEmail] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");
  const [regErrors, setRegErrors] = useState({});

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
        toast.success("Login successful!");
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
          } else {
            toast.error(data.detail);
          }
        } else {
          toast.error("Registration failed. Please try again.");
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
