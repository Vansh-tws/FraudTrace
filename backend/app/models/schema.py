from datetime import datetime, timezone
import json
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    Enum,
)
from sqlalchemy.orm import relationship
from .database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Customer(Base):
    __tablename__ = "customers"

    user_id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(120), nullable=True)
    phone = Column(String(30), nullable=True)
    city = Column(String(80), nullable=False)
    risk_tier = Column(String(20), default="standard")  # low, standard, elevated
    typical_min_amount = Column(Float, default=500.0)
    typical_max_amount = Column(Float, default=8000.0)
    typical_channel = Column(String(30), default="mobile")
    account_created_at = Column(DateTime, default=utcnow)

    # Relationships
    transactions = relationship("Transaction", back_populates="customer", cascade="all, delete-orphan")
    investigations = relationship("Investigation", back_populates="customer")

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "city": self.city,
            "risk_tier": self.risk_tier,
            "typical_min_amount": self.typical_min_amount,
            "typical_max_amount": self.typical_max_amount,
            "typical_channel": self.typical_channel,
            "account_created_at": self.account_created_at.isoformat() if self.account_created_at else None,
        }


class Transaction(Base):
    __tablename__ = "transactions"

    transaction_id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(50), ForeignKey("customers.user_id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    transaction_type = Column(String(40), nullable=False)  # purchase, transfer, withdrawal, online_payment
    channel = Column(String(30), nullable=False)  # mobile, web, ATM, POS
    city = Column(String(80), nullable=False)
    transaction_time = Column(DateTime, nullable=False, index=True)
    hour = Column(Integer, nullable=False)
    status = Column(String(30), default="settled")  # settled, pending, flagged, blocked
    merchant = Column(String(120), nullable=True)
    is_synthetic_fraud = Column(Integer, default=0)

    # Relationships
    customer = relationship("Customer", back_populates="transactions")
    risk_assessment = relationship("RiskAssessment", back_populates="transaction", uselist=False, cascade="all, delete-orphan")
    investigations = relationship("Investigation", back_populates="transaction", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "transaction_id": self.transaction_id,
            "user_id": self.user_id,
            "amount": self.amount,
            "transaction_type": self.transaction_type,
            "channel": self.channel,
            "city": self.city,
            "transaction_time": self.transaction_time.isoformat() if self.transaction_time else None,
            "hour": self.hour,
            "status": self.status,
            "merchant": self.merchant,
            "is_synthetic_fraud": self.is_synthetic_fraud,
            "risk_score": self.risk_assessment.risk_score if self.risk_assessment else None,
            "risk_level": self.risk_assessment.risk_level if self.risk_assessment else "Low",
            "anomaly_score": self.risk_assessment.anomaly_score if self.risk_assessment else None,
            "is_anomaly": self.risk_assessment.is_anomaly if self.risk_assessment else False,
            "risk_reasons": self.risk_assessment.get_factors() if self.risk_assessment else [],
        }


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    transaction_id = Column(String(64), ForeignKey("transactions.transaction_id"), unique=True, nullable=False, index=True)
    anomaly_score = Column(Float, nullable=False)
    risk_score = Column(Float, nullable=False)  # 0 to 100
    risk_level = Column(String(20), nullable=False)  # Low, Medium, High, Critical
    is_anomaly = Column(Boolean, default=False)
    primary_factors_json = Column(Text, default="[]")
    calculated_at = Column(DateTime, default=utcnow)

    # Relationships
    transaction = relationship("Transaction", back_populates="risk_assessment")

    def get_factors(self):
        try:
            return json.loads(self.primary_factors_json) if self.primary_factors_json else []
        except Exception:
            return []

    def set_factors(self, factors):
        self.primary_factors_json = json.dumps(factors)

    def to_dict(self):
        return {
            "id": self.id,
            "transaction_id": self.transaction_id,
            "anomaly_score": self.anomaly_score,
            "risk_score": self.risk_score,
            "risk_level": self.risk_level,
            "is_anomaly": self.is_anomaly,
            "factors": self.get_factors(),
            "calculated_at": self.calculated_at.isoformat() if self.calculated_at else None,
        }


class Investigation(Base):
    __tablename__ = "investigations"

    id = Column(String(50), primary_key=True, index=True)  # CASE-2026-XXXX
    transaction_id = Column(String(64), ForeignKey("transactions.transaction_id"), nullable=False, index=True)
    user_id = Column(String(50), ForeignKey("customers.user_id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    status = Column(String(30), default="PENDING")  # PENDING, UNDER_REVIEW, APPROVED_FRAUD, REJECTED_LEGITIMATE, ESCALATED
    priority = Column(String(20), default="HIGH")  # LOW, MEDIUM, HIGH, CRITICAL
    risk_score = Column(Float, nullable=False)
    
    # AI Report Structured Fields
    ai_summary = Column(Text, nullable=True)
    observations_json = Column(Text, default="[]")
    evidence_json = Column(Text, default="[]")
    recommendation = Column(Text, nullable=True)
    next_steps_json = Column(Text, default="[]")
    
    assigned_analyst = Column(String(100), default="AI Agent (FraudTrace Engine)")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    # Relationships
    transaction = relationship("Transaction", back_populates="investigations")
    customer = relationship("Customer", back_populates="investigations")
    logs = relationship("AgentLog", back_populates="investigation", cascade="all, delete-orphan", order_by="AgentLog.step_index")
    approvals = relationship("Approval", back_populates="investigation", cascade="all, delete-orphan", order_by="Approval.reviewed_at.desc()")

    def get_observations(self):
        try:
            return json.loads(self.observations_json) if self.observations_json else []
        except Exception:
            return []

    def set_observations(self, obs):
        self.observations_json = json.dumps(obs)

    def get_evidence(self):
        try:
            return json.loads(self.evidence_json) if self.evidence_json else []
        except Exception:
            return []

    def set_evidence(self, ev):
        self.evidence_json = json.dumps(ev)

    def get_next_steps(self):
        try:
            return json.loads(self.next_steps_json) if self.next_steps_json else []
        except Exception:
            return []

    def set_next_steps(self, steps):
        self.next_steps_json = json.dumps(steps)

    def to_dict(self):
        return {
            "id": self.id,
            "transaction_id": self.transaction_id,
            "user_id": self.user_id,
            "title": self.title,
            "status": self.status,
            "priority": self.priority,
            "risk_score": self.risk_score,
            "ai_summary": self.ai_summary,
            "observations": self.get_observations(),
            "evidence": self.get_evidence(),
            "recommendation": self.recommendation,
            "next_steps": self.get_next_steps(),
            "assigned_analyst": self.assigned_analyst,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "approval_count": len(self.approvals),
            "latest_approval": self.approvals[0].to_dict() if self.approvals else None,
            "log_count": len(self.logs),
        }


class AgentLog(Base):
    __tablename__ = "agent_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    investigation_id = Column(String(50), ForeignKey("investigations.id"), nullable=False, index=True)
    transaction_id = Column(String(64), nullable=False)
    step_index = Column(Integer, nullable=False, default=1)
    action_type = Column(String(40), nullable=False)  # THOUGHT, TOOL_CALL, TOOL_RESULT, CONCLUSION
    tool_name = Column(String(60), nullable=True)
    tool_input_json = Column(Text, nullable=True)
    tool_output_json = Column(Text, nullable=True)
    reasoning = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    # Relationship
    investigation = relationship("Investigation", back_populates="logs")

    def to_dict(self):
        return {
            "id": self.id,
            "investigation_id": self.investigation_id,
            "transaction_id": self.transaction_id,
            "step_index": self.step_index,
            "action_type": self.action_type,
            "tool_name": self.tool_name,
            "tool_input": json.loads(self.tool_input_json) if self.tool_input_json else None,
            "tool_output": json.loads(self.tool_output_json) if self.tool_output_json else None,
            "reasoning": self.reasoning,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Approval(Base):
    __tablename__ = "approvals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    investigation_id = Column(String(50), ForeignKey("investigations.id"), nullable=False, index=True)
    decision = Column(String(40), nullable=False)  # APPROVED_FRAUD, REJECTED_LEGITIMATE, ESCALATED
    analyst_notes = Column(Text, nullable=True)
    analyst_name = Column(String(100), nullable=False, default="Vansh Raut (Lead Fraud Analyst)")
    action_taken = Column(String(60), default="NONE")  # CARD_FROZEN, ACCOUNT_RESTRICTED, WHITELISTED, SAR_FILED, ESCALATED_LEGAL
    reviewed_at = Column(DateTime, default=utcnow)

    # Relationship
    investigation = relationship("Investigation", back_populates="approvals")

    def to_dict(self):
        return {
            "id": self.id,
            "investigation_id": self.investigation_id,
            "decision": self.decision,
            "analyst_notes": self.analyst_notes,
            "analyst_name": self.analyst_name,
            "action_taken": self.action_taken,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
        }
