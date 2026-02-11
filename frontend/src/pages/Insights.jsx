import { useEffect, useState } from "react";
import "../styles/insights-new.css";

function Insights({ selectedMonth }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const token = localStorage.getItem("token");
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

  useEffect(() => {
    if (!selectedMonth || !token) {
      setLoading(false);
      return;
    }

    fetchInsights();
  }, [selectedMonth, token]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE}/insights/enhanced?month=${selectedMonth}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch insights");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error("Insights error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="insights-container">
        <div className="insights-loading">
          <div className="loading-spinner"></div>
          <span>Loading insights...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="insights-container">
        <div className="insights-empty">
          <div className="insights-empty-icon">⚠</div>
          <h3>Unable to load insights</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="insights-container">
        <div className="insights-empty">
          <div className="insights-empty-icon">○</div>
          <h3>No data available</h3>
          <p>Start adding transactions to get personalized financial insights</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatCardType = (type) => {
    const typeMap = {
      "top_category": "Spending",
      "trend": "Trend",
      "activity": "Activity",
      "empty": "Empty",
      "subscription": "Subscription",
      "unused_subs": "Opportunity",
      "budget_overrun": "Alert",
      "savings_potential": "Potential"
    };
    return typeMap[type] || type;
  };

  const getMetricClass = (type) => {
    const negativeTypes = ["budget_overrun", "unused_subs"];
    const positiveTypes = ["savings_potential"];
    const warningTypes = ["trend", "subscription"];

    if (negativeTypes.includes(type)) return "negative";
    if (positiveTypes.includes(type)) return "positive";
    if (warningTypes.includes(type)) return "warning";
    return "";
  };

  return (
    <div className="page-container">
      <div className="page-content">
        {/* Header */}
        <div className="page-title-section">
          <h1>Financial Insights</h1>
          <p>Analysis and recommendations for {selectedMonth}</p>
        </div>

          {/* Summary Stats */}
        {data.summary && (
          <div className="insights-summary">
            <div className="summary-stat">
              <span className="summary-stat-label">Total Expenses</span>
              <span className="summary-stat-value">
                {formatCurrency(data.summary.total_expense)}
              </span>
            </div>
            <div className="summary-stat">
              <span className="summary-stat-label">Total Income</span>
              <span className="summary-stat-value">
                {formatCurrency(data.summary.total_income)}
              </span>
            </div>
            <div className="summary-stat">
              <span className="summary-stat-label">Active Subscriptions</span>
              <span className="summary-stat-value">{data.summary.subscription_count}</span>
            </div>
            <div className="summary-stat">
              <span className="summary-stat-label">Budget Alerts</span>
              <span className="summary-stat-value">{data.summary.budget_overruns}</span>
            </div>
          </div>
        )}

        {/* 1. Spending Patterns Section */}
        <div className="insights-section">
          <div className="insights-section-header">
            <h2>Spending Patterns</h2>
            <span className="section-badge">Analysis</span>
          </div>

          {data.spending_patterns && data.spending_patterns.length > 0 ? (
            <div className="insights-grid">
            {data.spending_patterns.map((pattern, index) => (
              <div
                key={index}
                className={`insight-card ${pattern.type.toLowerCase().replace(/_/g, "-")}`}
              >
                <div className="card-header-row">
                  <h3 className="card-title">{pattern.title}</h3>
                  <span className={`card-type-badge ${pattern.type}`}>
                    {formatCardType(pattern.type)}
                  </span>
                </div>
                <p className="card-description">{pattern.description}</p>
                <p className={`card-metric ${getMetricClass(pattern.type)}`}>
                  {pattern.metric}
                </p>

                {pattern.type === "activity" && (
                  <div className="card-detail">
                    Average: {(pattern.transaction_count / 30).toFixed(1)} transactions daily
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="insights-empty">
            <div className="insights-empty-icon">○</div>
            <p>No spending patterns available for this period</p>
          </div>
        )}
        </div>

        {/* 2. Savings Opportunities Section */}
        <div className="insights-section">
          <div className="insights-section-header">
            <h2>Savings Opportunities</h2>
            <span className="section-badge">Recommendations</span>
          </div>

          {data.savings_opportunities && data.savings_opportunities.length > 0 ? (
            <div className="insights-grid">
            {data.savings_opportunities.map((opportunity, index) => (
              <div
                key={index}
                className={`insight-card ${opportunity.type.toLowerCase().replace(/_/g, "-")}`}
              >
                <div className="card-header-row">
                  <h3 className="card-title">{opportunity.title}</h3>
                  <span className={`card-type-badge ${opportunity.type}`}>
                    {formatCardType(opportunity.type)}
                  </span>
                </div>
                <p className="card-description">{opportunity.description}</p>
                <p className={`card-metric ${getMetricClass(opportunity.type)}`}>
                  {opportunity.metric}
                </p>

                {opportunity.type === "budget_overrun" && opportunity.categories && (
                  <div className="card-details">
                    {opportunity.categories.slice(0, 2).map((cat, idx) => (
                      <div key={idx} className="detail-item alert">
                        <strong>{cat.category}</strong>
                        <span>{formatCurrency(cat.overrun)} over</span>
                      </div>
                    ))}
                    {opportunity.categories.length > 2 && (
                      <div className="card-detail muted">
                        +{opportunity.categories.length - 2} more categories
                      </div>
                    )}
                  </div>
                )}

                {opportunity.type === "savings_potential" && opportunity.annual_potential && (
                  <div className="card-detail success">
                    Yearly potential: {formatCurrency(opportunity.annual_potential)}
                  </div>
                )}

                {opportunity.type === "unused_subs" && (
                  <div className="card-detail warning">
                    Low-frequency subscriptions worth reviewing
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="insights-empty">
            <div className="insights-empty-icon">✓</div>
            <h3>Excellent financial health</h3>
            <p>No major savings opportunities identified. Continue maintaining good spending habits.</p>
          </div>
        )}
        </div>

        {/* Info Section - Middle of Page */}
        <div className="insights-info-section">
        <div className="info-content">
          <div className="info-text">
            <h3>Smart Financial Planning</h3>
            <p>
              Effective financial management starts with understanding your spending patterns. By regularly reviewing your expenses, identifying subscriptions you no longer use, and setting realistic budgets for each category, you can build a sustainable financial plan. Our analysis helps you make data-driven decisions to optimize your finances.
            </p>
            <ul className="info-list">
              <li>Review subscriptions monthly to identify unused services</li>
              <li>Set category-specific budgets to control discretionary spending</li>
              <li>Track spending trends to identify optimization opportunities</li>
              <li>Plan savings goals based on disposable income</li>
            </ul>
          </div>
          <div className="info-image">
            <div className="info-placeholder">
              <img src="/images/insightsimage.jpeg" alt="Financial Insights" />
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

export default Insights;
