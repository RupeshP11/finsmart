import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import "../styles/autosavings.css";

function AutoSavings({ selectedMonth: propMonth }) {
  const [data, setData] = useState(null);
  const [trend, setTrend] = useState([]);
  const [safety, setSafety] = useState(null);
  const [consistency, setConsistency] = useState(null);
  const [goals, setGoals] = useState([]);
  const [records, setRecords] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [progressAmount, setProgressAmount] = useState("");
  const [showProgressModal, setShowProgressModal] = useState(false);
  const goalsSectionRef = useRef(null);
  const navigate = useNavigate();
  
  // Use prop month or default
  const [selectedMonth, setSelectedMonth] = useState(propMonth || getDefaultMonth());
  
  function getDefaultMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  
  // Update when prop changes
  useEffect(() => {
    if (propMonth) {
      setSelectedMonth(propMonth);
    }
  }, [propMonth]);
  
  // Parse month to check if current or past
  function isCurrentMonth() {
    const d = new Date();
    const current = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return selectedMonth === current;
  }
  
  function getMonthLabel() {
    const [year, month] = selectedMonth.split("-");
    const date = new Date(year, parseInt(month) - 1);
    const monthName = date.toLocaleString("default", { month: "long" });
    return `${monthName} ${year}`;
  }
  
  const [newGoal, setNewGoal] = useState({
    name: "",
    target_amount: "",
    category: "investment",
    priority: 1,
    target_date: "",
  });

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (token) {
      fetchAllData();
    }
  }, [token, selectedMonth]);

  async function fetchAllData() {
    try {
      setLoading(true);
      setError(null);

      const [year, month] = selectedMonth.split("-");
      const monthParam = `?year=${year}&month=${month}`;

      const [resAdvice, resTrend, resSafety, resConsistency, resGoals, resRecords, resRecs] =
        await Promise.all([
          fetch(`http://127.0.0.1:8000/analytics/auto-savings${monthParam}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("http://127.0.0.1:8000/savings-analytics/trend", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("http://127.0.0.1:8000/savings-analytics/safety-score", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("http://127.0.0.1:8000/savings-analytics/consistency", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("http://127.0.0.1:8000/savings-goals/", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("http://127.0.0.1:8000/savings-analytics/records", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("http://127.0.0.1:8000/savings-analytics/recommendations", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

      const adviceData = await resAdvice.json();
      const trendData = await resTrend.json();
      const safetyData = await resSafety.json();
      const consistencyData = await resConsistency.json();
      const goalsData = await resGoals.json();
      const recordsData = await resRecords.json();
      const recsData = await resRecs.json();

      setData(adviceData);
      setTrend(trendData);
      setSafety(safetyData);
      setConsistency(consistencyData);
      setGoals(goalsData);
      setRecords(recordsData);
      setRecommendations(recsData);
    } catch (err) {
      setError("Failed to fetch savings data");
    } finally {
      setLoading(false);
    }
  }

  async function addGoal(e) {
    e.preventDefault();

    const res = await fetch("http://127.0.0.1:8000/savings-goals/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(newGoal),
    });

    if (res.ok) {
      setNewGoal({ name: "", target_amount: "", category: "investment", priority: 1, target_date: "" });
      setShowGoalModal(false);
      fetchAllData();
    }
  }

  async function addProgress(goalId) {
    if (!progressAmount) return;

    const res = await fetch(`http://127.0.0.1:8000/savings-goals/${goalId}/add-progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ amount: parseFloat(progressAmount) }),
    });

    if (res.ok) {
      setProgressAmount("");
      setShowProgressModal(false);
      setSelectedGoal(null);
      fetchAllData();
    }
  }

  async function deleteGoal(goalId) {
    if (!window.confirm("Delete this goal?")) return;

    const res = await fetch(`http://127.0.0.1:8000/savings-goals/${goalId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      fetchAllData();
    }
  }

  async function updateGoal(e) {
    e.preventDefault();

    const res = await fetch(`http://127.0.0.1:8000/savings-goals/${editingGoal.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: editingGoal.name,
        target_amount: editingGoal.target_amount,
        priority: editingGoal.priority,
        target_date: editingGoal.target_date,
      }),
    });

    if (res.ok) {
      setEditingGoal(null);
      setShowGoalModal(false);
      fetchAllData();
    }
  }

  if (loading) return <div className="page-container"><p>Analyzing your savings...</p></div>;
  if (error) return <div className="page-container"><p style={{ color: "red" }}>{error}</p></div>;

  return (
    <div className="page-container">
      <div className="page-content">
        {/* Header */}
        <div className="autosavings-header">
          <h1>Auto-Savings & Goals</h1>
          <p className="subtitle">Track your savings progress, set goals, and get personalized advice</p>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="recommendations-section">
            <h3>Key Actions</h3>
            <div className="recommendations-list">
              {recommendations.slice(0, 3).map((rec, idx) => (
                <div key={idx} className={`recommendation-card priority-${rec.priority}`}>
                  <div className="rec-number">{idx + 1}</div>
                  <div className="rec-content">
                    <strong className="rec-title">{rec.title}</strong>
                    <p className="rec-description">{rec.description}</p>
                    <button
                      type="button"
                      className="rec-action"
                      onClick={() => {
                        const actionText = rec.action.toLowerCase();
                        if (actionText.includes("sip")) {
                          navigate("/investment");
                          return;
                        }
                        if (actionText.includes("emergenc")) {
                          setEditingGoal(null);
                          setNewGoal({
                            name: "Emergency Fund",
                            target_amount: "",
                            category: "emergency",
                            priority: 1,
                            target_date: "",
                          });
                          setShowGoalModal(true);
                          goalsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
                          return;
                        }
                        if (actionText.includes("goal") || actionText.includes("allocate")) {
                          goalsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
                        }
                      }}
                    >
                      {rec.action}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Advice Card */}
        {data && (
          <div className="card advice-card">
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px"}}>
              <div>
                <h3 style={{margin: 0, fontSize: "20px", fontWeight: "700"}}>Your Savings Plan</h3>
                <p style={{margin: "4px 0 0 0", fontSize: "13px", color: "#666"}}>
                  {isCurrentMonth() 
                    ? "This month you can save" 
                    : `In ${getMonthLabel()} you could have saved`}
                </p>
              </div>
              <span style={{
                fontSize: "14px", 
                fontWeight: "600",
                color: "#1e40af", 
                backgroundColor: "#dbeafe", 
                padding: "8px 16px", 
                borderRadius: "20px",
                border: "1px solid #93c5fd",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}>
                {getMonthLabel()}
              </span>
            </div>
            
            <div className="advice-content">
              {/* Main Savings Amount - Prominent Display */}
              <div style={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                padding: "28px 24px", 
                borderRadius: "12px", 
                marginBottom: "24px", 
                textAlign: "center",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)"
              }}>
                <div style={{fontSize: "14px", color: "#ecfdf5", marginBottom: "8px", fontWeight: "500"}}>
                  Recommended Savings
                </div>
                <div className="amount" style={{margin: "0", color: "#fff", fontSize: "42px", fontWeight: "800", textShadow: "0 2px 4px rgba(0,0,0,0.1)"}}>
                  ₹{data.savings_amount.toLocaleString("en-IN")}
                </div>
                <div style={{fontSize: "14px", color: "#d1fae5", marginTop: "8px", fontWeight: "500"}}>
                  {data.savings_percent}% of your monthly income
                </div>
              </div>

              {/* Two Column Layout: Chart + Stats */}
              <div style={{
                display: "grid", 
                gridTemplateColumns: "1fr 1.2fr", 
                gap: "20px", 
                marginBottom: "20px",
                alignItems: "start"
              }}>
                {/* Pie Chart Column */}
                <div style={{
                  backgroundColor: "#fff", 
                  padding: "20px", 
                  borderRadius: "10px", 
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}>
                  <p style={{
                    fontSize: "13px", 
                    fontWeight: "700", 
                    color: "#374151", 
                    margin: "0 0 16px 0",
                    textAlign: "center",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    Income vs Expenses
                  </p>
                  <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={[
                            {name: "Income", value: data.monthly_income},
                            {name: "Expenses", value: data.monthly_expense}
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          <Cell fill="#3b82f6" />
                          <Cell fill="#f59e0b" />
                        </Pie>
                        <Tooltip formatter={(value) => `₹${value.toLocaleString("en-IN")}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{display: "flex", justifyContent: "center", gap: "24px", marginTop: "12px", fontSize: "13px", fontWeight: "500"}}>
                    <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
                      <div style={{width: "14px", height: "14px", backgroundColor: "#3b82f6", borderRadius: "3px"}}></div>
                      <span style={{color: "#374151"}}>Income</span>
                    </div>
                    <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
                      <div style={{width: "14px", height: "14px", backgroundColor: "#f59e0b", borderRadius: "3px"}}></div>
                      <span style={{color: "#374151"}}>Expenses</span>
                    </div>
                  </div>
                </div>

                {/* Info Grid Column */}
                <div style={{display: "flex", flexDirection: "column", gap: "12px"}}>
                  {/* Income */}
                  <div style={{
                    background: "rgba(239, 246, 255, 0.7)", 
                    backdropFilter: "blur(10px)",
                    padding: "16px 20px", 
                    borderRadius: "10px", 
                    border: "1px solid rgba(59, 130, 246, 0.2)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "all 0.3s ease",
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(59, 130, 246, 0.15)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.2)";
                    e.currentTarget.style.border = "1px solid rgba(59, 130, 246, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(239, 246, 255, 0.7)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.border = "1px solid rgba(59, 130, 246, 0.2)";
                  }}>
                    <div style={{fontSize: "14px", color: "#1e40af", fontWeight: "600"}}>Total Income</div>
                    <div style={{fontSize: "20px", fontWeight: "800", color: "#1e3a8a"}}>
                      ₹{data.monthly_income?.toLocaleString("en-IN")}
                    </div>
                  </div>

                  {/* Expenses */}
                  <div style={{
                    background: "rgba(254, 243, 199, 0.7)", 
                    backdropFilter: "blur(10px)",
                    padding: "16px 20px", 
                    borderRadius: "10px", 
                    border: "1px solid rgba(245, 158, 11, 0.2)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "all 0.3s ease",
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(245, 158, 11, 0.2)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(245, 158, 11, 0.25)";
                    e.currentTarget.style.border = "1px solid rgba(245, 158, 11, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(254, 243, 199, 0.7)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.border = "1px solid rgba(245, 158, 11, 0.2)";
                  }}>
                    <div style={{fontSize: "14px", color: "#b45309", fontWeight: "600"}}>Total Expenses</div>
                    <div style={{fontSize: "20px", fontWeight: "800", color: "#92400e"}}>
                      ₹{data.monthly_expense?.toLocaleString("en-IN")}
                    </div>
                  </div>

                  {/* Leftover */}
                  <div style={{
                    background: "rgba(240, 253, 244, 0.7)", 
                    backdropFilter: "blur(10px)",
                    padding: "16px 20px", 
                    borderRadius: "10px", 
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "all 0.3s ease",
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(16, 185, 129, 0.15)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.25)";
                    e.currentTarget.style.border = "1px solid rgba(16, 185, 129, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(240, 253, 244, 0.7)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.border = "1px solid rgba(16, 185, 129, 0.2)";
                  }}>
                    <div style={{fontSize: "14px", color: "#15803d", fontWeight: "600"}}>Leftover Amount</div>
                    <div style={{fontSize: "20px", fontWeight: "800", color: "#166534"}}>
                      ₹{data.disposable?.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Formula Card */}
              <div style={{
                background: "linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)",
                padding: "16px 20px", 
                borderRadius: "10px", 
                fontSize: "14px", 
                color: "#6b21a8", 
                marginBottom: "16px",
                border: "1px solid #d8b4fe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "600",
                boxShadow: "0 1px 3px rgba(107, 33, 168, 0.1)"
              }}>
                Save 30% of leftover = ₹{data.savings_amount?.toLocaleString("en-IN")}
              </div>

              {/* Status Badge */}
              <div style={{
                display: "flex", 
                alignItems: "center", 
                gap: "12px",
                padding: "14px 18px",
                backgroundColor: "#f9fafb",
                borderRadius: "8px",
                border: "1px solid #e5e7eb"
              }}>
                <strong style={{color: "#374151", fontSize: "14px"}}>Status:</strong>
                <span className={`status ${data.level}`} style={{
                  padding: "4px 12px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "700"
                }}>
                  {data.level.toUpperCase()}
                </span>
                <span style={{color: "#6b7280", fontSize: "14px"}}>— {data.message}</span>
              </div>
            </div>
          </div>
        )}

        {/* Safety & Consistency Cards */}
        <div className="card-grid stat-grid">
          {safety && (
            <div className="card safety-card">
              <h4>Safety Snapshot</h4>
              <div className="metric">
                <div className={`score ${safety.level}`}>{safety.score}</div>
                <div className="label">/ 100</div>
              </div>
              <p className="stat-detail">Level: {safety.level.toUpperCase()}</p>
              <div className="safety-breakdown">
                <div className="breakdown-item">
                  <p className="breakdown-label">Emergency Fund</p>
                  <p className="breakdown-value">{safety.emergency_fund_ratio}%</p>
                  <p className="breakdown-hint">Goal: cover 3 months of expenses</p>
                </div>
                <div className="breakdown-item">
                  <p className="breakdown-label">Income Consistency</p>
                  <p className="breakdown-value">{safety.income_stability}%</p>
                  <p className="breakdown-hint">Higher = more stable income</p>
                </div>
                <div className="breakdown-item">
                  <p className="breakdown-label">Savings Cover</p>
                  <p className="breakdown-value">{safety.buffer_months} months</p>
                  <p className="breakdown-hint">How long savings can cover expenses</p>
                </div>
              </div>
            </div>
          )}

          {consistency && (
            <div className="card consistency-card">
              <div style={{marginBottom: "20px"}}>
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px"}}>
                  <h4 style={{margin: 0, fontSize: "18px", fontWeight: "700"}}>Your Saving Habits</h4>
                  {/* Badges */}
                  {consistency.badges && consistency.badges.length > 0 && (
                    <div style={{display: "flex", gap: "6px"}}>
                      {consistency.badges.map((badge, idx) => (
                        <div key={idx} style={{
                          background: badge.color,
                          color: "white",
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: "700",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px"
                        }} title={badge.name}>
                          {badge.name === "Master Saver" && "★"}
                          {badge.name === "Savings Champion" && "●"}
                          {badge.name === "Consistent Saver" && "✓"}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Adaptive Message */}
                {consistency.adaptive_message && (
                  <div style={{
                    background: "rgba(59, 130, 246, 0.1)",
                    backdropFilter: "blur(10px)",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "1px solid rgba(59, 130, 246, 0.2)",
                    fontSize: "13px",
                    color: "#1e40af",
                    fontWeight: "500",
                    marginBottom: "16px"
                  }}>
                    {consistency.adaptive_message}
                  </div>
                )}
              </div>

              <div className="metric">
                <div className="score">{consistency.consistency_rate}</div>
                <div className="label">% Consistent</div>
              </div>
              <p className="stat-detail">{consistency.achievement}</p>
              
              {/* Monthly Breakdown Visual */}
              {consistency.monthly_breakdown && consistency.monthly_breakdown.length > 0 && (
                <div style={{marginTop: "20px", marginBottom: "20px"}}>
                  <p style={{fontSize: "12px", fontWeight: "600", color: "#6b7280", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px"}}>
                    6-Month History
                  </p>
                  <div style={{display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "8px"}}>
                    {consistency.monthly_breakdown.map((month, idx) => {
                      const monthName = new Date(month.month + "-01").toLocaleString("default", { month: "short" });
                      return (
                        <div key={idx} style={{
                          background: month.status === "positive" 
                            ? "rgba(16, 185, 129, 0.15)" 
                            : "rgba(239, 68, 68, 0.15)",
                          backdropFilter: "blur(10px)",
                          border: `2px solid ${month.status === "positive" ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
                          borderRadius: "8px",
                          padding: "12px 8px",
                          textAlign: "center",
                          transition: "all 0.2s ease",
                          cursor: "pointer"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                        onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                        title={`${monthName}: ₹${month.saved.toLocaleString("en-IN")}`}>
                          <div style={{fontSize: "18px", marginBottom: "4px"}}>
                            {month.status === "positive" ? "✓" : "✗"}
                          </div>
                          <div style={{fontSize: "10px", fontWeight: "600", color: "#374151"}}>
                            {monthName}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="consistency-breakdown">
                <div className="breakdown-item">
                  <p className="breakdown-label">Months with Savings</p>
                  <p className="breakdown-value">{consistency.months_with_savings} of {consistency.total_months_tracked}</p>
                  <p className="breakdown-hint">How many months you saved money</p>
                </div>
                <div className="breakdown-item">
                  <p className="breakdown-label">Current Streak</p>
                  <p className="breakdown-value">{consistency.consecutive_positive_months}</p>
                  <p className="breakdown-hint">Consecutive months of saving</p>
                </div>
              </div>

              {/* Progressive Challenge */}
              {consistency.challenge && (
                <div style={{
                  marginTop: "20px",
                  background: "linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: "10px",
                  padding: "16px",
                  boxShadow: "0 2px 8px rgba(245, 158, 11, 0.1)"
                }}>
                  <div style={{display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px"}}>
                    <span style={{fontSize: "20px"}}>🎯</span>
                    <h5 style={{margin: 0, fontSize: "14px", fontWeight: "700", color: "#92400e"}}>
                      {consistency.challenge.title}
                    </h5>
                  </div>
                  <p style={{margin: 0, fontSize: "13px", color: "#78350f", lineHeight: "1.5"}}>
                    {consistency.challenge.description}
                  </p>
                  {consistency.challenge.type === "maintain_streak" && consistency.challenge.months_to_goal > 0 && (
                    <div style={{
                      marginTop: "12px",
                      padding: "8px 12px",
                      background: "rgba(255, 255, 255, 0.6)",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#92400e"
                    }}>
                      {consistency.challenge.months_to_goal} {consistency.challenge.months_to_goal === 1 ? "month" : "months"} to milestone
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Savings Trend Chart */}
        {trend && trend.length > 0 && (
          <div className="card chart-card">
            <h3>Your 6-Month Savings Trend</h3>
            <p className="chart-subtitle">See how much you saved, earned, and spent each month</p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `₹${value.toLocaleString("en-IN")}`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="saved"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Amount Saved"
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Total Income"
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  stroke="#f97316"
                  strokeWidth={2}
                  name="Total Spending"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Goals Section */}
        <div className="card" ref={goalsSectionRef}>
          <div className="goals-header">
            <h3>Savings Goals</h3>
            <button
              className="btn btn-primary btn-small"
              onClick={() => {
                setEditingGoal(null);
                setShowGoalModal(true);
              }}
            >
              + Add Goal
            </button>
          </div>

          {goals.length > 0 ? (
            <div className="goals-list">
              {goals.map((goal) => (
                <div key={goal.id} className={`goal-item ${goal.on_track ? "on-track" : "behind"}`}>
                  <div className="goal-header">
                    <div className="goal-info">
                      <h4>{goal.name}</h4>
                      <p className="goal-meta">
                        <span className="category-badge">{goal.category}</span>
                        {goal.target_date && <span className="date-badge">{goal.days_remaining} days left</span>}
                        {goal.on_track !== null && (
                          <span className={`track-badge ${goal.on_track ? "on-track" : "behind"}`}>
                            {goal.on_track ? "On Track" : "Behind"}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="goal-actions">
                      <button
                        className="btn-action add"
                        onClick={() => {
                          setSelectedGoal(goal.id);
                          setShowProgressModal(true);
                        }}
                        title="Add progress to goal"
                      >
                        Add Progress
                      </button>
                      <button
                        className="btn-action edit"
                        onClick={() => {
                          setEditingGoal({ ...goal });
                          setShowGoalModal(true);
                        }}
                        title="Edit goal details"
                      >
                        Edit
                      </button>
                      <button
                        className="btn-action delete"
                        onClick={() => deleteGoal(goal.id)}
                        title="Delete goal"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="goal-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(goal.progress_percent, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <p className="progress-text">
                      ₹{goal.current_amount.toLocaleString("en-IN")} / ₹
                      {goal.target_amount.toLocaleString("en-IN")} ({goal.progress_percent}%)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-text">No goals yet. Create one to get started!</p>
          )}
        </div>

        {/* AutoSave Records */}
        {records && records.length > 0 && (
          <div className="card">
            <h3>Recent AutoSaves</h3>
            <div className="records-table">
              <div className="table-header">
                <div className="col-date">Date</div>
                <div className="col-amount">Amount</div>
                <div className="col-type">Type</div>
                <div className="col-status">Status</div>
              </div>
              {records.map((r) => (
                <div key={r.id} className="table-row">
                  <div className="col-date">{r.date}</div>
                  <div className="col-amount">₹{r.amount.toLocaleString("en-IN")}</div>
                  <div className="col-type">{r.rule_type}</div>
                  <div className={`col-status status-${r.status}`}>{r.status}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Goal Modal */}
        {showGoalModal && (
          <div className="modal-overlay" onClick={() => setShowGoalModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>{editingGoal ? "Update Your Goal" : "Create a New Savings Goal"}</h3>
              <form onSubmit={editingGoal ? updateGoal : addGoal}>
                <div className="form-group">
                  <label>Goal Name</label>
                  <p className="form-hint">What are you saving for? (e.g., Vacation, Car, Emergency Fund)</p>
                  <input
                    type="text"
                    placeholder="Enter goal name"
                    value={editingGoal ? editingGoal.name : newGoal.name}
                    onChange={(e) =>
                      editingGoal
                        ? setEditingGoal({ ...editingGoal, name: e.target.value })
                        : setNewGoal({ ...newGoal, name: e.target.value })
                    }
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Target Amount (₹)</label>
                  <p className="form-hint">How much money do you want to save?</p>
                  <input
                    type="number"
                    placeholder="e.g., 50000"
                    value={editingGoal ? editingGoal.target_amount : newGoal.target_amount}
                    onChange={(e) =>
                      editingGoal
                        ? setEditingGoal({ ...editingGoal, target_amount: parseFloat(e.target.value) })
                        : setNewGoal({ ...newGoal, target_amount: parseFloat(e.target.value) })
                    }
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Priority Level</label>
                  <p className="form-hint">Which goals matter most to you?</p>
                  <select
                    value={editingGoal ? editingGoal.priority : newGoal.priority}
                    onChange={(e) =>
                      editingGoal
                        ? setEditingGoal({ ...editingGoal, priority: parseInt(e.target.value) })
                        : setNewGoal({ ...newGoal, priority: parseInt(e.target.value) })
                    }
                    className="form-select"
                  >
                    <option value={1}>High - Focus on this first</option>
                    <option value={2}>Medium - Save when possible</option>
                    <option value={3}>Low - If savings allow</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Target Date (Optional)</label>
                  <p className="form-hint">When do you want to reach this goal?</p>
                  <input
                    type="date"
                    value={editingGoal ? editingGoal.target_date || "" : newGoal.target_date}
                    onChange={(e) =>
                      editingGoal
                        ? setEditingGoal({ ...editingGoal, target_date: e.target.value })
                        : setNewGoal({ ...newGoal, target_date: e.target.value })
                    }
                    className="form-input"
                  />
                </div>

                <div className="modal-buttons">
                  <button type="submit" className="btn btn-primary">
                    {editingGoal ? "Save Changes" : "Create Goal"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowGoalModal(false);
                      setEditingGoal(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Progress Modal */}
        {showProgressModal && (
          <div className="modal-overlay" onClick={() => setShowProgressModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Update Progress</h3>
              <p className="modal-subtitle">
                Goal: <strong>{goals.find(g => g.id === selectedGoal)?.name}</strong>
              </p>
              <form onSubmit={(e) => {
                e.preventDefault();
                addProgress(selectedGoal);
              }}>
                <div className="form-group">
                  <label>Amount Saved (₹)</label>
                  <p className="form-hint">How much money are you adding to this goal?</p>
                  <input
                    type="number"
                    placeholder="e.g., 5000"
                    value={progressAmount}
                    onChange={(e) => setProgressAmount(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="modal-buttons">
                  <button type="submit" className="btn btn-primary">
                    Confirm & Save
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowProgressModal(false);
                      setProgressAmount("");
                      setSelectedGoal(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AutoSavings;
