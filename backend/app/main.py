"""
FraudTrace Backend FastAPI Application.
Intelligent financial transaction monitoring, anomaly detection,
MCP tool execution, and AI-assisted fraud investigation.
"""

import os
from pathlib import Path
from typing import Optional, List
from datetime import datetime, timezone

from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_
import pandas as pd

from backend.app.models.database import engine, get_db, Base
from backend.app.models.schema import (
    Customer,
    Transaction,
    RiskAssessment,
    Investigation,
    AgentLog,
    Approval
)
from backend.app.models.pydantic_models import (
    InvestigateRequest,
    ApprovalRequest,
    SettingsUpdate
)
from backend.app.services.data_generator import seed_database
from backend.app.services.fraud_detector import FraudDetectionEngine
from backend.app.mcp.tools import FRAUDTRACE_TOOLS
from backend.app.agent.investigation_agent import FraudTraceAgent

# Ensure tables are created
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FraudTrace API",
    description="Intelligent Financial Transaction Monitoring & AI Investigation Platform",
    version="1.0.0"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory settings store (can be persisted to env or db)
APP_SETTINGS = {
    "ai_provider": "gemini",
    "gemini_api_key": os.getenv("GEMINI_API_KEY", ""),
    "openai_api_key": os.getenv("OPENAI_API_KEY", ""),
    "anthropic_api_key": os.getenv("ANTHROPIC_API_KEY", ""),
    "model_name": "gemini-2.5-flash",
    "contamination_rate": 0.05
}


@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    tx_count = db.query(Transaction).count()
    cust_count = db.query(Customer).count()
    inv_count = db.query(Investigation).count()
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {
            "transactions": tx_count,
            "customers": cust_count,
            "investigations": inv_count
        },
        "engine": "FraudDetectionEngine (IsolationForest)",
        "mcp_tools_available": len(FRAUDTRACE_TOOLS)
    }


@app.post("/api/seed")
def seed_data():
    """Seed synthetic customer profiles, baseline transactions, and anomaly models."""
    try:
        res = seed_database(num_customers=120, num_transactions=2000)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/upload-csv")
