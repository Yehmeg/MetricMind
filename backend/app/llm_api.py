"""Opt-in LLM preview endpoint; never executes the proposed query."""
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from .groq_provider import GroqProvider
from .llm_provider import ProviderError
from .llm_planner import ProposedPlan, propose
from .planner import PlanRequest

router = APIRouter()

class LLMPreview(ProposedPlan):
    planner_mode: Literal['llm'] = 'llm'
    provider: Literal['groq'] = 'groq'
    model: str
    requires_review: Literal[True] = True

def get_provider() -> GroqProvider:
    try:
        return GroqProvider.from_env()
    except ValueError:
        raise HTTPException(status_code=503, detail='LLM planning is not configured') from None

@router.post('/api/v1/plan/llm', response_model=LLMPreview)
def preview_llm(request: PlanRequest, provider: GroqProvider = Depends(get_provider)):
    try:
        result = propose(request, provider)
    except ProviderError:
        raise HTTPException(status_code=502,
                            detail='LLM planning failed. Retry later or use the offline planner.') from None
    return LLMPreview(**result.model_dump(), model=provider.model)
