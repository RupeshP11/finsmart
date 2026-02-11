import "../styles/monthSelector.css";

function MonthSelector({ selectedMonth, onMonthChange }) {
  return (
    <div className="month-selector-wrapper">
      <div className="month-selector-container">
        <label htmlFor="month-input" className="month-label">
          Month
        </label>
        <input
          id="month-input"
          type="month"
          value={selectedMonth}
          onChange={(e) => onMonthChange(e.target.value)}
          className="month-input"
        />
      </div>
    </div>
  );
}

export default MonthSelector;
