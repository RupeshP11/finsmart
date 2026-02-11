import { useState, useEffect } from "react";
import "../styles/investment.css";

function InvestmentAdvisor({ selectedMonth }) {
  const [risk, setRisk] = useState("medium");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const token = localStorage.getItem("token");

  // Investment suggestions mapping
  const investmentSuggestions = {
    equity: [
      "Nifty 50 Index Funds",
      "Large-cap Mutual Funds",
      "Blue-chip Stocks",
      "Diversified Equity Funds"
    ],
    debt: [
      "Public Provident Fund (PPF)",
      "Employee Provident Fund (EPF)",
      "Government Bonds",
      "Fixed Deposits",
      "Debt Mutual Funds"
    ],
    gold: [
      "Sovereign Gold Bonds (SGB)",
      "Gold ETFs",
      "Digital Gold",
      "Gold Mutual Funds"
    ],
    emergency: [
      "High-yield Savings Account",
      "Liquid Mutual Funds",
      "Ultra Short-term Funds",
      "Sweep-in Fixed Deposits"
    ]
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculateAmount = (percentage) => {
    if (!result || !result.investable_amount) return 0;
    return (result.investable_amount * percentage) / 100;
  };

  // Auto-refresh when global month changes (if results are already showing)
  useEffect(() => {
    if (result) {
      // Silently refresh the recommendation with the new month
      fetchAdvice();
    }
  }, [selectedMonth]);

  async function fetchAdvice() {
    setLoading(true);
    setError(null);

    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      
      const res = await fetch("http://127.0.0.1:8000/investment/advice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          risk_profile: risk,
          month: month,
          year: year,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Unable to generate advice");
        setResult(null);
        return;
      }

      setResult(data);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function getAdvice(e) {
    e.preventDefault();
    await fetchAdvice();
  }

  return (
    <div className="investment-container">
      <div className="investment-content">
        {/* Page Header */}
        <div className="page-title-section">
          <h1>Investment Advisor</h1>
          <p className="page-subtitle">
            Get personalized investment recommendations based on your risk profile
          </p>
        </div>

        {/* Available Balance Card */}
        {result && result.investable_amount > 0 && (
          <div className="available-balance-card">
            <p className="balance-label">Available to Invest (Monthly)</p>
            <h2 className="balance-amount">{formatCurrency(result.investable_amount)}</h2>
            <p className="balance-note">
              Amount available for the selected month after deducting expenses from your income
            </p>
          </div>
        )}

        {/* Risk Profile Selector */}
        <div className="risk-selector-section">
          <h2 className="section-title">Select Your Risk Profile</h2>
          <div className="risk-options">
            <div 
              className={`risk-card ${risk === "low" ? "selected" : ""}`}
              onClick={() => setRisk("low")}
            >
              <h3 className="risk-title">Low Risk</h3>
              <p className="risk-subtitle">Conservative</p>
              <p className="risk-preview">30% Equity, 45% Debt</p>
            </div>

            <div 
              className={`risk-card ${risk === "medium" ? "selected" : ""}`}
              onClick={() => setRisk("medium")}
            >
              <h3 className="risk-title">Medium Risk</h3>
              <p className="risk-subtitle">Balanced</p>
              <p className="risk-preview">50% Equity, 30% Debt</p>
            </div>

            <div 
              className={`risk-card ${risk === "high" ? "selected" : ""}`}
              onClick={() => setRisk("high")}
            >
              <h3 className="risk-title">High Risk</h3>
              <p className="risk-subtitle">Aggressive</p>
              <p className="risk-preview">65% Equity, 20% Debt</p>
            </div>
          </div>

          <button 
            className="get-advice-btn" 
            onClick={getAdvice}
            disabled={loading}
          >
            {loading ? "Analyzing Your Profile..." : "Get Investment Recommendation"}
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="error-state">
            <p>{error}</p>
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="results-section">
            {/* Recommendation Message */}
            <div className="recommendation-message">
              <p>{result.message}</p>
            </div>

            {/* Allocation Grid */}
            <div className="allocation-grid">
              {/* Equity */}
              <div className="allocation-card">
                <div className="allocation-header">
                  <div className="allocation-category">
                    <div className="category-icon equity">📈</div>
                    <h3 className="category-name">Equity</h3>
                  </div>
                  <span className="allocation-percentage">{result.allocation.equity}%</span>
                </div>
                <h4 className="allocation-amount">
                  {formatCurrency(calculateAmount(result.allocation.equity))}
                </h4>
                <div className="allocation-bar">
                  <div 
                    className="allocation-bar-fill equity"
                    style={{ width: `${result.allocation.equity}%` }}
                  ></div>
                </div>
                <div className="investment-suggestions">
                  <p className="suggestions-title">Recommended Investments:</p>
                  <ul className="suggestion-list">
                    {investmentSuggestions.equity.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Debt */}
              <div className="allocation-card">
                <div className="allocation-header">
                  <div className="allocation-category">
                    <div className="category-icon debt">🏦</div>
                    <h3 className="category-name">Debt</h3>
                  </div>
                  <span className="allocation-percentage">{result.allocation.debt}%</span>
                </div>
                <h4 className="allocation-amount">
                  {formatCurrency(calculateAmount(result.allocation.debt))}
                </h4>
                <div className="allocation-bar">
                  <div 
                    className="allocation-bar-fill debt"
                    style={{ width: `${result.allocation.debt}%` }}
                  ></div>
                </div>
                <div className="investment-suggestions">
                  <p className="suggestions-title">Recommended Investments:</p>
                  <ul className="suggestion-list">
                    {investmentSuggestions.debt.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Gold */}
              <div className="allocation-card">
                <div className="allocation-header">
                  <div className="allocation-category">
                    <div className="category-icon gold">🪙</div>
                    <h3 className="category-name">Gold</h3>
                  </div>
                  <span className="allocation-percentage">{result.allocation.gold}%</span>
                </div>
                <h4 className="allocation-amount">
                  {formatCurrency(calculateAmount(result.allocation.gold))}
                </h4>
                <div className="allocation-bar">
                  <div 
                    className="allocation-bar-fill gold"
                    style={{ width: `${result.allocation.gold}%` }}
                  ></div>
                </div>
                <div className="investment-suggestions">
                  <p className="suggestions-title">Recommended Investments:</p>
                  <ul className="suggestion-list">
                    {investmentSuggestions.gold.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Emergency Fund */}
              <div className="allocation-card">
                <div className="allocation-header">
                  <div className="allocation-category">
                    <div className="category-icon emergency">🛡️</div>
                    <h3 className="category-name">Emergency Fund</h3>
                  </div>
                  <span className="allocation-percentage">{result.allocation.emergency}%</span>
                </div>
                <h4 className="allocation-amount">
                  {formatCurrency(calculateAmount(result.allocation.emergency))}
                </h4>
                <div className="allocation-bar">
                  <div 
                    className="allocation-bar-fill emergency"
                    style={{ width: `${result.allocation.emergency}%` }}
                  ></div>
                </div>
                <div className="investment-suggestions">
                  <p className="suggestions-title">Recommended Investments:</p>
                  <ul className="suggestion-list">
                    {investmentSuggestions.emergency.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Educational Info Section */}
        <div className="investment-info-section">
          <div className="info-content">
            <div className="info-text">
              <h3>Why Asset Allocation Matters</h3>
              <p>
                Asset allocation is one of the most important decisions in investing. Studies show that 
                it accounts for over 90% of portfolio returns. By diversifying across different asset 
                classes, you can optimize returns while managing risk.
              </p>
              <ul className="info-list">
                <li>Diversification reduces overall portfolio risk</li>
                <li>Different assets perform well in different market conditions</li>
                <li>Proper allocation aligns investments with your goals and timeline</li>
                <li>Regular rebalancing maintains your desired risk profile</li>
                <li>Tax efficiency through strategic asset placement</li>
              </ul>
            </div>
            <div className="info-image">
              <div className="info-placeholder">
                <img src="/images/investadvisorimage.jpeg" alt="Investment Strategy" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvestmentAdvisor;
