import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/login.css";
import { API_BASE_URL } from "../config";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add("auth-layout");
    return () => document.body.classList.remove("auth-layout");
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setMessage("");
    setMessageType("");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.access_token);

        // 🔑 tell App.jsx auth state changed
        onLogin();

        // 🔀 redirect immediately
        navigate("/dashboard");
      } else {
        setMessage(data.detail || "Invalid credentials. Please try again.");
        setMessageType("error");
      }
    } catch (error) {
      console.error("Login error:", error);
      if (error.name === 'AbortError') {
        setMessage("Request timed out. Please try again.");
      } else {
        setMessage("Unable to connect. Please try again.");
      }
      setMessageType("error");
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-title">
          Welcome back to <span>FinSmart</span>
        </div>
        <div className="auth-subtitle">Log in to your account</div>

        {message && (
          <div className={`auth-message ${messageType}`}>{message}</div>
        )}

        <form className="auth-form" onSubmit={handleLogin}>
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

          <div>
            <a className="auth-link" href="#">
              Forgot your password?
            </a>
          </div>

          <button type="submit" className="auth-submit">
            Submit
          </button>
        </form>

        <div className="auth-footer">
          Don&apos;t have an account yet?{" "}
          <Link className="auth-link" to="/signup">
            Sign up for free!
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
