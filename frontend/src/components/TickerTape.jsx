import { useEffect, useMemo, useState } from "react";
import "../styles/ticker.css";
import { API_BASE_URL } from "../config";

const FALLBACK_ITEMS = [
  { symbol: "NIFTY 50", price: 22500.0, change: 0.0, changePercent: 0.0 },
  { symbol: "SENSEX", price: 74000.0, change: 0.0, changePercent: 0.0 },
  { symbol: "RELIANCE", price: 2500.0, change: 0.0, changePercent: 0.0 },
  { symbol: "TCS", price: 3850.0, change: 0.0, changePercent: 0.0 },
  { symbol: "INFY", price: 1650.0, change: 0.0, changePercent: 0.0 },
  { symbol: "HDFCBANK", price: 1620.0, change: 0.0, changePercent: 0.0 },
  { symbol: "ICICIBANK", price: 1090.0, change: 0.0, changePercent: 0.0 },
  { symbol: "HINDUNILVR", price: 2350.0, change: 0.0, changePercent: 0.0 },
  { symbol: "BHARTIARTL", price: 1250.0, change: 0.0, changePercent: 0.0 },
  { symbol: "ITC", price: 415.0, change: 0.0, changePercent: 0.0 },
];

function TickerTape() {
  const [items, setItems] = useState(FALLBACK_ITEMS);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2,
      }),
    []
  );

  useEffect(() => {
    let isMounted = true;

    const fetchTicker = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/markets/ticker`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        if (isMounted) {
          if (Array.isArray(data.items) && data.items.length > 0) {
            setItems(data.items);
            setLastUpdate(new Date());
            console.log(`[TICKER] Updated with ${data.items.length} items`);
          } else {
            console.warn("[TICKER] No items received, using fallback");
            setItems(FALLBACK_ITEMS);
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error("[TICKER] Fetch error:", error);
        if (isMounted) {
          setItems(FALLBACK_ITEMS);
          setIsLoading(false);
        }
      }
    };

    // Fetch immediately
    fetchTicker();

    // Refresh every 60 seconds to match backend cache and avoid rate limits
    // Backend caches for 60s to prevent Yahoo Finance API rate limiting
    const interval = setInterval(fetchTicker, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const loopItems = [...items, ...items, ...items, ...items];

  return (
    <div className="ticker-bar" role="region" aria-label="Live market prices">
      <div className="ticker-inner">
        <div className="ticker-track" data-loading={isLoading}>
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
