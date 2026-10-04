"""Proposed contract v0.1; agree with the semantic-layer owner before integration."""
from datetime import date
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

Metric = Literal['revenue', 'reported_profit', 'reported_profit_margin', 'shipping_cost']
Dimension = Literal['market', 'category']

class Query(BaseModel):
    model_config = ConfigDict(extra='forbid')
    metrics: list[Metric] = Field(min_length=1, max_length=4)
    dimensions: list[Dimension] = Field(default_factory=list, max_length=2)
    start_date: date
    end_date: date
    market: Literal['EU', 'US', 'LATAM', 'Africa', 'APAC', 'EMEA', 'Canada'] | None = None
    limit: int = Field(default=100, ge=1, le=1000, strict=True)

    @model_validator(mode='after')
    def validate_window(self):
        if self.start_date > self.end_date:
            raise ValueError('start_date must be on or before end_date')
        if (self.end_date - self.start_date).days > 366:
            raise ValueError('Query windows may span at most 366 days')
        if len(set(self.metrics)) != len(self.metrics):
            raise ValueError('Duplicate metrics are not allowed')
        if len(set(self.dimensions)) != len(self.dimensions):
            raise ValueError('Duplicate dimensions are not allowed')
        return self

class Result(BaseModel):
    model_config = ConfigDict(extra='forbid')
    request_id: str
    status: Literal['ok', 'no_data']
    source: Literal['mock_fixture'] = 'mock_fixture'
    dataset_version: str = 'synthetic-fixture-v1'
    contract_version: str = '0.1'
    query: Query
    rows: list[dict[str, str | None]]
    total_groups: int
    truncated: bool
    metric_definitions: dict[str, str]
    warnings: list[str]
