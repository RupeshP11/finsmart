import { useMemo, useState } from "react";
import "../styles/sip.css";

function SIP() {
  const [mode, setMode] = useState("sip");
  const [monthly, setMonthly] = useState("");
  const [rate, setRate] = useState("");
  const [years, setYears] = useState("");
  const [stepUpEnabled, setStepUpEnabled] = useState(false);
  const [stepUpPercent, setStepUpPercent] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const [lumpsum, setLumpsum] = useState("");
  const [lumpRate, setLumpRate] = useState("");
  const [lumpYears, setLumpYears] = useState("");
  const [lumpResult, setLumpResult] = useState(null);

  const token = localStorage.getItem("token");

  async function calculateSIP(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/sip/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          monthly_investment: Number(monthly),
          annual_rate: Number(rate),
          years: Number(years),
          step_up_percent: stepUpEnabled ? Number(stepUpPercent) : 0,
        }),
      });

      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error("SIP calculation failed", err);
    } finally {
      setLoading(false);
    }
  }

  function calculateLumpsum(e) {
    e.preventDefault();
    const principal = Number(lumpsum);
    const annualRate = Number(lumpRate) / 100;
    const duration = Number(lumpYears);

    if (!principal || !annualRate || !duration) return;

    const maturity = Math.round(principal * Math.pow(1 + annualRate, duration));
    const gain = Math.round(maturity - principal);

    setLumpResult({
      total_invested: principal,
      maturity_value: maturity,
      gain,
    });
  }

  const activeResult = mode === "sip" ? result : lumpResult;
  const invested = activeResult?.total_invested || 0;
  const returns = activeResult?.gain || 0;
  const total = invested + returns;
  const investedAngle = total ? Math.round((invested / total) * 360) : 0;

  const chartStyle = useMemo(() => {
    return {
      background: `conic-gradient(#6366F1 0deg ${investedAngle}deg, #059669 ${investedAngle}deg 360deg)`,
    };
  }, [investedAngle]);

  return (
    <div className="sip-page">
      <div className="sip-header">
        <div className="sip-title">SIP & Lumpsum Calculator</div>
        <div className="sip-subtitle">
          Plan smarter investments with a clean breakdown of invested amount and estimated returns.
        </div>
      </div>

      <div className="sip-layout">
        <div className="sip-card fade-in-up">
          <div className="sip-tabs">
            <button
              type="button"
              className={`sip-tab ${mode === "sip" ? "active" : ""}`}
              onClick={() => setMode("sip")}
            >
              SIP
            </button>
            <button
              type="button"
              className={`sip-tab ${mode === "lumpsum" ? "active" : ""}`}
              onClick={() => setMode("lumpsum")}
            >
              Lumpsum
            </button>
          </div>

          {mode === "sip" ? (
            <form className="sip-form" onSubmit={calculateSIP}>
              <div className="sip-field">
                <label className="sip-label">Monthly Investment</label>
                <input
                  className="sip-input"
                  type="number"
                  placeholder="₹ 10,000"
                  value={monthly}
                  onChange={(e) => setMonthly(e.target.value)}
                  required
                />
              </div>

              <div className="sip-field">
                <label className="sip-label">Expected Annual Return</label>
                <input
                  className="sip-input"
                  type="number"
                  placeholder="12%"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  required
                />
              </div>

              <div className="sip-field">
                <label className="sip-label">Investment Duration</label>
                <input
                  className="sip-input"
                  type="number"
                  placeholder="10 years"
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                  required
                />
              </div>

              <label className="sip-toggle">
                <input
                  type="checkbox"
                  checked={stepUpEnabled}
                  onChange={() => setStepUpEnabled(!stepUpEnabled)}
                />
                Enable Step-Up SIP
              </label>

              {stepUpEnabled && (
                <div className="sip-field">
                  <label className="sip-label">Step-Up Percentage</label>
                  <input
                    className="sip-input"
                    type="number"
                    placeholder="10% per year"
                    value={stepUpPercent}
                    onChange={(e) => setStepUpPercent(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="sip-actions">
                <button type="submit" className="sip-submit" disabled={loading}>
                  {loading ? "Calculating..." : "Calculate SIP"}
                </button>
                <span className="sip-note">Results include step-up if enabled.</span>
              </div>
            </form>
          ) : (
            <form className="sip-form" onSubmit={calculateLumpsum}>
              <div className="sip-field">
                <label className="sip-label">Investment Amount</label>
                <input
                  className="sip-input"
                  type="number"
                  placeholder="₹ 2,00,000"
                  value={lumpsum}
                  onChange={(e) => setLumpsum(e.target.value)}
                  required
                />
              </div>

              <div className="sip-field">
                <label className="sip-label">Expected Annual Return</label>
                <input
                  className="sip-input"
                  type="number"
                  placeholder="12%"
                  value={lumpRate}
                  onChange={(e) => setLumpRate(e.target.value)}
                  required
                />
              </div>

              <div className="sip-field">
                <label className="sip-label">Investment Duration</label>
                <input
                  className="sip-input"
                  type="number"
                  placeholder="10 years"
                  value={lumpYears}
                  onChange={(e) => setLumpYears(e.target.value)}
                  required
                />
              </div>

              <div className="sip-actions">
                <button type="submit" className="sip-submit">
                  Calculate Lumpsum
                </button>
                <span className="sip-note">One-time investment growth projection.</span>
              </div>
            </form>
          )}
        </div>

        <div className="sip-card fade-in-up">
          <div className="sip-result">
            <div className="chart-wrap">
              <div className="modern-chart" style={chartStyle}>
                <div className="chart-tooltip" role="status">
                  <div className="tooltip-row">
                    <span>Invested</span>
                    <strong>₹{invested.toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="tooltip-row">
                    <span>Estimated Returns</span>
                    <strong>₹{returns.toLocaleString("en-IN")}</strong>
                  </div>
                </div>
                <div className="chart-center">
                  <div className="chart-title">Total Value</div>
                  <div className="chart-value">
                    ₹{total.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>
              <div className="chart-legend">
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: "#6366F1" }} />
                  Invested
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: "#059669" }} />
                  Returns
                </div>
              </div>
            </div>

            <div className="result-cards">
              <div className="result-card">
                <div className="result-label">Invested</div>
                <div className="result-value">₹{invested.toLocaleString("en-IN")}</div>
              </div>
              <div className="result-card">
                <div className="result-label">Estimated Returns</div>
                <div className="result-value">₹{returns.toLocaleString("en-IN")}</div>
              </div>
              <div className="result-card">
                <div className="result-label">Maturity Value</div>
                <div className="result-value">₹{total.toLocaleString("en-IN")}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SIP;
