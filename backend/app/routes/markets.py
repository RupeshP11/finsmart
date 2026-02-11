import json
import http.cookiejar
import time
import urllib.request
from urllib.parse import quote
import yfinance as yf
from fastapi import APIRouter

router = APIRouter(prefix="/markets", tags=["Markets"])

# NSE India symbols for yfinance (with .NS suffix)
DEFAULT_SYMBOLS = [
    "^NSEI",
    "^BSESN",
    "RELIANCE.NS",
    "TCS.NS",
    "INFY.NS",
    "HDFCBANK.NS",
    "ICICIBANK.NS",
    "HINDUNILVR.NS",
    "BHARTIARTL.NS",
    "ITC.NS",
    "VEDL.NS",
    "BPCL.NS",
    "HPCL.NS",
    "IOC.NS",
    "MARUTI.NS",
    "SUNPHARMA.NS",
    "WIPRO.NS",
    "ASIANPAINT.NS",
]

SYMBOL_LABELS = {
    "^NSEI": "NIFTY 50",
    "^BSESN": "SENSEX",
}

# Simple in-memory cache to avoid rate limits (30s for fresher data)
_CACHE = {
    "timestamp": 0,
    "items": [],
}

FALLBACK_ITEMS = [
    {"symbol": "NIFTY 50", "price": 22124.3, "change": 62.4, "changePercent": 0.28},
    {"symbol": "SENSEX", "price": 73112.1, "change": -148.6, "changePercent": -0.2},
    {"symbol": "RELIANCE", "price": 2456.8, "change": 12.5, "changePercent": 0.51},
    {"symbol": "TCS", "price": 3842.6, "change": -8.2, "changePercent": -0.21},
    {"symbol": "INFY", "price": 1654.3, "change": 15.8, "changePercent": 0.96},
    {"symbol": "HDFCBANK", "price": 1622.4, "change": -5.6, "changePercent": -0.34},
    {"symbol": "ICICIBANK", "price": 1089.7, "change": 7.3, "changePercent": 0.67},
    {"symbol": "BHARTIARTL", "price": 1245.2, "change": 18.4, "changePercent": 1.5},
    {"symbol": "ITC", "price": 412.8, "change": 6.2, "changePercent": 1.52},
    {"symbol": "VEDL", "price": 568.3, "change": -12.4, "changePercent": -2.13},
    {"symbol": "BPCL", "price": 389.5, "change": 4.8, "changePercent": 1.24},
    {"symbol": "HPCL", "price": 405.2, "change": -3.1, "changePercent": -0.76},
    {"symbol": "MARUTI", "price": 11285.6, "change": 28.5, "changePercent": 0.25},
    {"symbol": "SUNPHARMA", "price": 682.4, "change": -9.3, "changePercent": -1.35},
    {"symbol": "WIPRO", "price": 458.2, "change": 3.2, "changePercent": 0.70},
    {"symbol": "ASIANPAINT", "price": 3234.8, "change": 15.6, "changePercent": 0.48},
]


def fetch_nse_quotes(symbols):
    """Fetch live quotes from NSE India (free, no API key needed)."""
    items = []
    cookie_jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json,text/plain,*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.nseindia.com/",
        "Connection": "keep-alive",
    }

    try:
        opener.open(urllib.request.Request("https://www.nseindia.com", headers=headers), timeout=5).read()
    except Exception:
        return items

    for symbol in symbols:
        # NSE quote API only supports equity symbols without suffix
        if symbol.startswith("^"):
            continue
        nse_symbol = symbol.replace(".NS", "")
        url = f"https://www.nseindia.com/api/quote-equity?symbol={quote(nse_symbol)}"
        try:
            request = urllib.request.Request(url, headers=headers)
            with opener.open(request, timeout=5) as response:
                data = json.loads(response.read().decode("utf-8"))
            price_info = data.get("priceInfo", {})
            last_price = price_info.get("lastPrice")
            if last_price is None:
                continue
            items.append(
                {
                    "symbol": nse_symbol,
                    "price": float(last_price),
                    "change": float(price_info.get("change", 0)),
                    "changePercent": float(price_info.get("pChange", 0)),
                }
            )
        except Exception:
            continue

    return items


def _display_symbol(symbol):
    if symbol in SYMBOL_LABELS:
        return SYMBOL_LABELS[symbol]
    return symbol.replace(".NS", "")


def fetch_yfinance_quotes(symbols):
    """Fetch quotes from yfinance (free, no API key needed) - LIVE prices."""
    items = []
    for symbol in symbols:
        try:
            stock = yf.Ticker(symbol)

            # Use 1-minute interval data for most up-to-date live price
            data = stock.history(period="1d", interval="1m")
            
            if len(data) >= 2:
                # Get the very latest price available (most recent minute)
                current_price = data["Close"].dropna().iloc[-1]
                
                # Compare to previous close from info (day's opening reference)
                info = stock.info if hasattr(stock, 'info') else {}
                prev_close = info.get("previousClose") or info.get("regularMarketPreviousClose")
                
                # If no previous close, use first price of today
                if not prev_close or prev_close == 0:
                    prev_close = data["Open"].dropna().iloc[0]
                
                change = current_price - prev_close
                change_percent = (change / prev_close * 100) if prev_close > 0 else 0
                
                items.append(
                    {
                        "symbol": _display_symbol(symbol),
                        "price": float(round(current_price, 2)),
                        "change": float(round(change, 2)),
                        "changePercent": float(round(change_percent, 2)),
                    }
                )
            elif len(data) >= 1:
                # Fallback: at least one data point
                current_price = data["Close"].dropna().iloc[-1]
                open_price = data["Open"].dropna().iloc[0]
                change = current_price - open_price
                change_percent = (change / open_price * 100) if open_price > 0 else 0
                
                items.append(
                    {
                        "symbol": _display_symbol(symbol),
                        "price": float(round(current_price, 2)),
                        "change": float(round(change, 2)),
                        "changePercent": float(round(change_percent, 2)),
                    }
                )
        except Exception as e:
            # Skip symbols that fail
            continue

    return items


@router.get("/ticker")
def get_ticker():
    """Get live stock quotes using free sources only - refreshes every 30s."""
    try:
        now = time.time()
        # Cache for 30 seconds (shorter for fresher prices)
        if _CACHE["items"] and now - _CACHE["timestamp"] < 30:
            return {"items": _CACHE["items"]}

        quotes = fetch_nse_quotes(DEFAULT_SYMBOLS)
        if not quotes:
            quotes = fetch_yfinance_quotes(DEFAULT_SYMBOLS)
        
        if quotes:
            _CACHE["items"] = quotes
            _CACHE["timestamp"] = now
            return {"items": quotes}
        else:
            return {"items": FALLBACK_ITEMS}
    except Exception:
        return {"items": FALLBACK_ITEMS}
