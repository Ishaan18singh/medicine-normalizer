from pydantic import BaseModel
from typing import List, Dict, Any


class MedicineNormalizeRequest(BaseModel):
    medicine: str


class MedicineNormalizeResponse(BaseModel):
    input: str
    normalized: str
    type: str
    confidence: float
    alternatives: List[str]


class BulkNormalizeRequest(BaseModel):
    medicines: List[str]


class AnalyticsResponse(BaseModel):
    total_searches: int
    top_medicines: List[Dict[str, Any]]
    avg_confidence: float
    error_rate: float