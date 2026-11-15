# FraudTrace Architecture Specification

## 1. System Philosophy: Detection vs. Investigation

A key design principle of FraudTrace is the clean decoupling of **Detection** from **Investigation**:

```
+-------------------------------------------------------------+
|                     TRANSACTION STREAM                      |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|             DATA SCIENCE ENGINE (Detection)                 |
|  - Isolation Forest (Unsupervised tree isolation)           |
|  - Customer Behavioral Profiler (Z-Score & baseline limits) |
|  - Percentile Risk Score Calibration                        |
+-------------------------------------------------------------+
                              |
                              v
                     [ Suspicious Flag ]
                              |
                              v
+-------------------------------------------------------------+
|             MCP TOOLS REGISTRY (Tool Interface)             |
|  Exposes get_transaction, get_customer_history,             |
|  detect_anomalies, find_related_transactions, etc.          |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|             AI INVESTIGATION AGENT (Investigation)          |
|  - Multi-step forensic reasoning (ReAct loop)               |
|  - Calls MCP tools to gather evidence                       |
|  - Constructs human-readable Observations & Evidence        |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|             HUMAN ANALYST APPROVAL (Governance)             |
|  - Review AI findings                                       |
|  - Confirm Fraud / Whitelist / Escalate                     |
|  - Maintain permanent audit trail & file SAR                |
+-------------------------------------------------------------+
```

## 2. Database Schema (PostgreSQL / SQLite)

The platform uses six interconnected relational tables:

1. **`customers`**:
   - `user_id` (PK), `name`, `email`, `phone`, `city`, `risk_tier`, `typical_min_amount`, `typical_max_amount`, `typical_channel`, `account_created_at`.
2. **`transactions`**:
   - `transaction_id` (PK), `user_id` (FK), `amount`, `transaction_type`, `channel`, `city`, `transaction_time`, `hour`, `status`, `merchant`.
3. **`risk_assessments`**:
   - `id` (PK), `transaction_id` (FK), `anomaly_score`, `risk_score` (0-100), `risk_level` (Low, Medium, High, Critical), `is_anomaly`, `primary_factors_json`.
4. **`investigations`**:
   - `id` (PK, e.g. CASE-2026-XXXX), `transaction_id` (FK), `user_id` (FK), `title`, `status`, `priority`, `risk_score`, `ai_summary`, `observations_json`, `evidence_json`, `recommendation`, `next_steps_json`.
5. **`agent_logs`**:
   - `id` (PK), `investigation_id` (FK), `step_index`, `action_type` (THOUGHT, TOOL_CALL, TOOL_RESULT, CONCLUSION), `tool_name`, `tool_input_json`, `tool_output_json`, `reasoning`, `created_at`.
6. **`approvals`**:
   - `id` (PK), `investigation_id` (FK), `decision` (APPROVED_FRAUD, REJECTED_LEGITIMATE, ESCALATED), `analyst_name`, `analyst_notes`, `action_taken`, `reviewed_at`.
