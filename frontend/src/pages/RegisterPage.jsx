import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import API_URL from "../utils/apiConfig";

function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Client-side validation
  const validateForm = () => {
    const newErrors = {};

    // Username validation
    if (!username.trim()) {
      newErrors.username = "Username is required";
    } else if (username.length < 3) {
      newErrors.username = "Username must be at least 3 characters long";
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      newErrors.username =
        "Username can only contain letters, numbers, hyphens, and underscores";
    }

    // Email validation
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters long";
    }

    // Password confirmation validation
    if (!passwordConfirm) {
      newErrors.passwordConfirm = "Please confirm your password";
    } else if (password !== passwordConfirm) {
      newErrors.passwordConfirm = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // Clear previous errors
    setErrors({});

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          password,
          password_confirm: passwordConfirm,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Registration successful! You can now log in.");
        navigate("/login");
      } else {
        // Handle specific error messages from the backend
        if (data.detail) {
          if (data.detail.includes("Username already exists")) {
            setErrors({ username: data.detail });
          } else if (
            data.detail.includes("Email address is already registered")
          ) {
            setErrors({ email: data.detail });
          } else if (data.detail.includes("Passwords do not match")) {
            setErrors({ passwordConfirm: data.detail });
          } else {
            toast.error(data.detail);
          }
        } else {
          toast.error("Registration failed. Please try again.");
        }
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(
        "A network error occurred. Please check your connection and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          Register
        </h2>

        <form onSubmit={handleRegister} noValidate>
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Username *
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 text-white ${
                errors.username
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-600 focus:ring-blue-500"
              }`}
              placeholder="Enter your username"
              disabled={isLoading}
            />
            {errors.username && (
              <p className="text-red-400 text-sm mt-1">{errors.username}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 text-white ${
                errors.email
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-600 focus:ring-blue-500"
              }`}
              placeholder="Enter your email address"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-red-400 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Password *
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 text-white ${
                errors.password
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-600 focus:ring-blue-500"
              }`}
              placeholder="Enter your password (min. 6 characters)"
              disabled={isLoading}
            />
            {errors.password && (
              <p className="text-red-400 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Confirm Password *
            </label>
            <input
              type="password"
              required
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 text-white ${
                errors.passwordConfirm
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-600 focus:ring-blue-500"
              }`}
              placeholder="Confirm your password"
              disabled={isLoading}
            />
            {errors.passwordConfirm && (
              <p className="text-red-400 text-sm mt-1">
                {errors.passwordConfirm}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2 px-4 rounded-lg font-semibold transition-colors ${
              isLoading
                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {isLoading ? "Registering..." : "Register"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
