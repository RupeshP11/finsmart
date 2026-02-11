from fastapi import APIRouter
from app.schemas.sip import SIPRequest, SIPResponse

router = APIRouter(prefix="/sip", tags=["SIP Calculator"])


@router.post("/calculate", response_model=SIPResponse)
def calculate_sip(data: SIPRequest):
    monthly = data.monthly_investment
    annual_rate = data.annual_rate
    years = data.years
    step_up = data.step_up_percent / 100  # convert % to decimal

    monthly_rate = annual_rate / 12 / 100

    total_invested = 0.0
    maturity_value = 0.0
    current_monthly = monthly

    for year in range(years):
        for _ in range(12):
            maturity_value = (maturity_value + current_monthly) * (1 + monthly_rate)
            total_invested += current_monthly

        # Apply step-up once per year
        current_monthly += current_monthly * step_up

    gain = maturity_value - total_invested

    return {
        "total_invested": round(total_invested, 2),
        "maturity_value": round(maturity_value, 2),
        "gain": round(gain, 2),
    }
