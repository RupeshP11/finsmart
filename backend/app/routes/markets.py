import json
import http.cookiejar
import time
import urllib.request
from urllib.parse import quote
from fastapi import APIRouter
import threading
from datetime import datetime

router = APIRouter(prefix="/markets", tags=["Markets"])

# NSE India equity symbols (all Indian stocks)
EQUITY_SYMBOLS = [
    "RELIANCE",
    "TCS",
    "INFY",
    "HDFCBANK",
    "ICICIBANK",
    "HINDUNILVR",
    "BHARTIARTL",
    "ITC",
    "VEDL",
    "BPCL",
    "HPCL",
    "IOC",
    "MARUTI",
    "SUNPHARMA",
    "WIPRO",
    "ASIANPAINT",
]

# NSE India index keys
INDEX_KEYS = ["NIFTY 50", "NIFTY BANK"]

# Cache with 60s duration for fresh live prices
_CACHE = {
    "timestamp": 0,
    "items": [],
}
_CACHE_LOCK = threading.Lock()

# Initial fallback data with reasonable market values (NSE indices + stocks)
FALLBACK_ITEMS = [
    {"symbol": "NIFTY 50", "price": 22500.0, "change": 0.0, "changePercent": 0.0},
    {"symbol": "NIFTY BANK", "price": 48500.0, "change": 0.0, "changePercent": 0.0},
    {"symbol": "RELIANCE", "price": 2500.0, "change": 0.0, "changePercent": 0.0},
    {"symbol": "TCS", "price": 3850.0, "change": 0.0, "changePercent": 0.0},
    {"symbol": "INFY", "price": 1650.0, "change": 0.0, "changePercent": 0.0},
    {"symbol": "HDFCBANK", "price": 1620.0, "change": 0.0, "changePercent": 0.0},
    {"symbol": "ICICIBANK", "price": 1090.0, "change": 0.0, "changePercent": 0.0},
    {"symbol": "HINDUNILVR", "price": 2350.0, "change": 0.0, "changePercent": 0.0},
    {"symbol": "BHARTIARTL", "price": 1250.0, "change": 0.0, "changePercent": 0.0},
    {"symbol": "ITC", "price": 415.0, "change": 0.0, "changePercent": 0.0},
]


def fetch_nse_indices():
    """Fetch indices (NIFTY 50, NIFTY BANK, etc.) from NSE India."""
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
        # Initialize session
        opener.open(urllib.request.Request("https://www.nseindia.com", headers=headers), timeout=5).read()
        
        # Fetch all indices
        url = "https://www.nseindia.com/api/allIndices"
        request = urllib.request.Request(url, headers=headers)
        with opener.open(request, timeout=5) as response:
            data = json.loads(response.read().decode("utf-8"))
        
        # Extract indices we care about
        for idx_data in data.get("data", []):
            index_name = idx_data.get("index")
            if index_name in INDEX_KEYS:
                last_price = idx_data.get("last")
                change = idx_data.get("variation", 0)
                change_percent = idx_data.get("percentChange", 0)
                
                if last_price:
                    items.append({
                        "symbol": index_name,
                        "price": float(last_price),
                        "change": float(change),
                        "changePercent": float(change_percent),
                    })
    except Exception as e:
        print(f"[TICKER] Error fetching NSE indices: {str(e)}")
    
    return items


def fetch_nse_equity_quotes(symbols):
    """Fetch equity stock quotes from NSE India (free, no API key needed)."""
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
        # Initialize session
        opener.open(urllib.request.Request("https://www.nseindia.com", headers=headers), timeout=5).read()
    except Exception:
        return items

    for symbol in symbols:
        url = f"https://www.nseindia.com/api/quote-equity?symbol={quote(symbol)}"
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
                    "symbol": symbol,
                    "price": float(last_price),
                    "change": float(price_info.get("change", 0)),
                    "changePercent": float(price_info.get("pChange", 0)),
                }
            )
        except Exception as e:
            print(f"[TICKER] Error fetching {symbol}: {str(e)}")
            continue

    return items





@router.get("/ticker")
def get_ticker():
    """Get live stock quotes from NSE India - 100% free, reliable, Indian stocks only."""
    global FALLBACK_ITEMS
    
    try:
        # Check cache first
        with _CACHE_LOCK:
            now = time.time()
            cache_age = now - _CACHE["timestamp"]
            
            # Cache valid for 60 seconds for fresh live prices
            if _CACHE["items"] and cache_age < 60:
                print(f"[TICKER] Cache hit - {len(_CACHE['items'])} items (age: {cache_age:.1f}s)")
                return {"items": _CACHE["items"]}
        
        print(f"[TICKER] Fetching from NSE India official API (free, reliable)...")
        
        # Fetch indices (NIFTY 50, NIFTY BANK)
        indices = fetch_nse_indices()
        print(f"[TICKER] Fetched {len(indices)} indices")
        
        # Fetch equity stocks
        equities = fetch_nse_equity_quotes(EQUITY_SYMBOLS)
        print(f"[TICKER] Fetched {len(equities)} equity stocks")
        
        # Combine results
        all_quotes = indices + equities
        
        # If we got reasonable data, cache and return it
        if all_quotes and len(all_quotes) >= 8:
            print(f"[TICKER] Success! Total {len(all_quotes)} quotes from NSE India")
            with _CACHE_LOCK:
                _CACHE["items"] = all_quotes
                _CACHE["timestamp"] = time.time()
                FALLBACK_ITEMS = all_quotes.copy()  # Update fallback
            return {"items": all_quotes}
        
        # If we got some data, use it
        if all_quotes and len(all_quotes) >= 3:
            print(f"[TICKER] Partial success - {len(all_quotes)} quotes")
            with _CACHE_LOCK:
                _CACHE["items"] = all_quotes
                _CACHE["timestamp"] = time.time()
            return {"items": all_quotes}
        
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
