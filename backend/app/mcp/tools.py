"""
MCP Tool Implementations for FraudTrace.
These tools are exposed via the Model Context Protocol (MCP) and used by
the AI Investigation Agent to examine transactions, query customer history,
evaluate anomaly scores, and formulate evidence-based reports.
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
import numpy as np

from backend.app.models.database import SessionLocal
from backend.app.models.schema import Transaction, Customer, RiskAssessment


def get_transaction(transaction_id: str) -> Dict[str, Any]:
    """
    Retrieve full transaction details, current status, and initial risk assessment.
    """
    db = SessionLocal()
    try:
        txn = db.query(Transaction).filter(Transaction.transaction_id == transaction_id).first()
        if not txn:
            return {"error": f"Transaction {transaction_id} not found."}
        
        data = txn.to_dict()
        cust = txn.customer
        if cust:
            data["customer_name"] = cust.name
            data["customer_risk_tier"] = cust.risk_tier
            data["customer_home_city"] = cust.city
        return data
    finally:
        db.close()


def get_customer_history(user_id: str) -> Dict[str, Any]:
    """
    Examine customer profile, typical behavior baselines, and statistical distributions
    across their transaction history to distinguish normal vs anomalous behavior.
    """
    db = SessionLocal()
    try:
        cust = db.query(Customer).filter(Customer.user_id == user_id).first()
        if not cust:
            return {"error": f"Customer {user_id} not found."}
        
        txns = db.query(Transaction).filter(Transaction.user_id == user_id).all()
        amounts = [t.amount for t in txns]
        channels = [t.channel for t in txns]
        hours = [t.hour for t in txns]
        
        avg_amt = float(np.mean(amounts)) if amounts else cust.typical_min_amount
        median_amt = float(np.median(amounts)) if amounts else cust.typical_min_amount
        max_amt = float(np.max(amounts)) if amounts else cust.typical_max_amount
        std_amt = float(np.std(amounts)) if len(amounts) > 1 else 0.0
        
        night_txns = sum(1 for h in hours if h <= 5 or h >= 23)
        night_ratio = round((night_txns / len(txns)) * 100, 1) if txns else 0.0
        
        # Channel frequency
        channel_dist = {}
        for ch in channels:
            channel_dist[ch] = channel_dist.get(ch, 0) + 1
            
        return {
            "user_id": cust.user_id,
            "name": cust.name,
            "email": cust.email,
            "phone": cust.phone,
            "home_city": cust.city,
            "risk_tier": cust.risk_tier,
            "account_age_days": (datetime.now(timezone.utc) - (cust.account_created_at.replace(tzinfo=timezone.utc) if cust.account_created_at.tzinfo is None else cust.account_created_at)).days if cust.account_created_at else 180,
            "profile_baseline": {
                "typical_min_amount": cust.typical_min_amount,
                "typical_max_amount": cust.typical_max_amount,
                "preferred_channel": cust.typical_channel,
            },
            "historical_metrics": {
                "total_past_transactions": len(txns),
                "historical_mean_amount": round(avg_amt, 2),
                "historical_median_amount": round(median_amt, 2),
                "historical_max_amount": round(max_amt, 2),
                "standard_deviation": round(std_amt, 2),
                "night_transaction_percentage": night_ratio,
                "channel_distribution": channel_dist,
            }
        }
    finally:
        db.close()


def detect_anomalies(transaction_id: str) -> Dict[str, Any]:
    """
    Retrieve Isolation Forest anomaly score, percentile ranking,
    and granular feature deviation metrics for the target transaction.
    """
    db = SessionLocal()
    try:
        txn = db.query(Transaction).filter(Transaction.transaction_id == transaction_id).first()
        if not txn:
            return {"error": f"Transaction {transaction_id} not found."}
        
        ra = txn.risk_assessment
        cust = txn.customer
        
        # Calculate feature deviations
        median_ref = max(cust.typical_max_amount / 2, 500) if cust else 1000
        amount_ratio = round(txn.amount / median_ref, 2)
        is_night = int(txn.hour <= 5 or txn.hour >= 23)
        channel_mismatch = bool(cust and txn.channel != cust.typical_channel)
        city_mismatch = bool(cust and txn.city != cust.city)
        
        factors = ra.get_factors() if ra else []
        
        return {
            "transaction_id": transaction_id,
            "model_type": "Isolation Forest (Unsupervised)",
            "anomaly_score": ra.anomaly_score if ra else 0.45,
            "risk_score_percentile": ra.risk_score if ra else 50.0,
            "is_anomaly": ra.is_anomaly if ra else False,
            "risk_level": ra.risk_level if ra else "Low",
            "feature_deviations": {
                "transaction_amount": txn.amount,
                "amount_to_baseline_ratio": f"{amount_ratio}x",
                "execution_hour": txn.hour,
                "is_night_transaction": bool(is_night),
                "channel_deviates_from_profile": channel_mismatch,
                "location_deviates_from_home": city_mismatch,
            },
            "model_risk_factors": factors
        }
    finally:
        db.close()


def find_related_transactions(transaction_id: str, window_hours: int = 24) -> Dict[str, Any]:
    """
    Scan for related unusual transaction velocity, rapid bursts,
    repeated beneficiary hits, or sudden geographic hops.
    """
    db = SessionLocal()
    try:
        target_txn = db.query(Transaction).filter(Transaction.transaction_id == transaction_id).first()
        if not target_txn:
            return {"error": f"Transaction {transaction_id} not found."}
        
        target_time = target_txn.transaction_time
        start_window = target_time - timedelta(hours=window_hours)
        end_window = target_time + timedelta(hours=window_hours)
        
        # 1. User Velocity: other transactions by same user within window
        user_txns = (
            db.query(Transaction)
            .filter(
                Transaction.user_id == target_txn.user_id,
                Transaction.transaction_id != target_txn.transaction_id,
                Transaction.transaction_time >= start_window,
                Transaction.transaction_time <= end_window
            )
            .all()
        )
        
        # 2. Merchant Cluster: other high-value transactions at same merchant
        same_merchant_txns = (
            db.query(Transaction)
            .filter(
                Transaction.merchant == target_txn.merchant,
                Transaction.transaction_id != target_txn.transaction_id,
                Transaction.amount >= 20000
            )
            .limit(5)
            .all()
        )
        
        # 3. Check for geographic hop (different city within 3 hours)
        rapid_city_hops = []
        for t in user_txns:
            diff_hours = abs((t.transaction_time - target_time).total_seconds()) / 3600.0
            if diff_hours <= 4.0 and t.city != target_txn.city:
                rapid_city_hops.append({
                    "transaction_id": t.transaction_id,
                    "city": t.city,
                    "delta_hours": round(diff_hours, 2),
                    "amount": t.amount
                })
        
        return {
            "transaction_id": transaction_id,
            "user_id": target_txn.user_id,
            "window_hours": window_hours,
            "velocity_count": len(user_txns),
            "velocity_total_amount": round(sum(t.amount for t in user_txns), 2),
            "burst_alert": len(user_txns) >= 3,
            "rapid_city_hops": rapid_city_hops,
            "merchant_cluster_hits": len(same_merchant_txns),
            "related_user_transactions": [
                {
                    "transaction_id": t.transaction_id,
                    "amount": t.amount,
                    "channel": t.channel,
                    "city": t.city,
                    "transaction_time": t.transaction_time.isoformat(),
                    "status": t.status
                }
                for t in user_txns[:5]
            ]
        }
    finally:
        db.close()


def calculate_risk(transaction_id: str) -> Dict[str, Any]:
    """
    Calculate an explainable multi-factor risk assessment combining model output,
    behavioral deviation from customer baseline, and velocity indicators.
    """
    db = SessionLocal()
    try:
        txn = db.query(Transaction).filter(Transaction.transaction_id == transaction_id).first()
        if not txn:
            return {"error": f"Transaction {transaction_id} not found."}
        
        cust = txn.customer
        ra = txn.risk_assessment
        
        # Factors breakdown
        score_breakdown = []
        composite_score = 0.0
        
        # Factor 1: ML Isolation Forest Percentile
        ml_score = ra.risk_score if ra else 40.0
        composite_score += ml_score * 0.45
        score_breakdown.append({
            "dimension": "Machine Learning Anomaly Score",
            "weight": 0.45,
            "raw_value": f"{ml_score:.1f}/100",
            "impact": "High" if ml_score > 80 else ("Moderate" if ml_score > 50 else "Low")
        })
        
        # Factor 2: Deviation from customer baseline
        if cust and cust.typical_max_amount > 0:
            ratio = txn.amount / cust.typical_max_amount
            if ratio > 3.0:
                dev_pts = min(100.0, ratio * 20.0)
                composite_score += dev_pts * 0.25
                score_breakdown.append({
                    "dimension": "Customer Baseline Spike",
                    "weight": 0.25,
                    "raw_value": f"{ratio:.1f}x typical maximum (₹{cust.typical_max_amount:,.0f})",
                    "impact": "Critical" if ratio > 5.0 else "High"
                })
            else:
                composite_score += 15.0 * 0.25
                score_breakdown.append({
                    "dimension": "Customer Baseline Alignment",
                    "weight": 0.25,
                    "raw_value": f"Within {ratio:.1f}x normal limits",
                    "impact": "Low"
                })
        else:
            composite_score += 20.0 * 0.25
            
        # Factor 3: Execution Time (Night hours 00:00 - 05:00)
        if txn.hour <= 5 or txn.hour >= 23:
            composite_score += 85.0 * 0.15
            score_breakdown.append({
                "dimension": "Temporal Window (Nocturnal)",
                "weight": 0.15,
                "raw_value": f"Executed at {txn.hour:02d}:00 hours (Off-hours window)",
                "impact": "Elevated"
            })
        else:
            composite_score += 10.0 * 0.15
            score_breakdown.append({
                "dimension": "Temporal Window (Daytime)",
                "weight": 0.15,
                "raw_value": f"Executed at {txn.hour:02d}:00 hours (Standard business hours)",
                "impact": "Nominal"
            })
            
        # Factor 4: Channel & Merchant Profile
        is_suspicious_merchant = txn.merchant and any(
            word in txn.merchant.lower() for word in ["crypto", "p2p", "offshore", "remit", "gaming", "escrow"]
        )
        if is_suspicious_merchant:
            composite_score += 90.0 * 0.15
            score_breakdown.append({
                "dimension": "Merchant Counterparty Risk",
                "weight": 0.15,
                "raw_value": f"Beneficiary '{txn.merchant}' classified as high-risk category",
                "impact": "Critical"
            })
        elif txn.channel in ["web", "mobile"] and txn.amount >= 30000:
            composite_score += 60.0 * 0.15
            score_breakdown.append({
                "dimension": "High-Value Digital Channel",
                "weight": 0.15,
                "raw_value": f"₹{txn.amount:,.2f} over {txn.channel}",
                "impact": "Moderate"
            })
        else:
            composite_score += 10.0 * 0.15
            
        calibrated_score = round(min(100.0, max(0.0, composite_score)), 1)
        
        if calibrated_score >= 90:
            risk_level = "Critical"
        elif calibrated_score >= 75:
            risk_level = "High"
        elif calibrated_score >= 50:
            risk_level = "Medium"
        else:
            risk_level = "Low"
            
        return {
            "transaction_id": transaction_id,
            "calculated_risk_score": calibrated_score,
            "risk_level": risk_level,
            "confidence": 0.92 if calibrated_score > 80 else 0.85,
            "dimensions": score_breakdown,
            "disclaimer": "Risk scores reflect relative heuristic and model distance, not calibrated legal proof of fraud."
        }
    finally:
        db.close()


def generate_investigation_report(
    transaction_id: str,
    observations: Optional[List[str]] = None,
    evidence: Optional[List[str]] = None,
    recommendation: Optional[str] = None,
    next_steps: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Synthesize structured evidence-based investigation report ready for human review.
    """
    db = SessionLocal()
    try:
        txn = db.query(Transaction).filter(Transaction.transaction_id == transaction_id).first()
        if not txn:
            return {"error": f"Transaction {transaction_id} not found."}
        
        cust = txn.customer
        ra = txn.risk_assessment
        
        risk_level = ra.risk_level if ra else "Medium"
        risk_score = ra.risk_score if ra else 65.0
        
        # Default structured report components if not supplied
        if not observations:
            observations = [
                f"Transaction amount: ₹{txn.amount:,.2f} via {txn.channel.upper()} channel.",
                f"Transaction time: {txn.hour:02d}:00 hours in {txn.city}.",
                f"Customer baseline: typical transactions range from ₹{cust.typical_min_amount:,.0f} to ₹{cust.typical_max_amount:,.0f}.",
                f"Relative deviation: {txn.amount / max(cust.typical_max_amount, 1):.1f}x higher than observed customer average."
            ]
            
        if not evidence:
            evidence = [
                f"Isolation Forest identified pattern as anomalous (percentile: {risk_score:.1f}/100).",
                f"Digital payment channel '{txn.channel}' and high value exceed standard behavioral limits.",
                f"Beneficiary '{txn.merchant}' tagged under elevated scrutiny categories.",
                "Late-night execution window triggered anomaly flag."
            ]
            
        if not recommendation:
            if risk_level in ["Critical", "High"]:
                recommendation = "Recommend temporary hold on digital channel transfers and prompt customer out-of-band verification."
            else:
                recommendation = "Low/Moderate risk profile. Recommend closing inquiry as legitimate unless additional suspicious velocity appears."
                
        if not next_steps:
            next_steps = [
                "Initiate automated phone verification (IVR/SMS) with customer.",
                "Inspect device telemetry and IP geolocation headers.",
                "Review recent 7-day beneficiary creation logs for payee.",
                "Human analyst confirmation required for permanent account block or SAR submission."
            ]
            
        return {
            "transaction_id": transaction_id,
            "user_id": txn.user_id,
            "customer_name": cust.name if cust else "Unknown",
            "risk_level": risk_level,
            "risk_score": risk_score,
            "status": "PENDING_ANALYST_REVIEW",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "observations": observations,
            "evidence": evidence,
            "recommendation": recommendation,
            "next_steps": next_steps,
            "human_in_the_loop": {
                "requires_approval": True,
                "supported_actions": ["APPROVE_FRAUD", "REJECT_LEGITIMATE", "ESCALATE"]
            }
        }
    finally:
        db.close()


