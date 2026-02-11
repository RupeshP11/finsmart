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
  ComposedChart,
} from "recharts";
import CalendarHeatmap from "react-calendar-heatmap";
import "react-calendar-heatmap/style.css";
import "../styles/analytics-new.css";
import { API_BASE_URL } from "../config";

function Analytics({ selectedMonth }) {
  const token = localStorage.getItem("token");
  const [year, month] = selectedMonth.split("-");

  // State for all features
  const [pieData, setPieData] = useState([]);
  const [lineData, setLineData] = useState([]);
  const [historicalData, setHistoricalData] = useState(null);
  const [goalVsReality, setGoalVsReality] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [recurringTransactions, setRecurringTransactions] = useState(null);
  const [incomeExpenseRatio, setIncomeExpenseRatio] = useState(null);
  const [loading, setLoading] = useState(true);

  const COLORS = ["#0088FE", "#00C49F", "#FF8042", "#8B5CF6", "#EC4899"];

  useEffect(() => {
    if (token) {
      fetchAllAnalytics();
    }
  }, [token, selectedMonth]);

  async function fetchAllAnalytics() {
    try {
      setLoading(true);
      const [pie, line, hist, gvr, heat, recurring, ratio] = await Promise.all([
        fetch(`${API_BASE_URL}/analytics/expense-by-category?year=${year}&month=${Number(month)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()),
        
        fetch(`${API_BASE_URL}/analytics/daily-expense?year=${year}&month=${Number(month)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()),
        
        fetch(`${API_BASE_URL}/analytics/historical-comparison`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()),
        
        fetch(`${API_BASE_URL}/analytics/goal-vs-reality?year=${year}&month=${Number(month)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()),
        
        fetch(`${API_BASE_URL}/analytics/heatmap-data?year=${year}&month=${Number(month)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()),
        
        fetch(`${API_BASE_URL}/analytics/recurring-transactions`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()),
        
        fetch(`${API_BASE_URL}/analytics/income-expense-ratio?months=12`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()),
      ]);

      setPieData(Array.isArray(pie) ? pie : []);
      setLineData(Array.isArray(line) ? line : []);
      setHistoricalData(hist);
      setGoalVsReality(gvr);
      setHeatmapData(heat.data || []);
      setRecurringTransactions(recurring);
      setIncomeExpenseRatio(ratio);
    } catch (err) {
      console.error("Analytics error:", err);
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
          <h1>Advanced Analytics</h1>
          <p className="subtitle">Comprehensive spending insights and financial intelligence</p>
        </div>

        {/* Section 1: Historical Comparison */}
        {historicalData && (
          <div className="card analytics-card">
            <div className="card-header">
              <h3>Quarterly Comparison</h3>
              <p className="card-hint">Your spending across quarters</p>
            </div>
            
            {historicalData.comparison && (
              <div className="comparison-summary">
                <div className="summary-item">
                  <span className="label">Last Quarter</span>
                  <span className="amount">₹{historicalData.comparison.previous_quarter_expense.toLocaleString("en-IN")}</span>
                </div>
                <div className="summary-item">
                  <span className="label">This Quarter</span>
                  <span className="amount">₹{historicalData.comparison.current_quarter_expense.toLocaleString("en-IN")}</span>
                </div>
                <div className={`summary-item trend-${historicalData.comparison.trend}`}>
                  <span className="label">Change</span>
                  <span className="amount">{historicalData.comparison.change_percent > 0 ? '↑' : '↓'} {Math.abs(historicalData.comparison.change_percent)}%</span>
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
              <h3>Budget vs Actual</h3>
              <p className="card-hint">How well you're sticking to your budget</p>
            </div>

            {goalVsReality.summary && (
              <div className="budget-summary">
                <div style={{background: "rgba(59, 130, 246, 0.1)", backdropFilter: "blur(10px)", padding: "16px", borderRadius: "8px", marginBottom: "16px"}}>
                  <div style={{display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px"}}>
                    <div style={{textAlign: "center"}}>
                      <p style={{margin: "0 0 4px 0", fontSize: "12px", color: "#666"}}>Budgeted</p>
                      <p style={{margin: 0, fontSize: "18px", fontWeight: "700", color: "#1e40af"}}>
                        ₹{goalVsReality.summary.total_budgeted.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div style={{textAlign: "center"}}>
                      <p style={{margin: "0 0 4px 0", fontSize: "12px", color: "#666"}}>Actual</p>
                      <p style={{margin: 0, fontSize: "18px", fontWeight: "700", color: "#dc2626"}}>
                        ₹{goalVsReality.summary.total_actual.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div style={{textAlign: "center"}}>
                      <p style={{margin: "0 0 4px 0", fontSize: "12px", color: "#666"}}>Variance</p>
                      <p style={{margin: 0, fontSize: "18px", fontWeight: "700", color: goalVsReality.summary.status === "over" ? "#dc2626" : "#10b981"}}>
                        {goalVsReality.summary.status === "over" ? "+" : "-"}{Math.abs(goalVsReality.summary.total_variance_percent)}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="category-comparison">
                  {goalVsReality.by_category && goalVsReality.by_category.map((cat, idx) => (
                    <div key={idx} className="comparison-row">
                      <div style={{flex: 1}}>
                        <p style={{margin: 0, fontWeight: "600", fontSize: "14px"}}>{cat.category}</p>
                        <div style={{marginTop: "6px", height: "6px", background: "#e5e7eb", borderRadius: "3px", overflow: "hidden"}}>
                          <div style={{
                            height: "100%",
                            width: `${Math.min(100, (cat.utilization_percent))}%`,
                            background: cat.status === "over" ? "#ef4444" : "#10b981",
                            transition: "width 0.3s ease"
                          }}></div>
                        </div>
                      </div>
                      <div style={{textAlign: "right", marginLeft: "16px"}}>
                        <p style={{margin: 0, fontSize: "12px", color: "#666"}}>
                          ₹{cat.actual.toLocaleString("en-IN")} / ₹{cat.budgeted.toLocaleString("en-IN")}
                        </p>
                        <p style={{margin: 0, fontSize: "12px", fontWeight: "600", color: cat.status === "over" ? "#dc2626" : "#10b981"}}>
                          {cat.status === "over" ? "+" : "-"}{Math.abs(cat.variance_percent)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 3: Spending Heatmap */}
        {heatmapData.length > 0 && (
          <div className="card analytics-card">
            <div className="card-header">
              <h3>Daily Spending Heatmap</h3>
              <p className="card-hint">Identify your high-spending days</p>
            </div>

            <div className="heatmap-container">
              <CalendarHeatmap
                startDate={new Date(year, month - 1, 1)}
                endDate={new Date(year, month, 0)}
                values={heatmapData.map(d => ({
                  date: d.date,
                  count: d.value
                }))}
                classForValue={(value) => {
                  if (!value) return 'color-empty';
                  const ratio = value.count / Math.max(...heatmapData.map(d => d.value), 1);
                  if (ratio > 0.75) return 'color-scale-5';
                  if (ratio > 0.5) return 'color-scale-4';
                  if (ratio > 0.25) return 'color-scale-3';
                  return 'color-scale-1';
                }}
                tooltipDataAttrs={(value) => ({
                  "data-tip": value.date ? `${value.date}: ₹${value.count}` : "No data"
                })}
              />
              <p style={{fontSize: "12px", color: "#666", marginTop: "12px", textAlign: "center"}}>
                Darker = More spending
              </p>
            </div>
          </div>
        )}

        {/* Section 4: Recurring Transactions / Subscriptions */}
        {recurringTransactions && recurringTransactions.subscriptions && (
          <div className="card analytics-card">
            <div className="card-header">
              <h3>Subscriptions & Recurring Charges</h3>
              <p className="card-hint">Money you spend regularly</p>
            </div>

            {recurringTransactions.summary && (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "12px",
                marginBottom: "20px"
              }}>
                <div style={{background: "rgba(16, 185, 129, 0.1)", backdropFilter: "blur(10px)", padding: "12px", borderRadius: "8px", textAlign: "center"}}>
                  <p style={{margin: 0, fontSize: "12px", color: "#059669", fontWeight: "600"}}>Monthly Cost</p>
                  <p style={{margin: "6px 0 0 0", fontSize: "18px", fontWeight: "700", color: "#15803d"}}>
                    ₹{recurringTransactions.summary.total_recurring_monthly.toLocaleString("en-IN")}
                  </p>
                </div>
                <div style={{background: "rgba(168, 85, 247, 0.1)", backdropFilter: "blur(10px)", padding: "12px", borderRadius: "8px", textAlign: "center"}}>
                  <p style={{margin: 0, fontSize: "12px", color: "#7c3aed", fontWeight: "600"}}>Yearly Cost</p>
                  <p style={{margin: "6px 0 0 0", fontSize: "18px", fontWeight: "700", color: "#6d28d9"}}>
                    ₹{recurringTransactions.summary.total_recurring_yearly.toLocaleString("en-IN")}
                  </p>
                </div>
                <div style={{background: "rgba(59, 130, 246, 0.1)", backdropFilter: "blur(10px)", padding: "12px", borderRadius: "8px", textAlign: "center"}}>
                  <p style={{margin: 0, fontSize: "12px", color: "#0284c7", fontWeight: "600"}}>Subscriptions</p>
                  <p style={{margin: "6px 0 0 0", fontSize: "18px", fontWeight: "700", color: "#1e40af"}}>
                    {recurringTransactions.summary.subscription_count}
                  </p>
                </div>
              </div>
            )}

            <div className="subscriptions-list">
              {recurringTransactions.subscriptions && recurringTransactions.subscriptions.map((sub, idx) => (
                <div key={idx} className="subscription-item">
                  <div>
                    <p style={{margin: 0, fontWeight: "600", fontSize: "14px"}}>{sub.description}</p>
                    <p style={{margin: "4px 0 0 0", fontSize: "12px", color: "#666"}}>
                      {sub.category} • {sub.frequency} times in 6 months
                    </p>
                  </div>
                  <div style={{textAlign: "right"}}>
                    <p style={{margin: 0, fontSize: "14px", fontWeight: "700"}}>
                      ₹{sub.estimated_yearly.toLocaleString("en-IN")}/yr
                    </p>
                    <p style={{margin: "4px 0 0 0", fontSize: "12px", color: "#666"}}>
                      ₹{sub.estimated_monthly.toLocaleString("en-IN")}/mo
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 5: Income to Expense Ratio */}
        {incomeExpenseRatio && (
          <div className="card analytics-card">
            <div className="card-header">
              <h3>Income-to-Expense Ratio</h3>
              <p className="card-hint">Track your financial health over time</p>
            </div>

            <div style={{marginBottom: "16px", padding: "12px", background: "rgba(59, 130, 246, 0.1)", borderRadius: "8px"}}>
              <p style={{margin: 0, fontSize: "12px", color: "#666"}}>Average Ratio</p>
              <p style={{margin: "6px 0 0 0", fontSize: "24px", fontWeight: "700", color: "#1e40af"}}>
                1 : {(1 / incomeExpenseRatio.average_ratio).toFixed(2)}
              </p>
              <p style={{margin: "4px 0 0 0", fontSize: "12px", color: "#666"}}>
                For every ₹1 earned, you spend ₹{(1 / incomeExpenseRatio.average_ratio).toFixed(2)}
              </p>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={incomeExpenseRatio.data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" label={{value: 'Ratio', angle: -90, position: 'insideLeft'}} />
                <YAxis yAxisId="right" orientation="right" label={{value: 'Savings %', angle: 90, position: 'insideRight'}} />
                <Tooltip formatter={(value) => value.toFixed(2)} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="ratio" stroke="#3b82f6" strokeWidth={2} name="Income-to-Expense Ratio" />
                <Line yAxisId="right" type="monotone" dataKey="savings_percent" stroke="#10b981" strokeWidth={2} name="Savings %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Section 6: Expense by Category */}
        {pieData.length > 0 && (
          <div className="card-grid">
            <div className="card analytics-card">
              <div className="card-header">
                <h3>Expense Breakdown</h3>
                <p className="card-hint">Where your money goes</p>
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
                <h3>Daily Spending Trend</h3>
                <p className="card-hint">How much you spend each day</p>
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
