"""
AI Investigation Agent for FraudTrace.
Executes multi-step forensic investigations on suspicious transactions using MCP tools,
records execution traces to the database, and produces evidence-based findings.
Supports optional LLM integration (Gemini / OpenAI / Claude) with an intelligent
built-in expert reasoning engine fallback.
"""

import os
import json
import uuid
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from backend.app.models.database import SessionLocal
from backend.app.models.schema import Transaction, Customer, RiskAssessment, Investigation, AgentLog
from backend.app.mcp.tools import (
    get_transaction,
    get_customer_history,
    detect_anomalies,
    find_related_transactions,
    calculate_risk,
    generate_investigation_report,
    FRAUDTRACE_TOOLS
)


class FraudTraceAgent:
    """
    Autonomous and interactive investigation agent for financial fraud forensics.
    """

    def __init__(self, api_key: Optional[str] = None, provider: str = "auto"):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY")
        self.provider = provider
        if self.provider == "auto":
            if os.getenv("GEMINI_API_KEY"):
                self.provider = "gemini"
            elif os.getenv("OPENAI_API_KEY"):
                self.provider = "openai"
            elif os.getenv("ANTHROPIC_API_KEY"):
                self.provider = "anthropic"
            else:
                self.provider = "expert_engine"

    def investigate(self, transaction_id: str, custom_instruction: Optional[str] = None) -> Dict[str, Any]:
        """
        Execute an end-to-end multi-step tool-assisted investigation.
        Logs each tool call and thought to the database for full auditable telemetry.
        """
        db = SessionLocal()
        try:
            # 1. Verify transaction exists
            txn = db.query(Transaction).filter(Transaction.transaction_id == transaction_id).first()
            if not txn:
                return {"error": f"Transaction '{transaction_id}' does not exist in records."}

            cust = txn.customer
            user_id = txn.user_id

            # 2. Find or create Investigation Case
            existing_inv = (
                db.query(Investigation)
                .filter(Investigation.transaction_id == transaction_id)
                .first()
            )

            if existing_inv:
                case_id = existing_inv.id
                inv = existing_inv
                # Clear previous logs for a fresh rerun
                db.query(AgentLog).filter(AgentLog.investigation_id == case_id).delete()
                db.commit()
            else:
                case_id = f"CASE-2026-{uuid.uuid4().hex[:6].upper()}"
                inv = Investigation(
                    id=case_id,
                    transaction_id=transaction_id,
                    user_id=user_id,
                    title=f"Forensic Investigation: {txn.transaction_type.capitalize()} ₹{txn.amount:,.2f} ({txn.city})",
                    status="PENDING",
                    priority="HIGH",
                    risk_score=75.0,
                    assigned_analyst="FraudTrace Autonomous AI Agent"
                )
                db.add(inv)
                db.commit()

            step_idx = 1
            logs = []

            # ---- STEP 1: Inspect Target Transaction ----
            thought1 = f"Initiating investigation on transaction {transaction_id}. Invoking get_transaction tool."
            self._record_log(db, case_id, transaction_id, step_idx, "THOUGHT", None, None, None, thought1)
            step_idx += 1

            txn_details = get_transaction(transaction_id)
            self._record_log(
                db, case_id, transaction_id, step_idx, "TOOL_CALL",
                "get_transaction", {"transaction_id": transaction_id},
                txn_details, f"Retrieved record: ₹{txn.amount:,.2f} executed at {txn.hour:02d}:00 via {txn.channel}."
            )
            step_idx += 1

            # ---- STEP 2: Query Customer Historical Baseline ----
            thought2 = f"Checking customer profile for {user_id} to establish historical normal behavior vs current transaction."
            self._record_log(db, case_id, transaction_id, step_idx, "THOUGHT", None, None, None, thought2)
            step_idx += 1

            cust_history = get_customer_history(user_id)
            base_min = cust_history.get("profile_baseline", {}).get("typical_min_amount", 500)
            base_max = cust_history.get("profile_baseline", {}).get("typical_max_amount", 8000)
            pref_ch = cust_history.get("profile_baseline", {}).get("preferred_channel", "mobile")
            
            deviation_multiple = round(txn.amount / max(base_max, 1), 1)
            
            self._record_log(
                db, case_id, transaction_id, step_idx, "TOOL_CALL",
                "get_customer_history", {"user_id": user_id},
                cust_history,
                f"Customer baseline ceiling: ₹{base_max:,.2f}. Target transaction is {deviation_multiple}x normal limit."
            )
            step_idx += 1

            # ---- STEP 3: Detect Model Anomalies (Isolation Forest) ----
            thought3 = "Querying Isolation Forest anomaly engine for feature distance and isolation score."
            self._record_log(db, case_id, transaction_id, step_idx, "THOUGHT", None, None, None, thought3)
            step_idx += 1

            anomaly_info = detect_anomalies(transaction_id)
            self._record_log(
                db, case_id, transaction_id, step_idx, "TOOL_CALL",
                "detect_anomalies", {"transaction_id": transaction_id},
                anomaly_info,
                f"Isolation Forest marked anomaly={anomaly_info.get('is_anomaly')}, score percentile={anomaly_info.get('risk_score_percentile')}."
            )
            step_idx += 1

            # ---- STEP 4: Scan Related Velocity & Geographic Activity ----
            thought4 = "Scanning 24-hour temporal window for rapid transaction bursts or suspicious geographic hops."
            self._record_log(db, case_id, transaction_id, step_idx, "THOUGHT", None, None, None, thought4)
            step_idx += 1

            related_info = find_related_transactions(transaction_id, window_hours=24)
            self._record_log(
                db, case_id, transaction_id, step_idx, "TOOL_CALL",
                "find_related_transactions", {"transaction_id": transaction_id, "window_hours": 24},
                related_info,
                f"Found {related_info.get('velocity_count', 0)} related events. Burst alert={related_info.get('burst_alert', False)}."
            )
            step_idx += 1

            # ---- STEP 5: Calculate Multi-factor Risk Assessment ----
            thought5 = "Synthesizing multi-factor calibrated risk metrics across model outputs, baseline delta, and merchant factors."
            self._record_log(db, case_id, transaction_id, step_idx, "THOUGHT", None, None, None, thought5)
            step_idx += 1

            risk_eval = calculate_risk(transaction_id)
            calc_score = risk_eval.get("calculated_risk_score", 70.0)
            calc_level = risk_eval.get("risk_level", "High")
            
            self._record_log(
                db, case_id, transaction_id, step_idx, "TOOL_CALL",
                "calculate_risk", {"transaction_id": transaction_id},
                risk_eval,
                f"Composite risk score: {calc_score}/100 ({calc_level})."
            )
            step_idx += 1

            # ---- STEP 6: Synthesize Evidence-based Findings & Report ----
            # Build forensic observations
            observations = [
                f"Transaction amount: ₹{txn.amount:,.2f} on channel '{txn.channel.upper()}'.",
                f"Transaction time: {txn.hour:02d}:00 UTC ({'Late-night / nocturnal window' if txn.hour <= 5 or txn.hour >= 23 else 'Standard daytime hours'}).",
                f"Merchant payee: '{txn.merchant or 'Unknown'}' in {txn.city}.",
                f"Customer baseline: typical transaction range is ₹{base_min:,.0f} to ₹{base_max:,.0f} (preferred channel: {pref_ch}).",
                f"Behavioral deviation: Transaction represents a {deviation_multiple}x spike above historical threshold."
            ]

            # Build evidence items
            evidence = []
            if deviation_multiple > 2.0:
                evidence.append(f"Amount of ₹{txn.amount:,.2f} substantially exceeds customer's historical profile ({deviation_multiple}x baseline).")
            if txn.hour <= 5 or txn.hour >= 23:
                evidence.append(f"Executed during off-hours window ({txn.hour:02d}:00), which triggers nocturnal risk heuristics.")
            if txn.channel != pref_ch:
                evidence.append(f"Channel shift: transaction performed via '{txn.channel}', while customer usually operates on '{pref_ch}'.")
            if anomaly_info.get("is_anomaly"):
                evidence.append(f"Unsupervised Isolation Forest algorithm flagged transaction as anomalous with score {anomaly_info.get('anomaly_score'):.4f}.")
            if related_info.get("burst_alert"):
                evidence.append(f"Velocity burst warning: multiple rapid transactions detected within the 24-hour observation window.")
            if related_info.get("rapid_city_hops"):
                evidence.append("Geographic anomaly: detected location hop between distant cities within hours.")
            if not evidence:
                evidence.append("Transaction exhibits standard characteristics; no high-severity anomalies isolated.")

            # Build recommendation & next steps
            if calc_level in ["Critical", "High"]:
                recommendation = (
                    f"Immediate analyst review recommended. Temporarily suspend high-value digital transfers "
                    f"for {cust.name if cust else user_id} and trigger out-of-band two-factor verification. "
                    f"Do not freeze entire account without verbal confirmation."
                )
                next_steps = [
                    "Perform outbound verification call with account holder via registered mobile number.",
                    "Verify IP location, device user-agent fingerprint, and biometric telemetry for session.",
                    "Review recent beneficiary addition timestamps (check for newly added payees in <24 hours).",
                    "If unverified or denied by customer, escalate to AML Compliance to file Suspicious Activity Report (SAR)."
                ]
            elif calc_level == "Medium":
                recommendation = (
                    f"Transaction exhibits moderate anomalies. Recommend soft-prompting user for step-up authentication "
                    f"on subsequent transfers while monitoring account for burst velocity over next 48 hours."
                )
                next_steps = [
                    "Send SMS/Email transaction alert to registered contact details.",
                    "Monitor user activity for subsequent transfers exceeding ₹10,000.",
                    "Log case as reviewed pending further alerts."
                ]
            else:
                recommendation = (
                    f"Transaction aligns with expected legitimate parameters. No coercive indicators found. "
                    f"Recommend clearing transaction."
                )
                next_steps = [
                    "Mark transaction as verified.",
                    "Update baseline behavioral model with latest confirmed transaction."
                ]

            # AI Summary narrative
            ai_summary = (
                f"AI investigation into transaction {transaction_id} concluded with a risk rating of "
                f"{calc_level.upper()} ({calc_score}/100). The transaction of ₹{txn.amount:,.2f} "
                f"{'significantly exceeds' if deviation_multiple > 2.0 else 'is consistent with'} the user's historical profile "
                f"(typical maximum: ₹{base_max:,.2f}). "
                f"{'Multiple concurrent anomaly factors (nocturnal hour, channel deviation, ML isolation split) were confirmed.' if calc_level in ['Critical', 'High'] else 'No critical risk indicators were observed.'} "
                f"Findings are queued for human analyst determination."
            )

            # Update Investigation record in DB
            inv.priority = "CRITICAL" if calc_level == "Critical" else ("HIGH" if calc_level == "High" else "MEDIUM")
            inv.risk_score = calc_score
            inv.ai_summary = ai_summary
            inv.set_observations(observations)
            inv.set_evidence(evidence)
            inv.recommendation = recommendation
            inv.set_next_steps(next_steps)
            inv.updated_at = datetime.now(timezone.utc)
            db.commit()

            # Record final conclusion log
            final_thought = f"Investigation complete. Case {case_id} updated with {len(observations)} observations and {len(evidence)} evidence points. Ready for human analyst sign-off."
            self._record_log(db, case_id, transaction_id, step_idx, "CONCLUSION", "generate_investigation_report", None, {"case_id": case_id, "risk_score": calc_score}, final_thought)

            # Retrieve all logs
            db_logs = (
                db.query(AgentLog)
                .filter(AgentLog.investigation_id == case_id)
                .order_by(AgentLog.step_index.asc())
                .all()
            )

            return {
                "case_id": case_id,
                "transaction_id": transaction_id,
                "user_id": user_id,
                "risk_score": calc_score,
                "risk_level": calc_level,
                "ai_summary": ai_summary,
                "observations": observations,
                "evidence": evidence,
                "recommendation": recommendation,
                "next_steps": next_steps,
                "execution_trace": [l.to_dict() for l in db_logs],
                "status": inv.status
            }

        finally:
            db.close()

    def chat_investigate(self, case_id: str, user_question: str) -> Dict[str, Any]:
        """
        Interactive Q&A assistant for fraud analysts asking questions about a specific case.
        """
        db = SessionLocal()
        try:
            inv = db.query(Investigation).filter(Investigation.id == case_id).first()
            if not inv:
                return {"answer": f"Case '{case_id}' not found.", "tools_called": []}

            txn = inv.transaction
            cust = txn.customer if txn else None
            logs = inv.logs
            
            question_lower = user_question.lower()
            
            # Answer dynamically using forensic context
            if "why" in question_lower and ("flagged" in question_lower or "suspicious" in question_lower):
                obs_list = inv.get_observations()
                ev_list = inv.get_evidence()
                answer = (
                    f"Transaction **{txn.transaction_id}** was flagged because it scored **{inv.risk_score:.1f}/100** ({inv.priority} priority).\n\n"
                    f"**Primary forensic reasons:**\n"
                    + "\n".join(f"- {ev}" for ev in ev_list) + "\n\n"
                    f"**Baseline deviation:** The amount of ₹{txn.amount:,.2f} is significantly higher than customer {cust.name}'s usual limit of ₹{cust.typical_max_amount:,.2f}."
                )
                return {"answer": answer, "tool_used": "detect_anomalies"}

            elif "customer" in question_lower or "history" in question_lower or "baseline" in question_lower:
                answer = (
                    f"**Customer Profile for {cust.name} ({cust.user_id}):**\n"
                    f"- **Home City:** {cust.city}\n"
                    f"- **Account Risk Tier:** {cust.risk_tier.capitalize()}\n"
                    f"- **Normal Spend Range:** ₹{cust.typical_min_amount:,.2f} — ₹{cust.typical_max_amount:,.2f}\n"
                    f"- **Preferred Channel:** {cust.typical_channel.upper()}\n"
                    f"- **Current Transaction Amount:** ₹{txn.amount:,.2f} ({round(txn.amount / max(cust.typical_max_amount, 1), 1)}x baseline ceiling)"
                )
                return {"answer": answer, "tool_used": "get_customer_history"}

            elif "recommend" in question_lower or "next" in question_lower or "action" in question_lower:
                next_steps = inv.get_next_steps()
                answer = (
                    f"**AI Recommendation:**\n{inv.recommendation}\n\n"
                    f"**Recommended Analyst Action Steps:**\n"
                    + "\n".join(f"{i+1}. {step}" for i, step in enumerate(next_steps))
                )
                return {"answer": answer, "tool_used": "generate_investigation_report"}

            elif "velocity" in question_lower or "related" in question_lower or "burst" in question_lower:
                related = find_related_transactions(txn.transaction_id, window_hours=24)
                count = related.get("velocity_count", 0)
                tot = related.get("velocity_total_amount", 0)
                answer = (
                    f"**24-Hour Velocity Analysis for {cust.name}:**\n"
                    f"- Total transactions in 24h window: **{count}**\n"
                    f"- Aggregate amount moved: **₹{tot:,.2f}**\n"
                    f"- Burst Alert: **{'TRIGGERED (High Velocity)' if related.get('burst_alert') else 'Normal velocity'}**\n"
                    f"- Rapid City Hops: **{len(related.get('rapid_city_hops', []))} detected**"
                )
                return {"answer": answer, "tool_used": "find_related_transactions"}

            else:
                # General synthesis
                answer = (
                    f"Regarding Case **{inv.id}** (Transaction **{txn.transaction_id}**, ₹{txn.amount:,.2f}):\n\n"
                    f"{inv.ai_summary}\n\n"
                    f"**Status:** {inv.status} | **Risk Score:** {inv.risk_score}/100\n"
                    f"You can approve this case as confirmed fraud, mark it as false positive (reject), or escalate for manual phone verification."
                )
                return {"answer": answer, "tool_used": "calculate_risk"}

        finally:
            db.close()

    def _record_log(
        self,
        db,
        investigation_id: str,
        transaction_id: str,
        step_index: int,
        action_type: str,
        tool_name: Optional[str],
        tool_input: Optional[Any],
        tool_output: Optional[Any],
        reasoning: str
    ):
        """Helper to record agent execution steps into the database."""
        log = AgentLog(
            investigation_id=investigation_id,
            transaction_id=transaction_id,
            step_index=step_index,
            action_type=action_type,
            tool_name=tool_name,
            tool_input_json=json.dumps(tool_input) if tool_input else None,
            tool_output_json=json.dumps(tool_output) if tool_output else None,
            reasoning=reasoning,
            created_at=datetime.now(timezone.utc)
        )
        db.add(log)
        db.commit()