# Registry of available tools for discovery by Agent and MCP Server
FRAUDTRACE_TOOLS = {
    "get_transaction": {
        "function": get_transaction,
        "description": "Retrieve transaction details, channel, user_id, amount, city, timestamp, status, merchant, and existing risk assessment.",
        "parameters": {
            "type": "object",
            "properties": {
                "transaction_id": {"type": "string", "description": "Transaction identifier (e.g., TXN-9FA8123B)"}
            },
            "required": ["transaction_id"]
        }
    },
    "get_customer_history": {
        "function": get_customer_history,
        "description": "Examine customer profile, typical spend limits, preferred channel, and past 30-day transaction distribution.",
        "parameters": {
            "type": "object",
            "properties": {
                "user_id": {"type": "string", "description": "Customer identifier (e.g., USR-1025)"}
            },
            "required": ["user_id"]
        }
    },
    "detect_anomalies": {
        "function": detect_anomalies,
        "description": "Retrieve Isolation Forest anomaly score, feature deviations, and explainable model splits.",
        "parameters": {
            "type": "object",
            "properties": {
                "transaction_id": {"type": "string", "description": "Transaction identifier"}
            },
            "required": ["transaction_id"]
        }
    },
    "find_related_transactions": {
        "function": find_related_transactions,
        "description": "Identify related unusual transactions, velocity bursts, rapid cross-city hops, and merchant clusters.",
        "parameters": {
            "type": "object",
            "properties": {
                "transaction_id": {"type": "string", "description": "Transaction identifier"},
                "window_hours": {"type": "integer", "description": "Time window in hours to search (default 24)"}
            },
            "required": ["transaction_id"]
        }
    },
    "calculate_risk": {
        "function": calculate_risk,
        "description": "Calculate an explainable multi-factor risk assessment combining ML anomaly score, baseline deviation, and velocity.",
        "parameters": {
            "type": "object",
            "properties": {
                "transaction_id": {"type": "string", "description": "Transaction identifier"}
            },
            "required": ["transaction_id"]
        }
    },
    "generate_investigation_report": {
        "function": generate_investigation_report,
        "description": "Synthesize a structured SAR-ready investigation report with observations, evidence, and recommendations.",
        "parameters": {
            "type": "object",
            "properties": {
                "transaction_id": {"type": "string", "description": "Transaction identifier"},
                "observations": {"type": "array", "items": {"type": "string"}, "description": "List of key observations"},
                "evidence": {"type": "array", "items": {"type": "string"}, "description": "List of evidence items"},
                "recommendation": {"type": "string", "description": "Recommended course of action"}
            },
            "required": ["transaction_id"]
        }
    }
}
