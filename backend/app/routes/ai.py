from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_user
from app.models.user import User
import requests

router = APIRouter(prefix="/ai", tags=["AI"])

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "mistral"


FINANCE_KEYWORDS = [
    "finance", "financial", "investment", "invest",
    "mutual fund", "sip", "stock", "share", "equity",
    "budget", "expense", "income", "savings",
    "inflation", "interest", "return", "risk",
    "tax", "capital", "portfolio", "diversification",
    "net worth", "cash flow", "debt", "bond"
]

TECH_KEYWORDS = [
    "protocol", "network", "server", "voip",
    "computer", "http", "tcp", "udp", "api"
]


def is_tech_query(query: str) -> bool:
    return any(word in query for word in TECH_KEYWORDS)


def has_finance_intent(query: str) -> bool:
    return any(word in query for word in FINANCE_KEYWORDS)


@router.post("/search")
def ai_search(payload: dict, current_user: User = Depends(get_current_user)):
    query = payload.get("query", "").strip().lower()

    if not query:
        return {
            "type": "fallback",
            "message": "Please ask a finance-related question."
        }

    # 1. STRICT NAVIGATION
    navigation_map = {
        "open budget": "/budget",
        "go to budget": "/budget",
        "open transactions": "/transactions",
        "open dashboard": "/dashboard",
        "open sip": "/sip",
        "open analytics": "/analytics",
        "open insights": "/insights",
    }

    for key, route in navigation_map.items():
        if key in query:
            return {"type": "navigate", "target": route}

    # 2. BLOCK TECH CONTEXT EARLY
    if is_tech_query(query):
        return {
            "type": "fallback",
            "message": "I'm sorry, I'm built to explain finance and investment concepts only."
        }

    # 3. STATIC FINANCE DEFINITIONS (FAST RESPONSE)
    static_definitions = {

    # Core Finance
    "income": "Income is money earned from work, business, or investments.",
    "expense": "An expense is money spent on goods or services.",
    "savings": "Savings are the portion of income kept for future use.",
    "capital": "Capital refers to money or assets used to generate income.",
    "investment": "An investment is money put into assets to earn returns.",
    "net worth": "Net worth is total assets minus total liabilities.",
    "cash flow": "Cash flow is the movement of money in and out.",
    "financial planning": "Financial planning is managing income, expenses, savings, and investments.",

    # Budgeting & Spending
    "budget": "A budget is a plan to track income and expenses and control spending.",
    "monthly budget": "A monthly budget plans income and expenses for a month.",
    "budget limit": "A budget limit is the maximum amount allowed to spend.",
    "budget tracking": "Budget tracking monitors spending against planned limits.",
    "overspending": "Overspending happens when expenses exceed planned limits or income.",
    "overspending alert": "An overspending alert warns when expenses exceed the planned budget.",
    "expense category": "An expense category groups similar types of spending.",
    "fixed expense": "A fixed expense is a cost that stays the same every month.",
    "variable expense": "A variable expense changes from month to month.",
    "monthly expense": "Monthly expense is the total money spent in a month.",

    # Personal Finance
    "emergency fund": "An emergency fund is savings kept for unexpected expenses.",
    "disposable income": "Disposable income is money left after essential expenses.",
    "financial goal": "A financial goal is a target amount you want to achieve.",
    "financial discipline": "Financial discipline means managing money consistently and wisely.",

    # Investments & Wealth
    "wealth creation": "Wealth creation is growing assets over time.",
    "long term investment": "Long term investment involves holding assets for many years.",
    "short term investment": "Short term investment is made for a shorter duration.",
    "principal amount": "Principal amount is the original sum invested or borrowed.",
    "investment horizon": "Investment horizon is the time period you plan to stay invested.",
    "diversification": "Diversification reduces risk by spreading investments across assets.",
    "risk": "Risk is the possibility of losing money.",
    "return": "Return is the profit or loss from an investment.",
    "compounding": "Compounding means earning returns on both the original amount and past returns.",

    # Stocks & Markets
    "stock": "A stock represents ownership in a company.",
    "share": "A share is a unit of ownership in a company.",
    "equity": "Equity represents ownership value in a company.",
    "market volatility": "Market volatility refers to frequent price changes.",
    "bull market": "A bull market is when prices rise consistently.",
    "bear market": "A bear market is when prices fall consistently.",
    "market risk": "Market risk is loss due to market movements.",
    "market capitalization": "Market capitalization is the total value of a company’s shares.",
    "pe ratio": "The P/E ratio compares a stock’s price to its earnings.",
    "eps": "EPS shows profit earned per share.",
    "dividend": "A dividend is profit distributed to shareholders.",

    # Mutual Funds & SIP
    "sip": "A SIP allows regular fixed investments in mutual funds.",
    "step up sip": "A step-up SIP increases investment amount periodically.",
    "lump sum investment": "Lump sum investment means investing a large amount at once.",
    "sip date": "SIP date is the fixed date for investment.",
    "sip tenure": "SIP tenure is the duration of the SIP.",
    "sip pause": "SIP pause temporarily stops contributions.",
    "mutual fund": "A mutual fund pools money to invest in assets.",
    "fund manager": "A fund manager manages mutual fund investments.",
    "nav": "NAV is the per-unit value of a mutual fund.",
    "expense ratio": "Expense ratio is the annual fee charged by a fund.",
    "equity fund": "An equity fund invests mainly in stocks.",
    "debt fund": "A debt fund invests in fixed-income instruments.",

    # Debt & Safety
    "debt": "Debt is money borrowed that must be repaid.",
    "bond": "A bond is a fixed-income investment where investors lend money.",
    "liquidity": "Liquidity means how easily an asset can be converted to cash.",

    # Inflation & Economy
    "inflation": "Inflation is the increase in prices over time.",
    "deflation": "Deflation is a decrease in general price levels.",
    "interest rate": "Interest rate is the cost of borrowing or return on savings.",
    "gdp": "GDP measures the total value of goods and services in a country.",

    # Taxes
    "tax": "Tax is money paid to the government.",
    "tax planning": "Tax planning reduces tax legally.",
    "tax deduction": "Tax deduction reduces taxable income.",
    "tax exemption": "Tax exemption excludes income from tax.",
    "capital gains": "Capital gains are profits from selling assets.",
    "short term capital gain": "STCG is profit from short-term asset sale.",
    "long term capital gain": "LTCG is profit from long-term asset sale.",
}


    for term, explanation in static_definitions.items():
        if term in query:
            return {"type": "definition", "answer": explanation}

    # 4. FINANCE INTENT CHECK
    if not has_finance_intent(query):
        return {
            "type": "fallback",
            "message": "I'd love to help, but I'm actually a specialist in finance and FinSmart features! Feel free to ask me anything about those topics."
        }

    # 5. LOCAL LLM (GUARDED)
    prompt = f"""
You are a finance explanation assistant.

Rules:
- Explain finance concepts only
- No advice
- No predictions
- No calculations
- No recommendations
- Simple, neutral, educational tone
- If the question is not finance-related, say you can explain finance concepts only

Question: {query}
"""

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False
            },
            timeout=20
        )

        result = response.json()
        answer = result.get("response", "").strip()

        if not answer:
            raise Exception("Empty response")

        return {"type": "definition", "answer": answer}

    except Exception:
        return {
            "type": "fallback",
            "message": "AI service is temporarily unavailable."
        }