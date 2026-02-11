from pydantic import BaseModel, Field


class SIPRequest(BaseModel):
    monthly_investment: float = Field(..., gt=0)
    annual_rate: float = Field(..., gt=0, description="Annual return rate in %")
    years: int = Field(..., gt=0)

    # Optional → 0 means normal SIP
    step_up_percent: float = Field(
        default=0.0,
        ge=0,
        description="Yearly increment % (0 = normal SIP)"
    )


class SIPResponse(BaseModel):
    total_invested: float
    maturity_value: float
    gain: float
