import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Transactions from "./pages/Transactions";
import Navbar from "./components/Navbar";
import TickerTape from "./components/TickerTape";
import MonthSelector from "./components/MonthSelector";
import Budget from "./pages/Budget";
import Insights from "./pages/Insights";
import SIP from "./pages/SIP";
import InvestmentAdvisor from "./pages/InvestmentAdvisor";
import AutoSavings from "./pages/AutoSavings";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("token")
  );

  const getCurrentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const [month, setMonth] = useState(
    localStorage.getItem("selectedMonth") || getCurrentMonth()
  );

  const [aiResponse, setAiResponse] = useState(null);

  function handleLoginSuccess() {
    setIsAuthenticated(true);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
  }

  function handleMonthChange(value) {
    setMonth(value);
    localStorage.setItem("selectedMonth", value);
  }

  return (
    <BrowserRouter>
      {isAuthenticated && (
        <>
          <TickerTape />
          <Navbar onLogout={handleLogout} />
          <MonthSelector selectedMonth={month} onMonthChange={handleMonthChange} />
        </>
      )}

      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" />
            ) : (
              <Login onLogin={handleLoginSuccess} />
            )
          }
        />

        <Route path="/login" element={<Login onLogin={handleLoginSuccess} />} />
        <Route path="/signup" element={<Signup />} />

        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              <Dashboard
                selectedMonth={month}
                aiResponse={aiResponse}
                setAiResponse={setAiResponse}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/analytics"
          element={
            isAuthenticated ? (
              <Analytics selectedMonth={month} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/transactions"
          element={
            isAuthenticated ? (
              <Transactions selectedMonth={month} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/budget"
          element={
            isAuthenticated ? (
              <Budget selectedMonth={month} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/insights"
          element={
            isAuthenticated ? (
              <Insights selectedMonth={month} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/sip"
          element={isAuthenticated ? <SIP /> : <Navigate to="/login" />}
        />

        <Route
          path="/investment"
          element={
            isAuthenticated ? <InvestmentAdvisor selectedMonth={month} /> : <Navigate to="/login" />
          }
        />

        <Route
          path="/auto-savings"
          element={
            isAuthenticated ? <AutoSavings selectedMonth={month} /> : <Navigate to="/login" />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
