import json
import http.cookiejar
import time
import urllib.request
from urllib.parse import quote
import yfinance as yf
from fastapi import APIRouter
import threading
from datetime import datetime

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

EQUITY_SYMBOLS = [s for s in DEFAULT_SYMBOLS if not s.startswith("^")]
INDEX_SYMBOLS = [s for s in DEFAULT_SYMBOLS if s.startswith("^")]

SYMBOL_LABELS = {
    "^NSEI": "NIFTY 50",
    "^BSESN": "SENSEX",
}

# Simple in-memory cache to avoid rate limits (10s refresh for fresher live prices on production)
_CACHE = {
    "timestamp": 0,
    "items": [],
}
_CACHE_LOCK = threading.Lock()

# Initial fallback data with reasonable market values
FALLBACK_ITEMS = [
    {"symbol": "NIFTY 50", "price": 22500.0, "change": 0.0, "changePercent": 0.0},
    {"symbol": "SENSEX", "price": 74000.0, "change": 0.0, "changePercent": 0.0},
    {"symbol": "RELIANCE", "price": 2500.0, "change": 0.0, "changePercent": 0.0},
    {"symbol": "TCS", "price": 3850.0, "change": 0.0, "changePercent": 0.0},
    {"symbol": "INFY", "price": 1650.0, "change": 0.0, "changePercent": 0.0},
    {"symbol": "HDFCBANK", "price": 1620.0, "change": 0.0, "changePercent": 0.0},
    {"symbol": "ICICIBANK", "price": 1090.0, "change": 0.0, "changePercent": 0.0},
    {"symbol": "HINDUNILVR", "price": 2350.0, "change": 0.0, "changePercent": 0.0},
    {"symbol": "BHARTIARTL", "price": 1250.0, "change": 0.0, "changePercent": 0.0},
    {"symbol": "ITC", "price": 415.0, "change": 0.0, "changePercent": 0.0},
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
    """Fetch quotes from yfinance (free, no API key needed) - Simplified LIVE prices."""
    items = []
    
    for symbol in symbols:
        try:
            ticker = yf.Ticker(symbol)
            
            # Get the most recent data using fast_info (more reliable than history)
            try:
                # Try fast_info first (faster and more reliable)
                fast_info = ticker.fast_info
                current_price = fast_info.get('lastPrice') or fast_info.get('regularMarketPrice')
                prev_close = fast_info.get('previousClose') or fast_info.get('regularMarketPreviousClose')
                
                if current_price and prev_close and current_price > 0 and prev_close > 0:
                    change = current_price - prev_close
                    change_percent = (change / prev_close * 100)
                    
                    items.append({
                        "symbol": _display_symbol(symbol),
                        "price": float(round(current_price, 2)),
                        "change": float(round(change, 2)),
                        "changePercent": float(round(change_percent, 2)),
                    })
                    continue
            except:
                pass
            
            # Fallback to info dict if fast_info fails
            try:
                info = ticker.info
                current = info.get("regularMarketPrice") or info.get("currentPrice") or info.get("lastPrice")
                prev = info.get("regularMarketPreviousClose") or info.get("previousClose")
                
                if current and prev and current > 0 and prev > 0:
                    change = current - prev
                    change_percent = (change / prev * 100)
                    
                    items.append({
                        "symbol": _display_symbol(symbol),
                        "price": float(round(current, 2)),
                        "change": float(round(change, 2)),
                        "changePercent": float(round(change_percent, 2)),
                    })
                    continue
            except:
                pass
            
            # Last resort: get 1 day history
            try:
                hist = ticker.history(period="1d")
                if not hist.empty and len(hist) > 0:
                    current_price = hist['Close'].iloc[-1]
                    open_price = hist['Open'].iloc[0]
                    
                    if current_price > 0 and open_price > 0:
                        change = current_price - open_price
                        change_percent = (change / open_price * 100)
                        
                        items.append({
                            "symbol": _display_symbol(symbol),
                            "price": float(round(current_price, 2)),
                            "change": float(round(change, 2)),
                            "changePercent": float(round(change_percent, 2)),
                        })
            except:
                pass
                
        except Exception as e:
            print(f"[TICKER] Error fetching {symbol}: {str(e)}")
            continue
    
    return items


@router.get("/ticker")
def get_ticker():
    """Get live stock quotes - refreshes every 10s for fresh data on production."""
    global FALLBACK_ITEMS
    
    try:
        # Check cache first
        with _CACHE_LOCK:
            now = time.time()
            cache_age = now - _CACHE["timestamp"]
            
            # Cache valid for 10 seconds
            if _CACHE["items"] and cache_age < 10:
                print(f"[TICKER] Cache hit - {len(_CACHE['items'])} items (age: {cache_age:.1f}s)")
                return {"items": _CACHE["items"]}
        
        # Fetch fresh data
        print(f"[TICKER] Fetching fresh data from yfinance...")
        quotes = fetch_yfinance_quotes(DEFAULT_SYMBOLS)
        
        # If we got good data, cache and return it
        if quotes and len(quotes) >= 8:  # At least 8 stocks
            print(f"[TICKER] Success! Fetched {len(quotes)} live quotes")
            with _CACHE_LOCK:
                _CACHE["items"] = quotes
                _CACHE["timestamp"] = time.time()
                FALLBACK_ITEMS = quotes.copy()  # Update fallback
            return {"items": quotes}
        
        # Try NSE API as backup
        print(f"[TICKER] yfinance returned only {len(quotes)} items, trying NSE...")
        nse_quotes = fetch_nse_quotes(DEFAULT_SYMBOLS)
        
        if nse_quotes and len(nse_quotes) >= 5:
            print(f"[TICKER] NSE Success! Fetched {len(nse_quotes)} quotes")
            # Combine yfinance and NSE results
            combined = quotes + nse_quotes
            # Remove duplicates by symbol
            seen = set()
            unique_quotes = []
            for q in combined:
                if q["symbol"] not in seen:
                    seen.add(q["symbol"])
                    unique_quotes.append(q)
            
            with _CACHE_LOCK:
                _CACHE["items"] = unique_quotes
                _CACHE["timestamp"] = time.time()
                FALLBACK_ITEMS = unique_quotes.copy()
            return {"items": unique_quotes}
        
        # Return cached data if available
        if _CACHE["items"]:
            print(f"[TICKER] Using cached data ({len(_CACHE['items'])} items)")
            return {"items": _CACHE["items"]}
        
        # Last resort: return fallback
        print(f"[TICKER] Using fallback data ({len(FALLBACK_ITEMS)} items)")
        return {"items": FALLBACK_ITEMS}
        
    except Exception as e:
        print(f"[TICKER] Error: {str(e)}")
        # Return best available data
        if _CACHE["items"]:
            return {"items": _CACHE["items"]}
        return {"items": FALLBACK_ITEMS}
