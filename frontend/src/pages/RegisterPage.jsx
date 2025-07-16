import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaInfoCircle, FaFlask, FaUser, FaBriefcase } from "react-icons/fa";
import API_URL from "../utils/apiConfig";

function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  
  // Study fields
  const [isStudyParticipant, setIsStudyParticipant] = useState(false);
  const [studyToken, setStudyToken] = useState("");
  const [fullName, setFullName] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  
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

    // Study participant validation
    if (isStudyParticipant) {
      if (!studyToken.trim()) {
        newErrors.studyToken = "Study token is required for study participants";
      }
      if (!fullName.trim()) {
        newErrors.fullName = "Full name is required for study participants";
      }
      if (!experienceLevel) {
        newErrors.experienceLevel = "Experience level is required for study participants";
      }
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
      const requestBody = {
        username,
        email,
        password,
        password_confirm: passwordConfirm,
      };

      // Add study fields if participant
      if (isStudyParticipant) {
        requestBody.study_token = studyToken;
        requestBody.full_name = fullName;
        requestBody.experience_level = experienceLevel;
      }

      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
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
          } else if (data.detail.includes("Invalid study token")) {
            setErrors({ studyToken: data.detail });
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
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4 py-8">
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

          {/* Study Participation Section */}
          <div className="mb-6 p-4 bg-purple-900/30 border-2 border-purple-600 rounded-lg shadow-lg">
            <div className="flex items-center mb-3">
              <FaFlask className="text-purple-400 mr-2 text-xl" />
              <h3 className="text-white font-semibold text-lg">Studienteilnahme</h3>
            </div>
            
            <div className="mb-3">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isStudyParticipant}
                  onChange={(e) => setIsStudyParticipant(e.target.checked)}
                  className="mr-2 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500"
                  disabled={isLoading}
                />
                <span className="text-gray-300 text-sm">
                  Ich möchte an der Studie zur radiologischen Effizienz teilnehmen
                </span>
              </label>
            </div>

            {isStudyParticipant && (
              <div className="space-y-3 mt-3">
                <div className="p-3 bg-blue-900/30 border border-blue-700 rounded-md">
                  <div className="flex items-start">
                    <FaInfoCircle className="text-blue-400 mt-1 mr-2 flex-shrink-0" />
                    <p className="text-sm text-blue-200">
                      Diese Studie untersucht die Effizienz der KI-gestützten Berichterstellung 
                      durch Messung von Zeitmetriken und Qualitätsindikatoren. Ihre Daten werden 
                      für wissenschaftliche Analysen verwendet.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Studien-Token *
                  </label>
                  <input
                    type="text"
                    value={studyToken}
                    onChange={(e) => setStudyToken(e.target.value.toUpperCase())}
                    className={`w-full px-3 py-2 bg-gray-600 border rounded-lg focus:outline-none focus:ring-2 text-white ${
                      errors.studyToken
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-500 focus:ring-purple-500"
                    }`}
                    placeholder="Geben Sie Ihren Studien-Einladungstoken ein"
                    disabled={isLoading}
                  />
                  {errors.studyToken && (
                    <p className="text-red-400 text-sm mt-1">{errors.studyToken}</p>
                  )}
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    <FaUser className="inline mr-1" />
                    Vollständiger Name *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={`w-full px-3 py-2 bg-gray-600 border rounded-lg focus:outline-none focus:ring-2 text-white ${
                      errors.fullName
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-500 focus:ring-purple-500"
                    }`}
                    placeholder="Dr. Max Mustermann"
                    disabled={isLoading}
                  />
                  {errors.fullName && (
                    <p className="text-red-400 text-sm mt-1">{errors.fullName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    <FaBriefcase className="inline mr-1" />
                    Erfahrungsstufe *
                  </label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className={`w-full px-3 py-2 bg-gray-600 border rounded-lg focus:outline-none focus:ring-2 text-white ${
                      errors.experienceLevel
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-500 focus:ring-purple-500"
                    }`}
                    disabled={isLoading}
                  >
                    <option value="">Wählen Sie Ihre Erfahrungsstufe</option>
                    <option value="assistenzarzt">Assistenzarzt</option>
                    <option value="facharzt">Facharzt</option>
                    <option value="oberarzt">Oberarzt</option>
                  </select>
                  {errors.experienceLevel && (
                    <p className="text-red-400 text-sm mt-1">{errors.experienceLevel}</p>
                  )}
                </div>
              </div>
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