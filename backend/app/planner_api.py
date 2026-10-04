from fastapi import APIRouter
from .planner import PlanRequest, PlanResponse, plan

router = APIRouter()

@router.post('/api/v1/plan', response_model=PlanResponse)
def preview_query(request: PlanRequest) -> PlanResponse:
    return plan(request)