async def upload_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload custom CSV dataset of transactions to analyze."""
    try:
        df = pd.read_csv(file.file)
        required = ["amount", "transaction_type", "channel", "city", "transaction_time"]
        missing = [c for c in required if c not in df.columns]
        if missing:
            raise HTTPException(status_code=400, detail=f"Missing required columns in CSV: {missing}")

        if "transaction_id" not in df.columns:
            import uuid
            df["transaction_id"] = [f"TXN-{uuid.uuid4().hex[:10].upper()}" for _ in range(len(df))]

        if "user_id" not in df.columns:
            df["user_id"] = "USR-UPLOADED"

        if "hour" not in df.columns:
            df["hour"] = pd.to_datetime(df["transaction_time"], errors="coerce").dt.hour.fillna(12).astype(int)

        # Run detection
        detector = FraudDetectionEngine(contamination=APP_SETTINGS["contamination_rate"])
        df_scored = detector.detect(df)

        # Ensure default customer exists for foreign key
        for uid in df["user_id"].unique():
            existing_cust = db.query(Customer).filter(Customer.user_id == uid).first()
            if not existing_cust:
                c = Customer(
                    user_id=uid,
                    name=f"Customer {uid}",
                    city="Mumbai",
                    risk_tier="standard"
                )
                db.add(c)
        db.commit()

        # Ingest
        imported_count = 0
        for _, row in df_scored.iterrows():
            txn = Transaction(
                transaction_id=str(row["transaction_id"]),
                user_id=str(row["user_id"]),
                amount=float(row["amount"]),
                transaction_type=str(row["transaction_type"]),
                channel=str(row["channel"]),
                city=str(row["city"]),
                transaction_time=pd.to_datetime(row["transaction_time"]).to_pydatetime(),
                hour=int(row["hour"]),
                status="flagged" if row["risk_level"] in ["High", "Critical"] else "settled",
                merchant="Imported Payee",
                is_synthetic_fraud=int(row.get("is_fraud", 0))
            )
            db.merge(txn)

            assessment = RiskAssessment(
                transaction_id=str(row["transaction_id"]),
                anomaly_score=float(row["anomaly_score"]),
                risk_score=float(row["risk_score"]),
                risk_level=str(row["risk_level"]),
                is_anomaly=bool(row["is_anomaly"])
            )
            assessment.set_factors(row.get("risk_reasons", []))
            db.merge(assessment)
            imported_count += 1

        db.commit()
        return {
            "status": "success",
            "imported_transactions": imported_count,
            "anomalies_detected": int(df_scored["is_anomaly"].sum())
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/overview")
def get_overview(db: Session = Depends(get_db)):
    """Executive KPI metrics, risk distributions, hourly volume, and recent high-risk feed."""
    total_txns = db.query(Transaction).count()
    if total_txns == 0:
        # Auto-seed if empty
        seed_database(num_customers=80, num_transactions=1000)
        total_txns = db.query(Transaction).count()

    anomalies_count = db.query(RiskAssessment).filter(RiskAssessment.is_anomaly == True).count()
    critical_count = db.query(RiskAssessment).filter(RiskAssessment.risk_level == "Critical").count()
    high_count = db.query(RiskAssessment).filter(RiskAssessment.risk_level == "High").count()
    medium_count = db.query(RiskAssessment).filter(RiskAssessment.risk_level == "Medium").count()
    low_count = db.query(RiskAssessment).filter(RiskAssessment.risk_level == "Low").count()

    total_volume = db.query(func.sum(Transaction.amount)).scalar() or 0.0
    flagged_volume = (
        db.query(func.sum(Transaction.amount))
        .join(RiskAssessment)
        .filter(RiskAssessment.risk_level.in_(["High", "Critical"]))
        .scalar() or 0.0
    )

    open_investigations = db.query(Investigation).filter(Investigation.status.in_(["PENDING", "UNDER_REVIEW"])).count()
    resolved_investigations = db.query(Investigation).filter(Investigation.status.in_(["APPROVED_FRAUD", "REJECTED_LEGITIMATE", "ESCALATED"])).count()

    # 24-hour volume trend
    hourly_query = (
        db.query(
            Transaction.hour,
            func.count(Transaction.transaction_id).label("total_count"),
            func.sum(Transaction.amount).label("total_amount")
        )
        .group_by(Transaction.hour)
        .order_by(Transaction.hour)
        .all()
    )

    # Calculate hourly anomaly counts
    hourly_anomalies_query = (
        db.query(
            Transaction.hour,
            func.count(Transaction.transaction_id).label("anomaly_count")
        )
        .join(RiskAssessment)
        .filter(RiskAssessment.is_anomaly == True)
        .group_by(Transaction.hour)
        .all()
    )
    hourly_anom_map = {h: cnt for h, cnt in hourly_anomalies_query}

    hourly_trends = []
    for h, total_c, total_a in hourly_query:
        hourly_trends.append({
            "hour": f"{h:02d}:00",
            "hour_num": h,
            "total_count": total_c,
            "anomaly_count": hourly_anom_map.get(h, 0),
            "volume": round(float(total_a or 0.0), 2)
        })

    # High-risk feed
    high_risk_txns = (
        db.query(Transaction)
        .join(RiskAssessment)
        .filter(RiskAssessment.risk_level.in_(["Critical", "High"]))
        .order_by(RiskAssessment.risk_score.desc())
        .limit(10)
        .all()
    )

    return {
        "kpis": {
            "total_transactions": total_txns,
            "anomalies_detected": anomalies_count,
            "anomaly_rate": round((anomalies_count / total_txns) * 100, 2) if total_txns else 0.0,
            "total_volume": round(float(total_volume), 2),
            "flagged_volume": round(float(flagged_volume), 2),
            "open_investigations": open_investigations,
            "resolved_investigations": resolved_investigations,
        },
        "risk_distribution": [
            {"level": "Critical", "count": critical_count, "color": "#ef4444"},
            {"level": "High", "count": high_count, "color": "#f97316"},
            {"level": "Medium", "count": medium_count, "color": "#eab308"},
            {"level": "Low", "count": low_count, "color": "#10b981"},
        ],
        "hourly_trends": hourly_trends,
        "high_risk_feed": [t.to_dict() for t in high_risk_txns]
    }


@app.get("/api/transactions")
def list_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=5, le=100),
    risk_level: Optional[str] = None,
    channel: Optional[str] = None,
    transaction_type: Optional[str] = None,
    search: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    is_anomaly_only: bool = False,
    db: Session = Depends(get_db)
):
    """Searchable, filterable, paginated transactions."""
    query = db.query(Transaction).outerjoin(RiskAssessment)

    if risk_level:
        query = query.filter(RiskAssessment.risk_level == risk_level)
    if channel:
        query = query.filter(Transaction.channel == channel)
    if transaction_type:
        query = query.filter(Transaction.transaction_type == transaction_type)
    if is_anomaly_only:
        query = query.filter(RiskAssessment.is_anomaly == True)
    if min_amount is not None:
        query = query.filter(Transaction.amount >= min_amount)
    if max_amount is not None:
        query = query.filter(Transaction.amount <= max_amount)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Transaction.transaction_id.ilike(search_pattern),
                Transaction.user_id.ilike(search_pattern),
                Transaction.city.ilike(search_pattern),
                Transaction.merchant.ilike(search_pattern)
            )
        )

    total_count = query.count()
    txns = (
        query.order_by(desc(RiskAssessment.risk_score), desc(Transaction.transaction_time))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "page": page,
        "page_size": page_size,
        "total": total_count,
        "total_pages": (total_count + page_size - 1) // page_size,
        "items": [t.to_dict() for t in txns]
    }


@app.get("/api/transactions/{transaction_id}")
def get_transaction_detail(transaction_id: str, db: Session = Depends(get_db)):
    """Detailed transaction data with customer baseline context."""
    txn = db.query(Transaction).filter(Transaction.transaction_id == transaction_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    cust = txn.customer
    ra = txn.risk_assessment

    # Check if existing investigation exists
    inv = db.query(Investigation).filter(Investigation.transaction_id == transaction_id).first()

    return {
        "transaction": txn.to_dict(),
        "customer": cust.to_dict() if cust else None,
        "risk_assessment": ra.to_dict() if ra else None,
        "has_investigation": bool(inv),
        "investigation_id": inv.id if inv else None,
        "investigation_status": inv.status if inv else None
    }


@app.get("/api/analytics/risk")
def get_risk_analytics(db: Session = Depends(get_db)):
    """Data for scatter plots, feature impact, and channel risk distributions."""
    # 1. Scatter sample (Amount vs Hour vs Risk Level)
    sample_txns = (
        db.query(Transaction, RiskAssessment)
        .join(RiskAssessment)
        .order_by(desc(RiskAssessment.risk_score))
        .limit(300)
        .all()
    )

    scatter_data = [
        {
            "transaction_id": t.transaction_id,
            "amount": t.amount,
            "hour": t.hour,
            "risk_score": ra.risk_score,
            "risk_level": ra.risk_level,
            "channel": t.channel,
            "is_anomaly": ra.is_anomaly
        }
        for t, ra in sample_txns
    ]

    # 2. Channel risk breakdown
    channel_query = (
        db.query(
            Transaction.channel,
            func.count(Transaction.transaction_id).label("total"),
            func.sum(func.case((RiskAssessment.is_anomaly == True, 1), else_=0)).label("anomalies"),
            func.avg(Transaction.amount).label("avg_amount")
        )
        .join(RiskAssessment)
        .group_by(Transaction.channel)
        .all()
    )

    channel_stats = [
        {
            "channel": ch,
            "total": tot,
            "anomalies": anom,
            "anomaly_rate": round((anom / tot) * 100, 2) if tot else 0,
            "avg_amount": round(float(avg_a or 0), 2)
        }
        for ch, tot, anom, avg_a in channel_query
    ]

    # 3. Top cities by risk
    city_query = (
        db.query(
            Transaction.city,
            func.count(Transaction.transaction_id).label("total"),
            func.sum(func.case((RiskAssessment.risk_level.in_(["Critical", "High"]), 1), else_=0)).label("high_risk_count")
        )
        .join(RiskAssessment)
        .group_by(Transaction.city)
        .order_by(desc("high_risk_count"))
        .limit(8)
        .all()
    )

    city_stats = [
        {"city": c, "total": tot, "high_risk": hr}
        for c, tot, hr in city_query
    ]

    return {
        "scatter_data": scatter_data,
        "channel_stats": channel_stats,
        "city_stats": city_stats,
        "total_anomalies": db.query(RiskAssessment).filter(RiskAssessment.is_anomaly == True).count()
    }


@app.post("/api/investigate/{transaction_id}")
def trigger_investigation(
    transaction_id: str,
    req: Optional[InvestigateRequest] = None,
    db: Session = Depends(get_db)
):
    """Triggers autonomous AI agent multi-step forensic investigation."""
    agent = FraudTraceAgent(
        api_key=APP_SETTINGS.get("gemini_api_key"),
        provider=APP_SETTINGS.get("ai_provider", "auto")
    )
    instruction = req.custom_instruction if req else None
    res = agent.investigate(transaction_id, custom_instruction=instruction)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@app.get("/api/investigations")
def list_investigations(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List investigation cases."""
    q = db.query(Investigation)
    if status:
        q = q.filter(Investigation.status == status)
    if priority:
        q = q.filter(Investigation.priority == priority)

    cases = q.order_by(desc(Investigation.updated_at)).all()
    return [c.to_dict() for c in cases]


