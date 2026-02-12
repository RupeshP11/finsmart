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

# Simple in-memory cache to avoid rate limits (15s refresh for fresher live prices on production)
_CACHE = {
    "timestamp": 0,
    "items": [],
    "last_fetch_time": 0,
}
_CACHE_LOCK = threading.Lock()

# Fallback data - will be populated on first successful fetch
FALLBACK_ITEMS = []


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
    """Fetch quotes from yfinance (free, no API key needed) - LIVE prices with timeout."""
    items = []
    
    def fetch_single_symbol(symbol):
        """Fetch data for a single symbol with timeout."""
        try:
            stock = yf.Ticker(symbol)
            
            # Set timeout for all network operations
            import socket
            original_timeout = socket.getdefaulttimeout()
            socket.setdefaulttimeout(5)
            
            try:
                # Try to get today's live data with 1-minute interval (for trading hours)
                try:
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
                        
                        return {
                            "symbol": _display_symbol(symbol),
                            "price": float(round(current_price, 2)),
                            "change": float(round(change, 2)),
                            "changePercent": float(round(change_percent, 2)),
                        }
                except Exception:
                    pass

                # Fallback: Try 5-day data with 1-hour interval (works even when market closed)
                try:
                    data = stock.history(period="5d", interval="1h")
                    if len(data) >= 2:
                        current_price = data["Close"].dropna().iloc[-1]
                        prev_close = data["Close"].dropna().iloc[-2]
                        
                        change = current_price - prev_close
                        change_percent = (change / prev_close * 100) if prev_close > 0 else 0
                        
                        return {
                            "symbol": _display_symbol(symbol),
                            "price": float(round(current_price, 2)),
                            "change": float(round(change, 2)),
                            "changePercent": float(round(change_percent, 2)),
                        }
                except Exception:
                    pass

                # Last resort: Try info dict with basic data
                try:
                    info = stock.info
                    current = info.get("regularMarketPrice") or info.get("currentPrice")
                    prev = info.get("regularMarketPreviousClose") or info.get("previousClose")
                    
                    if current and prev:
                        change = current - prev
                        change_percent = (change / prev * 100) if prev > 0 else 0
                        
                        return {
                            "symbol": _display_symbol(symbol),
                            "price": float(round(current, 2)),
                            "change": float(round(change, 2)),
                            "changePercent": float(round(change_percent, 2)),
                        }
                except Exception:
                    pass
                    
            finally:
                socket.setdefaulttimeout(original_timeout)
                
        except Exception:
            pass
        
        return None
    
    # Fetch all symbols (parallelize for faster execution)
    for symbol in symbols:
        result = fetch_single_symbol(symbol)
        if result:
            items.append(result)
            # Add small delay to avoid rate limiting
            time.sleep(0.1)
    
    return items


@router.get("/ticker")
def get_ticker():
    """Get live stock quotes using free sources only - refreshes every 15s for fresher data on production."""
    try:
        with _CACHE_LOCK:
            now = time.time()
            # Shorter cache duration (15s vs 20s) for fresher prices on production
            # Always skip cache on first request or every refresh
            cache_is_valid = _CACHE["items"] and (now - _CACHE["timestamp"] < 15)
            
            if cache_is_valid:
                # Log cache hit for debugging
                print(f"[TICKER] Cache hit - {len(_CACHE['items'])} items, age: {now - _CACHE['timestamp']:.1f}s")
                return {"items": _CACHE["items"]}

        # Force fresh fetch from sources
        print(f"[TICKER] Cache miss or expired - fetching fresh data...")
        
        # Try fetching from yfinance first (most reliable for live prices)
        quotes = fetch_yfinance_quotes(DEFAULT_SYMBOLS)
        
        # If yfinance fails, try NSE india API
        if not quotes or len(quotes) < 5:
            print(f"[TICKER] yfinance returned {len(quotes) if quotes else 0} items, trying NSE API...")
            quotes = fetch_nse_quotes(DEFAULT_SYMBOLS)
        
        if quotes and len(quotes) > 0:
            print(f"[TICKER] Successfully fetched {len(quotes)} live quotes")
            with _CACHE_LOCK:
                _CACHE["items"] = quotes
                _CACHE["timestamp"] = time.time()
                # Update fallback data with fresh quotes
                global FALLBACK_ITEMS
                FALLBACK_ITEMS = quotes.copy()
            return {"items": quotes}
        else:
            # Use previously cached data if available
            if _CACHE["items"]:
                print(f"[TICKER] All sources failed - returning cached data")
                return {"items": _CACHE["items"]}
            
            # Last resort: return fallback (which now contains last successful fetch)
            print(f"[TICKER] No cached data available - returning fallback data")
            if FALLBACK_ITEMS:
                return {"items": FALLBACK_ITEMS}
            else:
                # If nothing works, return empty array
                return {"items": []}
                
    except Exception as e:
        print(f"[TICKER] Exception: {str(e)}")
        # Always return cached or fallback data on error
        if _CACHE["items"]:
            print(f"[TICKER] Returning cached data after exception")
            return {"items": _CACHE["items"]}
        if FALLBACK_ITEMS:
            print(f"[TICKER] Returning fallback data after exception")
            return {"items": FALLBACK_ITEMS}
        return {"items": []}
