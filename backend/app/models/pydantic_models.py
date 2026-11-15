from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field


class TransactionFilter(BaseModel):
    page: int = 1
    page_size: int = 50
    risk_level: Optional[str] = None
    channel: Optional[str] = None
    transaction_type: Optional[str] = None
    search: Optional[str] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    is_anomaly_only: bool = False


class InvestigateRequest(BaseModel):
    transaction_id: str
    custom_instruction: Optional[str] = None


class ApprovalRequest(BaseModel):
    decision: str = Field(..., description="APPROVED_FRAUD, REJECTED_LEGITIMATE, or ESCALATED")
    analyst_name: str = "Senior Fraud Analyst"
    analyst_notes: Optional[str] = None
    action_taken: str = "NONE"  # CARD_FROZEN, ACCOUNT_RESTRICTED, WHITELISTED, SAR_FILED, ESCALATED_LEGAL


class SettingsUpdate(BaseModel):
    ai_provider: str = "gemini"  # gemini, anthropic, openai, local_expert
    gemini_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    model_name: Optional[str] = "gemini-2.5-flash"
    isolation_forest_contamination: float = 0.05
