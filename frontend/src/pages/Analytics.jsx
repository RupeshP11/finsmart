import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
// Heatmap removed
import "../styles/analytics-new.css";

function Analytics({ selectedMonth }) {
  const token = localStorage.getItem("token");
  const [year, month] = selectedMonth.split("-");

  // State for all features
  const [pieData, setPieData] = useState([]);
  const [lineData, setLineData] = useState([]);
  const [historicalData, setHistoricalData] = useState(null);
  const [goalVsReality, setGoalVsReality] = useState(null);
  const [recurringTransactions, setRecurringTransactions] = useState(null);
  const [incomeExpenseRatio, setIncomeExpenseRatio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const COLORS = ["#0088FE", "#00C49F", "#FF8042", "#8B5CF6", "#EC4899"];
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
  const averageRatio = incomeExpenseRatio?.average_ratio ?? 0;
  const ratioDisplay = averageRatio > 0 ? (1 / averageRatio).toFixed(2) : "N/A";
  const hasAnyData =
    pieData.length > 0 ||
    lineData.length > 0 ||
    Boolean(historicalData) ||
    Boolean(goalVsReality) ||
    Boolean(recurringTransactions) ||
    (incomeExpenseRatio && incomeExpenseRatio.data && incomeExpenseRatio.data.length > 0);

  const formatFinite = (value) => (Number.isFinite(value) ? value.toFixed(2) : "N/A");

  useEffect(() => {
    if (token) {
      fetchAllAnalytics();
    } else {
      setLoading(false);
      setError("Not logged in. Please sign in again.");
    }
  }, [token, selectedMonth]);

  const fetchJson = async (url) => {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`${response.status} ${response.statusText}: ${detail}`);
    }

    return response.json();
  };

  async function fetchAllAnalytics() {
    try {
      setLoading(true);
      setError(null);
      const requests = [
        {
          key: "Expense breakdown",
          url: `${API_BASE}/analytics/expense-by-category?year=${year}&month=${Number(month)}`,
          apply: (data) => setPieData(Array.isArray(data) ? data : []),
        },
        {
          key: "Daily spending",
          url: `${API_BASE}/analytics/daily-expense?year=${year}&month=${Number(month)}`,
          apply: (data) => setLineData(Array.isArray(data) ? data : []),
        },
        {
          key: "Quarterly comparison",
          url: `${API_BASE}/analytics/historical-comparison`,
          apply: (data) => setHistoricalData(data || null),
        },
        {
          key: "Budget vs actual",
          url: `${API_BASE}/analytics/goal-vs-reality?year=${year}&month=${Number(month)}`,
          apply: (data) => setGoalVsReality(data || null),
        },
        {
          key: "Subscriptions",
          url: `${API_BASE}/analytics/recurring-transactions`,
          apply: (data) => setRecurringTransactions(data || null),
        },
        {
          key: "Income ratio",
          url: `${API_BASE}/analytics/income-expense-ratio?months=12`,
          apply: (data) => setIncomeExpenseRatio(data || null),
        },
      ];

      const results = await Promise.allSettled(
        requests.map((request) => fetchJson(request.url))
      );

      let hadSuccess = false;
      const failedKeys = [];

      results.forEach((result, index) => {
        const request = requests[index];
        if (result.status === "fulfilled") {
          hadSuccess = true;
          request.apply(result.value);
          // Debug logging for budget data
          if (request.key === "Budget vs actual") {
            console.log("Budget data fetched:", result.value);
          }
        } else {
          failedKeys.push(request.key);
          console.warn(`Analytics fetch failed - ${request.key}:`, result.reason?.message || result.reason);
        }
      });

      if (!hadSuccess) {
        setError("Backend not responding. Make sure the server is running.");
      } else if (failedKeys.length > 0) {
        console.info(`Some sections skipped (may not have data yet): ${failedKeys.join(", ")}.`);
      }
    } catch (err) {
      console.error("Analytics error:", err);
      setError("Unable to load analytics. Please check the server and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="page-container"><p>Loading analytics...</p></div>;

  return (
    <div className="page-container">
      <div className="page-content">
        {/* Header */}
        <div className="analytics-header">
          <h1>Your Financial Overview</h1>
          <p className="subtitle">See where your money is going and get insights to save more</p>
        </div>

        {error && (
          <div className="card analytics-card">
            <div className="card-header">
              <h3>Analytics warning</h3>
              <p className="card-hint">{error}</p>
            </div>
          </div>
        )}

        {!hasAnyData && (
          <div className="card analytics-card">
            <div className="card-header">
              <h3>No data yet</h3>
              <p className="card-hint">Add transactions or budgets to see analytics.</p>
            </div>
          </div>
        )}

        {/* Section 1: Historical Comparison */}
        {historicalData && (
          <div className="card analytics-card">
            <div className="card-header">
              <h3>Spending Trend</h3>
              <p className="card-hint">How your spending is changing quarter by quarter</p>
            </div>
            
            {historicalData.comparison && (
              <div className="comparison-summary">
                <div className="summary-item">
                  <span className="label">Previous 3 Months</span>
                  <span className="amount">₹{historicalData.comparison.previous_quarter_expense.toLocaleString("en-IN")}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Current 3 Months</span>
                  <span className="amount">₹{historicalData.comparison.current_quarter_expense.toLocaleString("en-IN")}</span>
                </div>
                <div className={`summary-item trend-${historicalData.comparison.trend}`}>
                  <span className="label">Change</span>
                  <span className="amount">{historicalData.comparison.change_percent > 0 ? 'Increased' : 'Decreased'} by {Math.abs(historicalData.comparison.change_percent)}%</span>
                </div>
              </div>
            )}

            <div style={{marginTop: "20px"}}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={historicalData.quarters || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="quarter" />
                  <YAxis />
                  <Tooltip formatter={(value) => `₹${value.toLocaleString("en-IN")}`} />
                  <Legend />
                  <Bar dataKey="income" fill="#10b981" />
                  <Bar dataKey="expense" fill="#ef4444" />
                  <Bar dataKey="saved" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Section 2: Goal vs Reality */}
        {goalVsReality && (
          <div className="card analytics-card">
            <div className="card-header">
              <h3>Budget Performance</h3>
              <p className="card-hint">Compare what you planned to spend vs what you actually spent</p>
            </div>

            {goalVsReality.summary && (goalVsReality.summary.total_budgeted > 0 || goalVsReality.by_category?.length > 0) ? (
              <div className="budget-summary">
                <div style={{display: "flex", flexDirection: "column", gap: "16px"}}>
                  {/* Top Row - 3 Summary Cards */}
                  <div style={{display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px"}}>
                    {/* Budget Box */}
                    <div style={{
                      padding: "16px",
                      background: "linear-gradient(135deg, rgba(30,64,175,0.08) 0%, rgba(30,64,175,0.04) 100%)",
                      border: "2px solid #dbeafe",
                      borderRadius: "10px",
                      textAlign: "center"
                    }}>
                      <p style={{margin: "0 0 6px 0", color: "#666", fontSize: "11px", fontWeight: "600"}}>Total Budget</p>
                      <p style={{margin: 0, fontSize: "26px", fontWeight: "800", color: "#1e40af"}}>₹{goalVsReality.summary.total_budgeted.toLocaleString("en-IN")}</p>
                    </div>

                    {/* Spent Box */}
                    <div style={{
                      padding: "16px",
                      background: "linear-gradient(135deg, rgba(220,38,38,0.08) 0%, rgba(220,38,38,0.04) 100%)",
                      border: "2px solid #fee2e2",
                      borderRadius: "10px",
                      textAlign: "center"
                    }}>
                      <p style={{margin: "0 0 6px 0", color: "#666", fontSize: "11px", fontWeight: "600"}}>Total Spent</p>
                      <p style={{margin: 0, fontSize: "26px", fontWeight: "800", color: "#dc2626"}}>₹{goalVsReality.summary.total_actual.toLocaleString("en-IN")}</p>
                    </div>

                    {/* Variance Box */}
                    <div style={{
                      padding: "16px",
                      background: `linear-gradient(135deg, rgba(${goalVsReality.summary.status === "over" ? "220,38,38" : "16,185,129"},0.08) 0%, rgba(${goalVsReality.summary.status === "over" ? "220,38,38" : "16,185,129"},0.04) 100%)`,
                      border: `2px solid ${goalVsReality.summary.status === "over" ? "#fee2e2" : "#d1fae5"}`,
                      borderRadius: "10px",
                      textAlign: "center"
                    }}>
                      <p style={{margin: "0 0 6px 0", color: "#666", fontSize: "11px", fontWeight: "600"}}>Total Variance</p>
                      <p style={{margin: 0, fontSize: "26px", fontWeight: "800", color: goalVsReality.summary.status === "over" ? "#dc2626" : "#10b981"}}>
                        {goalVsReality.summary.status === "over" ? "+" : "-"}{Math.abs(goalVsReality.summary.total_variance_percent)}%
                      </p>
                    </div>
                  </div>

                  {/* Bottom Row - Budget Category Cards Grid */}
                  <div style={{display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "12px"}}>
                    {goalVsReality.by_category && goalVsReality.by_category
                      .filter(cat => cat.category.toLowerCase() !== "salary" && cat.category.toLowerCase() !== "freelance" && cat.category.toLowerCase() !== "business" && cat.category.toLowerCase() !== "interest" && cat.category.toLowerCase() !== "gift")
                      .map((cat, idx) => {
                        const percentage = cat.utilization_percent;
                        const isOver = cat.status === "over";
                        const circleSize = 75;
                        const circumference = 2 * Math.PI * (circleSize / 2 - 6);
                        const strokeDashoffset = circumference - (percentage / 100) * circumference;
                        
                        return (
                          <div key={idx} style={{
                            padding: "10px",
                            background: "linear-gradient(135deg, rgba(249,250,251,0.95) 0%, rgba(243,244,246,0.95) 100%)",
                            border: `2px solid ${isOver ? "#fee2e2" : "#dbeafe"}`,
                            borderRadius: "10px",
                            transition: "all 0.3s ease",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            textAlign: "center"
                          }}
                          onMouseEnter={(e) => {e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)";}}
                          onMouseLeave={(e) => {e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)";}}
                          >
                            {/* Circle */}
                            <svg width={circleSize} height={circleSize} style={{transform: "rotate(-90deg)", marginBottom: "4px"}}>
                              <circle cx={circleSize / 2} cy={circleSize / 2} r={circleSize / 2 - 6} fill="none" stroke="#e5e7eb" strokeWidth="4" />
                              <circle
                                cx={circleSize / 2}
                                cy={circleSize / 2}
                                r={circleSize / 2 - 6}
                                fill="none"
                                stroke={isOver ? "#ef4444" : "#10b981"}
                                strokeWidth="4"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                style={{transition: "stroke-dashoffset 0.5s ease"}}
                              />
                            </svg>

                            {/* Percentage */}
                            <p style={{margin: "0 0 3px 0", fontSize: "14px", fontWeight: "800", color: isOver ? "#dc2626" : "#10b981"}}>
                              {Math.min(100, Math.round(percentage))}%
                            </p>

                            {/* Category Name */}
                            <h4 style={{margin: "0 0 2px 0", fontSize: "10px", fontWeight: "800", color: "#1f2937"}}>{cat.category}</h4>

                            {/* Status Badge */}
                            <span style={{
                              fontSize: "8px",
                              fontWeight: "700",
                              padding: "2px 5px",
                              borderRadius: "3px",
                              background: isOver ? "#fee2e2" : "#d1fae5",
                              color: isOver ? "#dc2626" : "#059669",
                              marginBottom: "5px",
                              display: "inline-block"
                            }}>
                              {isOver ? "Over" : "Good"}
                            </span>

                            {/* Numbers */}
                            <div style={{fontSize: "8px", width: "100%"}}>
                              <div style={{display: "flex", gap: "2px", marginBottom: "2px"}}>
                                <div style={{flex: 1, background: "rgba(30, 64, 175, 0.1)", padding: "2px", borderRadius: "2px"}}>
                                  <p style={{margin: "0 0 1px 0", color: "#666", fontSize: "7px", fontWeight: "600"}}>Budget</p>
                                  <p style={{margin: 0, fontWeight: "700", color: "#1e40af", fontSize: "11px"}}>₹{cat.budgeted.toLocaleString("en-IN")}</p>
                                </div>
                                <div style={{flex: 1, background: "rgba(220, 38, 38, 0.1)", padding: "2px", borderRadius: "2px"}}>
                                  <p style={{margin: "0 0 1px 0", color: "#666", fontSize: "7px", fontWeight: "600"}}>Spent</p>
                                  <p style={{margin: 0, fontWeight: "700", color: "#dc2626", fontSize: "11px"}}>₹{cat.actual.toLocaleString("en-IN")}</p>
                                </div>
                              </div>
                              <div style={{background: isOver ? "rgba(220, 38, 38, 0.1)" : "rgba(16, 185, 129, 0.1)", padding: "2px", borderRadius: "2px"}}>
                                <p style={{margin: "0 0 1px 0", color: "#666", fontSize: "7px", fontWeight: "600"}}>Var</p>
                                <p style={{margin: 0, fontWeight: "700", color: isOver ? "#dc2626" : "#10b981", fontSize: "11px"}}>
                                  {isOver ? "+" : "-"}₹{Math.abs(cat.variance).toLocaleString("en-IN")}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{padding: "20px", textAlign: "center", background: "rgba(226, 232, 240, 0.5)", borderRadius: "8px"}}>
                <p style={{margin: 0, color: "#666", fontSize: "14px"}}>
                  📋 No budgets set up yet. Go to Budget page to create spending limits for your categories.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Section 3: Recurring Transactions / Subscriptions */}
        {recurringTransactions && (
          <div className="card analytics-card">
            <div className="card-header">
              <h3>Regular Bills & Subscriptions</h3>
              <p className="card-hint">Money you pay regularly - like subscriptions, utilities, insurance, and entertainment services</p>
            </div>

            {recurringTransactions.summary && recurringTransactions.subscriptions && recurringTransactions.subscriptions.length > 0 ? (
              <>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "12px",
                  marginBottom: "20px"
                }}>
                  <div style={{background: "rgba(16, 185, 129, 0.1)", backdropFilter: "blur(10px)", padding: "12px", borderRadius: "8px", textAlign: "center"}}>
                    <p style={{margin: 0, fontSize: "12px", color: "#059669", fontWeight: "600"}}>Every Month</p>
                    <p style={{margin: "6px 0 0 0", fontSize: "18px", fontWeight: "700", color: "#15803d"}}>
                      ₹{recurringTransactions.summary.total_recurring_monthly.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div style={{background: "rgba(168, 85, 247, 0.1)", backdropFilter: "blur(10px)", padding: "12px", borderRadius: "8px", textAlign: "center"}}>
                    <p style={{margin: 0, fontSize: "12px", color: "#7c3aed", fontWeight: "600"}}>Every Year</p>
                    <p style={{margin: "6px 0 0 0", fontSize: "18px", fontWeight: "700", color: "#6d28d9"}}>
                      ₹{recurringTransactions.summary.total_recurring_yearly.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div style={{background: "rgba(59, 130, 246, 0.1)", backdropFilter: "blur(10px)", padding: "12px", borderRadius: "8px", textAlign: "center"}}>
                    <p style={{margin: 0, fontSize: "12px", color: "#0284c7", fontWeight: "600"}}>Active Services</p>
                    <p style={{margin: "6px 0 0 0", fontSize: "18px", fontWeight: "700", color: "#1e40af"}}>
                      {recurringTransactions.summary.subscription_count}
                    </p>
                  </div>
                </div>

                <div className="subscriptions-list">
                  {recurringTransactions.subscriptions.map((sub, idx) => (
                    <div key={idx} className="subscription-item">
                      <div>
                        <p style={{margin: 0, fontWeight: "600", fontSize: "14px"}}>{sub.description}</p>
                        <p style={{margin: "4px 0 0 0", fontSize: "12px", color: "#666"}}>
                          {sub.category}
                        </p>
                      </div>
                      <div style={{textAlign: "right"}}>
                        <p style={{margin: 0, fontSize: "14px", fontWeight: "700", color: "#ef4444"}}>
                          ₹{sub.estimated_monthly.toLocaleString("en-IN")}/month
                        </p>
                        <p style={{margin: "4px 0 0 0", fontSize: "12px", color: "#999"}}>
                          ₹{sub.estimated_yearly.toLocaleString("en-IN")}/year
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{padding: "20px", textAlign: "center", background: "rgba(226, 232, 240, 0.5)", borderRadius: "8px"}}>
                <p style={{margin: 0, color: "#666", fontSize: "14px"}}>
                  💳 No recurring charges detected yet. Add the same expense 2+ times in the last 6 months to track recurring costs.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Section 5: Income vs Spending */}
        {incomeExpenseRatio && (
          <div className="card analytics-card">
            <div className="card-header">
              <h3>Your Money Habits</h3>
              <p className="card-hint">How your spending pattern looks month by month</p>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={incomeExpenseRatio.data || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `₹${Number.isFinite(value) ? value.toFixed(0) : "N/A"}`} />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name="Your Income" dot={{fill: "#10b981", r: 4}} />
                <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} name="Your Spending" dot={{fill: "#ef4444", r: 4}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Section 6: Expense by Category */}
        {pieData.length > 0 && (
          <div className="card-grid">
            <div className="card analytics-card">
              <div className="card-header">
                <h3>Where Your Money Goes</h3>
                <p className="card-hint">Your spending by category</p>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="total_amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${value.toLocaleString("en-IN")}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Daily Trend */}
            <div className="card analytics-card">
              <div className="card-header">
                <h3>Daily Spending Pattern</h3>
                <p className="card-hint">See how much you spend on different days</p>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => `₹${value.toLocaleString("en-IN")}`} />
                  <Line type="monotone" dataKey="total_amount" stroke="#ef4444" strokeWidth={2} name="Spending" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Analytics;
