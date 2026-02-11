import { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/login.css";
import { API_BASE_URL } from "../config";

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  async function handleSignup(e) {
    e.preventDefault();
    setMessage("");
    setMessageType("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      const data = await response.json();
      console.log("Signup response:", data);

      if (response.ok) {
        setMessage("Signup successful. Now log in.");
        setMessageType("success");
      } else {
        setMessage(data.detail || "Signup failed. Please try again.");
        setMessageType("error");
      }

    } catch (error) {
      console.error("Signup error:", error);
      setMessage("Something went wrong. Please try again.");
      setMessageType("error");
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-title">
          Create your <span>FinSmart</span> account
        </div>
        <div className="auth-subtitle">Start tracking your finances in minutes</div>

        {message && (
          <div className={`auth-message ${messageType}`}>{message}</div>
        )}

        <form className="auth-form" onSubmit={handleSignup}>
          <div className="input-group">
            <label htmlFor="email" className="label">
              Email address
            </label>
            <input
              autoComplete="off"
              name="Email"
              id="email"
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              autoComplete="off"
              name="Password"
              id="password"
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-submit">
            Create account
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{" "}
          <Link className="auth-link" to="/login">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Signup;
