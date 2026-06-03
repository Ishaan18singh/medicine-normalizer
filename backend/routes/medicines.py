from fastapi import APIRouter

medicine_router = APIRouter(
    prefix="/api/medicines",
    tags=["Medicines"]
)

@medicine_router.post("/normalize")
def normalize_medicine(payload: dict):
    return {"status": "normalized", "payload": payload}

@medicine_router.post("/bulk-normalize")
def bulk_normalize_medicines(payload: list[dict]):
    return {"status": "bulk normalized", "count": len(payload), "payload": payload}

@medicine_router.post("/scan-prescription")
def scan_prescription(payload: dict):
    return {"status": "prescription scanned", "payload": payload}

@medicine_router.get("/alternatives/{medicine}")
def get_alternatives(medicine: str):
    return {"medicine": medicine, "alternatives": []}

@medicine_router.get("/analytics")
def get_analytics():
    return {"analytics": {}}
