from pydantic import BaseModel

class InsightResponse(BaseModel):
    message: str