@app.get("/api/investigations/{case_id}")
def get_investigation_detail(case_id: str, db: Session = Depends(get_db)):
    """Get full investigation case details, AI report, telemetry trace, and approvals."""
    inv = db.query(Investigation).filter(Investigation.id == case_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation case not found.")

    res = inv.to_dict()
    res["transaction_details"] = inv.transaction.to_dict() if inv.transaction else None
    res["customer_details"] = inv.customer.to_dict() if inv.customer else None
    res["execution_trace"] = [l.to_dict() for l in inv.logs]
    res["approvals_history"] = [a.to_dict() for a in inv.approvals]
    return res


@app.post("/api/investigations/{case_id}/approve")
def submit_approval(
    case_id: str,
    req: ApprovalRequest,
    db: Session = Depends(get_db)
):
    """Human analyst decision (Approve Fraud / Reject Legitimate / Escalate)."""
    inv = db.query(Investigation).filter(Investigation.id == case_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation case not found.")

    # Record approval decision
    approval = Approval(
        investigation_id=case_id,
        decision=req.decision,
        analyst_name=req.analyst_name,
        analyst_notes=req.analyst_notes,
        action_taken=req.action_taken,
        reviewed_at=datetime.now(timezone.utc)
    )
    db.add(approval)

    # Update investigation status
    inv.status = req.decision
    inv.updated_at = datetime.now(timezone.utc)

    # If approved fraud, update transaction status to blocked
    if req.decision == "APPROVED_FRAUD" and inv.transaction:
        inv.transaction.status = "blocked"
    elif req.decision == "REJECTED_LEGITIMATE" and inv.transaction:
        inv.transaction.status = "settled"

    db.commit()

    return {
        "status": "success",
        "case_id": case_id,
        "new_status": inv.status,
        "approval": approval.to_dict()
    }


@app.post("/api/investigations/{case_id}/chat")
def chat_with_agent(
    case_id: str,
    payload: dict,
    db: Session = Depends(get_db)
):
    """Interactive analyst Q&A with the agent about this investigation case."""
    question = payload.get("message", "")
    if not question:
        raise HTTPException(status_code=400, detail="Message is required.")

    agent = FraudTraceAgent(
        api_key=APP_SETTINGS.get("gemini_api_key"),
        provider=APP_SETTINGS.get("ai_provider", "auto")
    )
    res = agent.chat_investigate(case_id, question)
    return res


@app.get("/api/reports/{case_id}/export")
def export_case_report(case_id: str, db: Session = Depends(get_db)):
    """Generate structured SAR-ready export report for download or PDF printing."""
    inv = db.query(Investigation).filter(Investigation.id == case_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Case not found.")

    txn = inv.transaction
    cust = inv.customer
    latest_appr = inv.approvals[0] if inv.approvals else None

    return {
        "report_id": f"SAR-REP-{inv.id}",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "case_id": inv.id,
        "title": inv.title,
        "status": inv.status,
        "priority": inv.priority,
        "risk_score": inv.risk_score,
        "entity": {
            "user_id": cust.user_id if cust else txn.user_id,
            "name": cust.name if cust else "Unknown",
            "email": cust.email if cust else None,
            "phone": cust.phone if cust else None,
            "home_city": cust.city if cust else txn.city,
            "risk_tier": cust.risk_tier if cust else "standard"
        },
        "transaction": {
            "transaction_id": txn.transaction_id,
            "amount": txn.amount,
            "currency": "INR (₹)",
            "channel": txn.channel,
            "merchant": txn.merchant,
            "city": txn.city,
            "timestamp": txn.transaction_time.isoformat() if txn.transaction_time else None
        },
        "forensic_observations": inv.get_observations(),
        "evidence_dossier": inv.get_evidence(),
        "ai_recommendation": inv.recommendation,
        "recommended_next_steps": inv.get_next_steps(),
        "human_approval": latest_appr.to_dict() if latest_appr else {
            "status": "PENDING_REVIEW",
            "message": "Awaiting compliance officer determination."
        }
    }


@app.get("/api/mcp/tools")
def list_mcp_tools():
    """List exposed MCP tools and documentation schemas."""
    tools = []
    for name, item in FRAUDTRACE_TOOLS.items():
        tools.append({
            "name": name,
            "description": item["description"],
            "parameters": item["parameters"]
        })
    return {"mcp_server": "FraudTrace-MCP", "version": "1.0.0", "tools": tools}


@app.get("/api/settings")
def get_settings():
    return {
        "ai_provider": APP_SETTINGS["ai_provider"],
        "has_gemini_key": bool(APP_SETTINGS["gemini_api_key"]),
        "has_openai_key": bool(APP_SETTINGS["openai_api_key"]),
        "has_anthropic_key": bool(APP_SETTINGS["anthropic_api_key"]),
        "model_name": APP_SETTINGS["model_name"],
        "contamination_rate": APP_SETTINGS["contamination_rate"],
        "environment": "Development / Demonstration"
    }


@app.post("/api/settings")
def update_settings(update: SettingsUpdate):
    APP_SETTINGS["ai_provider"] = update.ai_provider
    if update.gemini_api_key is not None:
        APP_SETTINGS["gemini_api_key"] = update.gemini_api_key
    if update.openai_api_key is not None:
        APP_SETTINGS["openai_api_key"] = update.openai_api_key
    if update.anthropic_api_key is not None:
        APP_SETTINGS["anthropic_api_key"] = update.anthropic_api_key
    if update.model_name is not None:
        APP_SETTINGS["model_name"] = update.model_name
    if update.isolation_forest_contamination is not None:
        APP_SETTINGS["contamination_rate"] = update.isolation_forest_contamination

    return {"status": "updated", "settings": get_settings()}


# Mount built frontend files if they exist (for unified single-port production run)
dist_dir = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if dist_dir.exists():
    app.mount("/", StaticFiles(directory=str(dist_dir), html=True), name="static")
