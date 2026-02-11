import { useEffect, useState } from "react";
import "../styles/budget.css";
import { API_BASE_URL } from "../config";

function getAlertByPercentage(percentage) {
  if (percentage >= 100) return { level: "danger", text: "Budget exceeded" };
  if (percentage >= 80) return { level: "warning", text: "Approaching limit" };
  return { level: "success", text: "Within budget" };
}

function getProgressColor(percentage) {
  if (percentage >= 100) return "#dc2626";
  if (percentage >= 80) return "#d97706";
  return "#16a34a";
}

function Budget({ selectedMonth }) {
  const token = localStorage.getItem("token");

  const [categories, setCategories] = useState([]);
  const [budgetData, setBudgetData] = useState({});
  const [inputLimits, setInputLimits] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  async function fetchCategories() {
    const res = await fetch(`${API_BASE_URL}/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return data.filter((c) => c.type === "expense");
  }

  async function fetchBudgetUsage(categoryId, month) {
    const res = await fetch(
      `${API_BASE_URL}/budget/usage/${categoryId}?month=${month}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return await res.json();
  }

  async function loadBudgetData(month) {
    setLoading(true);

    const cats = await fetchCategories();
    setCategories(cats);

    const temp = {};
    const limits = {};

    for (const cat of cats) {
      const usage = await fetchBudgetUsage(cat.id, month);
      temp[cat.id] = usage;
      if (usage?.limit) limits[cat.id] = usage.limit;
    }

    setBudgetData(temp);
    setInputLimits(limits);
    setLoading(false);
  }

  useEffect(() => {
    if (token && selectedMonth) {
      loadBudgetData(selectedMonth);
    }
  }, [token, selectedMonth]);

  async function saveBudget(categoryId) {
    const limit = Number(inputLimits[categoryId]);
    if (!limit || limit <= 0) {
      alert("Please enter a valid budget limit");
      return;
    }

    await fetch(`${API_BASE_URL}/budget/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ category_id: categoryId, monthly_limit: limit }),
    });

    // Trigger alert check for this category
    await fetch(
      `${API_BASE_URL}/budget/check-alerts/${categoryId}?month=${selectedMonth}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setEditingId(null);
    loadBudgetData(selectedMonth);
  }

  const totalBudget = Object.values(inputLimits).reduce(
    (sum, limit) => sum + (Number(limit) || 0),
    0
  );
  const totalSpent = Object.values(budgetData).reduce(
    (sum, data) => sum + (data.used || 0),
    0
  );

  return (
    <div className="page-container">
      <div className="page-content">
        {/* Page Header */}
        <div className="budget-header">
          <h1>Budget Planner</h1>
          <p className="subtitle">
            {new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="loading-state">
            <p>Updating budget data…</p>
          </div>
        )}

       {/* Budget Summary Card */}
        {!loading && (
          <div className="budget-summary">
            <div className="summary-item">
              <p className="summary-label">Total Budget</p>
              <p className="summary-value">₹{totalBudget.toLocaleString("en-IN")}</p>
            </div>
            <div className="summary-item">
              <p className="summary-label">Total Spent</p>
              <p className="summary-value danger">₹{totalSpent.toLocaleString("en-IN")}</p>
            </div>
            <div className="summary-item">
              <p className="summary-label">Remaining</p>
              <p className={`summary-value ${totalBudget - totalSpent >= 0 ? "success" : "danger"}`}>
                ₹{(totalBudget - totalSpent).toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        )}

        {/* Educational Info Section */}
        <div className="page-info-section">
          <div className="info-content">
            <div className="info-text">
              <h3>Smart Budget Planning</h3>
              <p>
                Budgeting is the foundation of financial control. By setting realistic limits for each spending category, you gain visibility into where your money goes and can make intentional choices. A well-planned budget helps you save more, reduce stress, and achieve your financial goals systematically.
              </p>
              <ul className="info-list">
                <li>Start with 50-30-20 rule: 50% needs, 30% wants, 20% savings</li>
                <li>Track spending against budget weekly, not just at month-end</li>
                <li>Adjust budgets based on actual spending patterns over time</li>
                <li>Use alerts to catch overspending before it becomes a habit</li>
                <li>Review fixed vs variable expenses to find savings opportunities</li>
              </ul>
            </div>
            <div className="info-image">
              <div className="info-placeholder">
                <img src="/images/budgetimage.jpeg" alt="Budget Planning" />
              </div>
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        <h2 className="section-title">Category Budgets</h2>
        <div className="budget-grid">
          {categories.length === 0 ? (
            <div className="empty-state">
              <p>No expense categories found.</p>
            </div>
          ) : (
            categories.map((cat) => {
              const info = budgetData[cat.id];
              const percentage = info?.percentage || 0;
              const hasBudget = info?.limit && info.limit > 0;
              const alert = getAlertByPercentage(percentage);
              const progressColor = getProgressColor(percentage);

              return (
                <div key={cat.id} className="budget-card">
                  {/* Header */}
                  <div className="budget-card-header">
                    <h3 className="budget-category-name">{cat.name}</h3>
                  </div>

                  {/* Content */}
                  <div className="budget-card-content">
                    {hasBudget ? (
                      <>
                        {/* Alert Bar */}
                        <div className={`alert-bar ${alert.level}`}>
                          {alert.text}
                        </div>

                        {/* Progress Bar */}
                        <div className="progress-container">
                          <div className="progress-stats">
                            <span className="stat-spent">
                              ₹{info.used.toLocaleString("en-IN")}
                            </span>
                            <span className="stat-limit">
                              / ₹{info.limit.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div className="progress-bar">
                            <div
                              className="progress-fill"
                              style={{
                                width: `${Math.min(percentage, 100)}%`,
                                backgroundColor: progressColor,
                              }}
                            />
                          </div>
                          <div className="progress-percentage">
                            {percentage}% used
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="no-budget-text">
                        No budget set yet. Add one below!
                      </p>
                    )}

                    {/* Edit/Save Section */}
                    <div className="budget-input-section">
                      {editingId === cat.id ? (
                        <>
                          <input
                            type="number"
                            placeholder="Monthly limit"
                            value={inputLimits[cat.id] || ""}
                            onChange={(e) =>
                              setInputLimits({
                                ...inputLimits,
                                [cat.id]: e.target.value,
                              })
                            }
                            className="form-input budget-input"
                          />
                          <div className="button-group">
                            <button
                              onClick={() => saveBudget(cat.id)}
                              className="btn btn-primary btn-small"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="btn btn-secondary btn-small"
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <button
                          onClick={() => setEditingId(cat.id)}
                          className="btn btn-secondary btn-small btn-edit"
                        >
                          {hasBudget ? "Edit Budget" : "Set Budget"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default Budget;
