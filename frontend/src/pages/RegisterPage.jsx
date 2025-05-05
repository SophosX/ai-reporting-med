import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API_URL from "../utils/apiConfig";

function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await response.json();

      if (response.ok) {
        alert("Registrierung erfolgreich!");
        navigate("/");
      } else {
        alert(data.detail || "Registrierung fehlgeschlagen");
      }
    } catch (error) {
      console.error("Fehler bei der Registrierung:", error);
      alert("Ein Fehler ist aufgetreten.");
    }
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Register</h2>
      <form onSubmit={handleRegister}>
        <div>
          <label>Benutzername:</label>
          <input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div style={{ marginTop: "0.5rem" }}>
          <label>Email:</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div style={{ marginTop: "0.5rem" }}>
          <label>Passwort:</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" style={{ marginTop: "1rem" }}>
          Registrieren
        </button>
      </form>
    </div>
  );
}

export default RegisterPage;
