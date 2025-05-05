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

  const navigate = useNavigate();

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
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername,
          email: regEmail,
          password: regPassword,
        }),
      });
      const data = await response.json();

      if (response.ok) {
        // Clear registration form
        setRegUsername("");
        setRegEmail("");
        setRegPassword("");

        // Show success message and switch to login tab
        toast.success("Registration successful! Please login.");
        setIsLogin(true);

        // Pre-fill the login form with the email
        setIdentifier(regEmail);
      } else {
        toast.error(data.detail || "Registration failed");
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
            Medical Report Assistant
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
            Login
          </button>
          <button
            className={`flex-1 py-2 text-center border-b-2 font-semibold focus:outline-none transition-all ${
              !isLogin
                ? "border-blue-400 text-blue-400"
                : "border-transparent hover:border-gray-500"
            }`}
            onClick={() => setIsLogin(false)}
          >
            Register
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
              <label className="block mb-1">Password</label>
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
              Login
            </button>
          </form>
        )}

        {/* Register Form */}
        {!isLogin && (
          <form onSubmit={handleRegister}>
            <div className="mb-4">
              <label className="block mb-1">Username</label>
              <input
                type="text"
                required
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                className="w-full p-2 bg-gray-700 rounded"
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1">Email</label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full p-2 bg-gray-700 rounded"
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1">Password</label>
              <input
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full p-2 bg-gray-700 rounded"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-green-500 hover:bg-green-600 py-2 rounded font-semibold"
            >
              Register
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
