import { useEffect, useMemo, useState } from "react";
import "../styles/ticker.css";
import { API_BASE_URL } from "../config";

const FALLBACK_ITEMS = [
  { symbol: "NIFTY 50", price: 22124.3, change: 62.4, changePercent: 0.28 },
  { symbol: "SENSEX", price: 73112.1, change: -148.6, changePercent: -0.2 },
  { symbol: "RELIANCE", price: 2456.8, change: 12.5, changePercent: 0.51 },
  { symbol: "TCS", price: 3842.6, change: -8.2, changePercent: -0.21 },
  { symbol: "INFY", price: 1654.3, change: 15.8, changePercent: 0.96 },
  { symbol: "HDFCBANK", price: 1622.4, change: -5.6, changePercent: -0.34 },
  { symbol: "ICICIBANK", price: 1089.7, change: 7.3, changePercent: 0.67 },
  { symbol: "BHARTIARTL", price: 1245.2, change: 18.4, changePercent: 1.5 },
  { symbol: "ITC", price: 412.8, change: 6.2, changePercent: 1.52 },
  { symbol: "VEDL", price: 568.3, change: -12.4, changePercent: -2.13 },
  { symbol: "BPCL", price: 389.5, change: 4.8, changePercent: 1.24 },
  { symbol: "HPCL", price: 405.2, change: -3.1, changePercent: -0.76 },
  { symbol: "MARUTI", price: 11285.6, change: 28.5, changePercent: 0.25 },
  { symbol: "SUNPHARMA", price: 682.4, change: -9.3, changePercent: -1.35 },
  { symbol: "WIPRO", price: 458.2, change: 3.2, changePercent: 0.70 },
  { symbol: "ASIANPAINT", price: 3234.8, change: 15.6, changePercent: 0.48 },
];

function TickerTape() {
  const [items, setItems] = useState(FALLBACK_ITEMS);

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2,
      }),
    []
  );

  useEffect(() => {
    let isMounted = true;

    fetch(`${API_BASE_URL}/markets/ticker`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (Array.isArray(data.items) && data.items.length > 0) {
          setItems(data.items);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const loopItems = [...items, ...items, ...items, ...items];

  return (
    <div className="ticker-bar" role="region" aria-label="Live market prices">
      <div className="ticker-inner">
        <div className="ticker-track">
          {loopItems.map((item, index) => {
            const isUp = Number(item.change) >= 0;
            const changeSign = isUp ? "+" : "";
            const changePercent = Number(item.changePercent) || 0;
            return (
              <div
                className={`ticker-item ${isUp ? "up" : "down"}`}
                key={`${item.symbol}-${index}`}
              >
                <span className="ticker-symbol">{item.symbol}</span>
                <span className="ticker-price">
                  {formatter.format(Number(item.price) || 0)}
                </span>
                <span className="ticker-change">
                  {changeSign}
                  {formatter.format(Number(item.change) || 0)} (
                  {changeSign}
                  {formatter.format(changePercent)}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default TickerTape;
