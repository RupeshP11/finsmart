import { useEffect, useState } from "react";
import "../styles/dashboard.css";

function Dashboard({ selectedMonth }) {
  const token = localStorage.getItem("token");

  const [summary, setSummary] = useState({
    income: 0,
    expense: 0,
    balance: 0,
  });

  const [alerts, setAlerts] = useState([]);
  const [categoryMap, setCategoryMap] = useState({});

  const [aiQuery, setAiQuery] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiType, setAiType] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  async function fetchMonthlySummary(month) {
    const res = await fetch(
      `http://127.0.0.1:8000/analytics/summary?month=${month}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();

    const income = data.total_income || 0;
    const expense = data.total_expense || 0;

    setSummary({
      income,
      expense,
      balance: income - expense,
    });
  }

  async function fetchCategories() {
    const res = await fetch("http://127.0.0.1:8000/categories", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    const map = {};
    data.forEach((c) => (map[c.id] = c.name));
    setCategoryMap(map);
  }

  async function fetchAlerts(month) {
    const res = await fetch(
      `http://127.0.0.1:8000/alerts?month=${month}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();

    const sorted = (data || []).sort((a, b) =>
      a.level === b.level ? 0 : a.level === "danger" ? -1 : 1
    );

    setAlerts(sorted.slice(0, 4));
  }

  async function handleAISearch(e) {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    setAiAnswer("");
    setAiType("");
    setAiLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/ai/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: aiQuery }),
      });

      const data = await res.json();

      if (data.type === "navigate") {
        window.location.href = data.target;
        return;
      }

      setAiAnswer(data.answer || data.message);
      setAiType(data.type);
    } catch {
      setAiAnswer("AI service unavailable. Please try again.");
      setAiType("fallback");
    } finally {
      setAiLoading(false);
    }

    setAiQuery("");
  }

  useEffect(() => {
    if (token) fetchCategories();
  }, [token]);

  useEffect(() => {
    if (token && selectedMonth) {
      fetchMonthlySummary(selectedMonth);
      fetchAlerts(selectedMonth);
    }
  }, [token, selectedMonth]);

  return (
    <div className="page-container">
      <div className="page-content">
        {/* Page Title */}
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <p className="subtitle">
            {new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {/* AI Box */}
        <div className="ai-box gradient-animate">
          <h3 className="ai-title">Ask FinSmart AI</h3>
          <p className="ai-description">
            Get instant answers about finance definitions, budgeting, SIP concepts, and savings strategies
          </p>

          <form onSubmit={handleAISearch} className="ai-form">
            <input
              type="text"
              placeholder="Ask a finance question…"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              className="ai-input"
              disabled={aiLoading}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ marginTop: "var(--space-md)" }}
              disabled={aiLoading}
            >
              {aiLoading ? "Thinking..." : "Ask"}
            </button>
          </form>

          {aiAnswer && (
            <div className="ai-answer fade-in">
              <strong>Answer:</strong>
              <p style={{ marginTop: "var(--space-sm)" }}>{aiAnswer}</p>
            </div>
          )}
        </div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="alert-box">
            <h3 className="alert-title">Overspending Alerts</h3>
            <div className="alerts-list">
              {alerts.map((a, i) => (
                <div
                  key={i}
                  className={`alert-item ${a.level === "danger" ? "danger" : "warning"}`}
                >
                  <span className="alert-content">
                    <strong>{categoryMap[a.category_id] || "Category"}</strong>
                    {" — "}
                    {a.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div>
          <h2 className="section-title">Monthly Summary</h2>
          <div className="card-grid stat-grid">
            {[
              {
                label: "Total Income",
                value: summary.income,
                color: "success",
              },
              {
                label: "Total Expense",
                value: summary.expense,
                color: "danger",
              },
              {
                label: "Balance",
                value: summary.balance,
                color: summary.balance >= 0 ? "success" : "danger",
              },
            ].map((item, i) => (
              <div key={i} className="stat-card">
                <div className="stat-label">{item.label}</div>
                <div className={`stat-value ${item.color}`}>
                  ₹{Math.abs(item.value).toLocaleString("en-IN")}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Educational Info Section */}
        <div className="page-info-section">
          <div className="info-content">
            <div className="info-text">
              <h3>Dashboard Overview</h3>
              <p>
                Your financial dashboard provides a real-time snapshot of your money. It combines income, expenses, and alerts to help you understand your financial health at a glance. Regular monitoring helps you catch spending patterns early and make informed financial decisions.
              </p>
              <ul className="info-list">
                <li>Review your balance regularly to track financial progress</li>
                <li>Pay attention to alerts - they indicate budget concerns early</li>
                <li>Compare monthly income against expenses to identify trends</li>
                <li>Use AI assistance to understand financial concepts and strategies</li>
              </ul>
            </div>
            <div className="info-image">
              <div className="info-placeholder">
                <img src="/images/dashboardimage.jpeg" alt="Dashboard Overview" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
