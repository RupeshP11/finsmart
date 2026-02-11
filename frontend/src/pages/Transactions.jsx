import { useState, useEffect } from "react";
import { API_BASE_URL } from "../config";
import "../styles/transactions.css";

function Transactions({ selectedMonth }) {
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [suggestedCategory, setSuggestedCategory] = useState(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [transactions, setTransactions] = useState([]);

  const token = localStorage.getItem("token");

  // Fetch categories
  async function fetchCategories() {
    const res = await fetch(`${API_BASE_URL}/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setCategories(await res.json());
  }

  // Fetch transactions
  async function fetchTransactions() {
    const res = await fetch(`${API_BASE_URL}/transactions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setTransactions(await res.json());
  }

  useEffect(() => {
    fetchCategories();
    fetchTransactions();
  }, []);

  useEffect(() => {
    if (token) {
      fetchTransactions();
      // Set date to first day of selected month
      setDate(`${selectedMonth}-01`);
    }
  }, [token, selectedMonth]);

  // Auto-suggest category
  async function suggestCategory(text) {
    if (!text || text.trim().length < 3) {
      setSuggestedCategory(null);
      return;
    }

    setLoadingSuggestion(true);

    try {
      const res = await fetch(`${API_BASE_URL}/categorize-expense`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();

      const matched = categories.find(
        (c) =>
          c.name.toLowerCase() === data.category.toLowerCase() &&
          c.type === type
      );

      setSuggestedCategory(matched || null);
    } catch {
      setSuggestedCategory(null);
    } finally {
      setLoadingSuggestion(false);
    }
  }

  // Add transaction
  async function addTransaction(e) {
    e.preventDefault();

    const res = await fetch(`${API_BASE_URL}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount: Number(amount),
        description,
        category_id: Number(categoryId),
        date: date,
      }),
    });

    // re-check alerts for this category
    await fetch(
      `${API_BASE_URL}/budget/check-alerts/${categoryId}?month=${selectedMonth}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setAmount("");
    setDescription("");
    setCategoryId("");
    setDate(new Date().toISOString().split("T")[0]);
    setSuggestedCategory(null);

    fetchTransactions();
  }

  // delete transaction and re-check alerts
  async function deleteTransaction(id, categoryId) {
    if (!window.confirm("Delete this transaction?")) return;

    await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Re-check alerts for this category & month
    await fetch(
      `${API_BASE_URL}/budget/check-alerts/${categoryId}?month=${selectedMonth}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    fetchTransactions();
  }

  // Filter transactions by selected month
  const monthlyTransactions = transactions.filter(
    (t) => t.date.slice(0, 7) === selectedMonth
  );

  // Group by date
  function groupByDate(txns) {
    return txns.reduce((acc, t) => {
      acc[t.date] = acc[t.date] || [];
      acc[t.date].push(t);
      return acc;
    }, {});
  }

  const filteredCategories = categories.filter((c) => c.type === type);
  const grouped = groupByDate(monthlyTransactions);
  const sortedDates = Object.keys(grouped).sort().reverse();

  return (
    <div className="page-container">
      <div className="page-content">
        {/* Page Header */}
        <div className="transactions-header">
          <h1>Add Transaction</h1>
          <p className="subtitle">
            {new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Add Transaction Form Card */}
        <div className="card form-card">
          <form onSubmit={addTransaction} className="transaction-form">
            {/* Type Selection */}
            <div className="form-group">
              <label className="form-label">Transaction Type</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    checked={type === "expense"}
                    onChange={() => {
                      setType("expense");
                      setSuggestedCategory(null);
                    }}
                  />
                  <span>Expense</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    checked={type === "income"}
                    onChange={() => {
                      setType("income");
                      setSuggestedCategory(null);
                    }}
                  />
                  <span>Income</span>
                </label>
              </div>
            </div>

            {/* Amount */}
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="form-input"
                required
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Description</label>
              <div style={{position: "relative"}}>
                <input
                  type="text"
                  placeholder="What did you buy or earn?"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    suggestCategory(e.target.value);
                  }}
                  className="form-input"
                />
                {loadingSuggestion && (
                  <div style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "12px",
                    color: "#6b7280",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}>
                    <div style={{
                      width: "14px",
                      height: "14px",
                      border: "2px solid #e5e7eb",
                      borderTopColor: "#3b82f6",
                      borderRadius: "50%",
                      animation: "spin 0.6s linear infinite"
                    }}></div>
                    <span>Analyzing...</span>
                  </div>
                )}
              </div>
              
              {/* Inline Suggestion Chip */}
              {suggestedCategory && (
                <div style={{
                  marginTop: "8px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(59, 130, 246, 0.1)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  fontSize: "13px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onClick={() => {
                  setCategoryId(String(suggestedCategory.id));
                  setSuggestedCategory(null);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(59, 130, 246, 0.2)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(59, 130, 246, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
                title="Click to apply this category">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 11l3 3L22 4"></path>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                  </svg>
                  <span style={{fontWeight: "600", color: "#1e40af"}}>
                    Suggested: {suggestedCategory.name}
                  </span>
                  <span style={{
                    fontSize: "11px", 
                    color: "#3b82f6", 
                    fontWeight: "500",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    Click to apply
                  </span>
                </div>
              )}
            </div>

            {/* Date Select */}
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-input"
                required
              />
              <small style={{ color: "#6b7280", marginTop: "4px", display: "block" }}>
                Select date for this transaction (currently in {selectedMonth})
              </small>
            </div>

            {/* Category Select */}
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="form-select"
                required
              >
                <option value="">Select a category...</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <button type="submit" className="btn btn-primary btn-wide">
              Add Transaction
            </button>
          </form>
        </div>

        {/* Transactions List */}
        <div>
          <h2 className="section-title">
            Transactions ({monthlyTransactions.length})
          </h2>

          {sortedDates.length === 0 ? (
            <div className="empty-state">
              <p>No transactions yet. Add one above!</p>
            </div>
          ) : (
            <div className="transactions-list">
              {sortedDates.map((date) => (
                <div key={date} className="date-group">
                  <div className="date-header">
                    <h4>{new Date(date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}</h4>
                  </div>

                  <div className="transactions-group">
                    {grouped[date].map((t) => {
                      const txType =
                        t.category_type === "income" ? "income" : "expense";

                      return (
                        <div key={t.id} className="transaction-item">
                        <div className="transaction-info">
                          <div className="transaction-details">
                            <p className="transaction-category">
                              {t.category_name}
                            </p>
                            <p className="transaction-description">
                              {t.description || "No description"}
                            </p>
                          </div>
                          <div className={`transaction-amount ${txType}`}>
                            {txType === "income" ? "+" : "-"}₹
                            {t.amount.toLocaleString("en-IN")}
                          </div>
                        </div>
                        <button
                          className="btn-delete"
                          onClick={() => deleteTransaction(t.id, t.category_id)}
                          title="Delete transaction"
                          aria-label="Delete transaction"
                        >
                          Remove
                        </button>
                      </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Transactions;
