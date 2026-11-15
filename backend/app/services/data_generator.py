import random
import uuid
from pathlib import Path
from datetime import datetime, timedelta, timezone
import pandas as pd

from backend.app.models.database import SessionLocal, Base, engine
from backend.app.models.schema import Customer, Transaction, RiskAssessment, Investigation, AgentLog, Approval


INDIAN_CITIES = [
    "Mumbai", "Pune", "Delhi", "Bengaluru",
    "Hyderabad", "Chennai", "Kolkata", "Ahmedabad", "Jaipur", "Chandigarh"
]

FIRST_NAMES = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
    "Diya", "Saanvi", "Aanya", "Aadhya", "Pari", "Ananya", "Myra", "Riya", "Navya", "Meera",
    "Vikram", "Rohan", "Siddharth", "Pooja", "Neha", "Rahul", "Kavita", "Aniket", "Shreya", "Sunil"
]

LAST_NAMES = [
    "Sharma", "Verma", "Patel", "Mehta", "Deshmukh", "Nair", "Reddy", "Rao", "Gupta", "Malhotra",
    "Singh", "Chopra", "Kulkarni", "Iyer", "Banerjee", "Bose", "Joshi", "Das", "Menon", "Kapoor"
]

MERCHANTS = [
    "Amazon India", "Flipkart", "Swiggy", "Zomato", "MakeMyTrip", "IRCTC",
    "Reliance Digital", "Croma", "Zara Retail", "Tanishq Jewellers",
    "Apple Store Mumbai", "DLF CyberHub", "Apollo Pharmacy", "Uber India", "Decathlon"
]

SUSPICIOUS_MERCHANTS = [
    "CryptoEx P2P Transfer", "Offshore Digital Holdings", "Unregistered Peer Remittance",
    "High Stakes Gaming Ltd", "FastCash Online Remit", "QuickEscrow Portal"
]


def generate_synthetic_ecosystem(num_customers=150, num_transactions=2500, seed=42):
    """
    Generate coherent synthetic customers, normal transactions,
    and distinct fraud patterns for demonstration and model training.
    """
    rng = random.Random(seed)
    customers = []
    
    # 1. Create realistic Customer Profiles with individual behavioural baselines
    for i in range(1, num_customers + 1):
        uid = f"USR-{1000 + i}"
        fn = rng.choice(FIRST_NAMES)
        ln = rng.choice(LAST_NAMES)
        city = rng.choice(INDIAN_CITIES)
        channel_pref = rng.choice(["mobile", "web", "POS", "ATM"])
        
        # Customer tiers
        tier = rng.choices(["standard", "premium", "conservative"], weights=[0.65, 0.20, 0.15])[0]
        if tier == "premium":
            min_amt = round(rng.uniform(1500, 4000), 2)
            max_amt = round(rng.uniform(25000, 60000), 2)
        elif tier == "conservative":
            min_amt = round(rng.uniform(100, 500), 2)
            max_amt = round(rng.uniform(2000, 6000), 2)
        else: # standard
            min_amt = round(rng.uniform(300, 1000), 2)
            max_amt = round(rng.uniform(8000, 18000), 2)
            
        customers.append({
            "user_id": uid,
            "name": f"{fn} {ln}",
            "email": f"{fn.lower()}.{ln.lower()}{rng.randint(10, 99)}@example.com",
            "phone": f"+91 {rng.randint(70000, 99999)} {rng.randint(10000, 99999)}",
            "city": city,
            "risk_tier": tier,
            "typical_min_amount": min_amt,
            "typical_max_amount": max_amt,
            "typical_channel": channel_pref,
            "account_created_at": datetime.now(timezone.utc) - timedelta(days=rng.randint(90, 720))
        })
    
    cust_map = {c["user_id"]: c for c in customers}
    cust_ids = list(cust_map.keys())
    
    # 2. Generate Transactions
    transaction_types = ["purchase", "transfer", "withdrawal", "online_payment"]
    channels = ["mobile", "web", "ATM", "POS"]
    
    now = datetime.now(timezone.utc)
    transactions = []
    
    for _ in range(num_transactions):
        user_id = rng.choice(cust_ids)
        c = cust_map[user_id]
        
        # Base normal transaction
        txn_time = now - timedelta(minutes=rng.randint(5, 60 * 24 * 45))  # last 45 days
        
        # Normal customer behavior
        amount = round(rng.uniform(c["typical_min_amount"], c["typical_max_amount"]), 2)
        channel = c["typical_channel"] if rng.random() < 0.75 else rng.choice(channels)
        city = c["city"] if rng.random() < 0.90 else rng.choice(INDIAN_CITIES)
        txn_type = rng.choice(transaction_types)
        merchant = rng.choice(MERCHANTS)
        is_synthetic_fraud = 0
        
        # Introduce synthetic suspicious / anomalous patterns (~5.5% probability)
        fraud_roll = rng.random()
        if fraud_roll < 0.055:
            is_synthetic_fraud = 1
            pattern_type = rng.choice(["midnight_surge", "burst_velocity", "cross_city_transfer", "extreme_spike"])
            
            if pattern_type == "midnight_surge":
                # Late night high value
                amount = round(rng.uniform(45000, 165000), 2)
                txn_time = txn_time.replace(hour=rng.choice([1, 2, 3, 4]), minute=rng.randint(0, 59))
                channel = rng.choice(["web", "mobile"])
                merchant = rng.choice(SUSPICIOUS_MERCHANTS)
                txn_type = "online_payment"
                
            elif pattern_type == "extreme_spike":
                # 15x to 30x the user's maximum normal limit
                amount = round(c["typical_max_amount"] * rng.uniform(8.0, 22.0), 2)
                channel = "web"
                txn_type = "transfer"
                merchant = rng.choice(SUSPICIOUS_MERCHANTS)
                
            elif pattern_type == "cross_city_transfer":
                # Sudden distant city hop and high amount
                distant_cities = [ct for ct in INDIAN_CITIES if ct != c["city"]]
                city = rng.choice(distant_cities)
                amount = round(rng.uniform(50000, 120000), 2)
                channel = "web"
                txn_type = "transfer"
                
            elif pattern_type == "burst_velocity":
                # Rapid successive transaction simulation
                amount = round(rng.uniform(35000, 85000), 2)
                channel = "mobile"
                txn_type = "transfer"
                merchant = "Unregistered Peer Remittance"
        
        transactions.append({
            "transaction_id": f"TXN-{uuid.uuid4().hex[:10].upper()}",
            "user_id": user_id,
            "amount": amount,
            "transaction_type": txn_type,
            "channel": channel,
            "city": city,
            "transaction_time": txn_time,
            "hour": txn_time.hour,
            "status": "flagged" if is_synthetic_fraud else "settled",
            "merchant": merchant,
            "is_synthetic_fraud": is_synthetic_fraud
        })
        
    return customers, transactions


def seed_database(num_customers=120, num_transactions=2000):
    """
    Populates SQLite/PostgreSQL with synthetic dataset,
    runs FraudDetectionEngine, and seeds initial high-profile cases.
    """
    from backend.app.services.fraud_detector import FraudDetectionEngine
    
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Clear existing records
        db.query(Approval).delete()
        db.query(AgentLog).delete()
        db.query(Investigation).delete()
        db.query(RiskAssessment).delete()
        db.query(Transaction).delete()
        db.query(Customer).delete()
        db.commit()
        
        cust_data, txn_data = generate_synthetic_ecosystem(
            num_customers=num_customers,
            num_transactions=num_transactions
        )
        
        # Save customers
        for c in cust_data:
            db.add(Customer(**c))
        db.commit()
        
        # Convert transactions to DataFrame for Isolation Forest detection
        df = pd.DataFrame(txn_data)
        
        # Train and detect anomalies
        detector = FraudDetectionEngine(contamination=0.05)
        df_scored = detector.detect(df)
        
        # Save transactions and risk assessments
        scored_txns = []
        for _, row in df_scored.iterrows():
            txn = Transaction(
                transaction_id=row["transaction_id"],
                user_id=row["user_id"],
                amount=float(row["amount"]),
                transaction_type=row["transaction_type"],
                channel=row["channel"],
                city=row["city"],
                transaction_time=row["transaction_time"] if isinstance(row["transaction_time"], datetime) else pd.to_datetime(row["transaction_time"]).to_pydatetime(),
                hour=int(row["hour"]),
                status="flagged" if row["risk_level"] in ["High", "Critical"] else "settled",
                merchant=row.get("merchant", "General Merchant"),
                is_synthetic_fraud=int(row.get("is_synthetic_fraud", 0))
            )
            db.add(txn)
            
            assessment = RiskAssessment(
                transaction_id=row["transaction_id"],
                anomaly_score=float(row["anomaly_score"]),
                risk_score=float(row["risk_score"]),
                risk_level=str(row["risk_level"]),
                is_anomaly=bool(row["is_anomaly"])
            )
            assessment.set_factors(row.get("risk_reasons", []))
            db.add(assessment)
            
        db.commit()
        
        # Seed 3 realistic initial investigation cases so the cases page is live immediately
        critical_txns = (
            db.query(Transaction)
            .join(RiskAssessment)
            .filter(RiskAssessment.risk_level.in_(["Critical", "High"]))
            .order_by(RiskAssessment.risk_score.desc())
            .limit(4)
            .all()
        )
        
        for idx, txn in enumerate(critical_txns, 1):
            case_id = f"CASE-2026-{1000 + idx}"
            ra = txn.risk_assessment
            cust = txn.customer
            
            reasons = ra.get_factors() if ra else []
            obs = [
                f"Transaction amount of ₹{txn.amount:,.2f} on channel '{txn.channel}'.",
                f"Executed at {txn.hour:02d}:30 hours local time ({txn.city}).",
                f"Customer baseline range is typically ₹{cust.typical_min_amount:,.2f} to ₹{cust.typical_max_amount:,.2f}.",
                f"Historical deviation: amount is {txn.amount / max(cust.typical_max_amount, 1):.1f}x above customer's normal ceiling."
            ]
            
            ev = [
                f"Isolation Forest identified feature anomaly with raw score {ra.anomaly_score:.4f}.",
                f"Digital payment channel '{txn.channel}' deviates from usual customer profile.",
                f"Merchant target: '{txn.merchant}' is categorized as elevated risk.",
                "Late-night transaction timing indicator (01:00-05:00 UTC) triggered."
            ]
            
            recommendation = (
                f"Recommend temporary freeze of digital transfer privileges for {cust.name} ({cust.user_id}) "
                f"and immediate two-factor out-of-band verification regarding transaction {txn.transaction_id}."
            )
            
            next_steps = [
                "Contact customer via registered phone for voice verification.",
                "Review device fingerprint and IP address logs from session.",
                "Place 24-hour settlement hold on beneficiary merchant account.",
                "If unverified within 12 hours, file internal Suspicious Activity Report (SAR)."
            ]
            
            status = "PENDING" if idx <= 2 else ("APPROVED_FRAUD" if idx == 3 else "REJECTED_LEGITIMATE")
            
            inv = Investigation(
                id=case_id,
                transaction_id=txn.transaction_id,
                user_id=txn.user_id,
                title=f"Suspicious {txn.transaction_type.capitalize()} of ₹{txn.amount:,.2f} - {cust.name}",
                status=status,
                priority="CRITICAL" if ra.risk_level == "Critical" else "HIGH",
                risk_score=ra.risk_score,
                ai_summary=(
                    f"AI Agent detected high-risk deviation in transaction {txn.transaction_id}. "
                    f"Customer {cust.name} exhibited significant amount spike and unusual execution timing."
                ),
                recommendation=recommendation,
                assigned_analyst="FraudTrace AI Autonomous Agent"
            )
            inv.set_observations(obs)
            inv.set_evidence(ev)
            inv.set_next_steps(next_steps)
            db.add(inv)
            
            # Add synthetic agent execution log
            log1 = AgentLog(
                investigation_id=case_id,
                transaction_id=txn.transaction_id,
                step_index=1,
                action_type="TOOL_CALL",
                tool_name="get_transaction",
                tool_input_json=f'{{"transaction_id": "{txn.transaction_id}"}}',
                tool_output_json=f'{{"amount": {txn.amount}, "channel": "{txn.channel}", "hour": {txn.hour}}}',
                reasoning="Retrieved transaction metadata for forensic inspection."
            )
            log2 = AgentLog(
                investigation_id=case_id,
                transaction_id=txn.transaction_id,
                step_index=2,
                action_type="TOOL_CALL",
                tool_name="get_customer_history",
                tool_input_json=f'{{"user_id": "{txn.user_id}"}}',
                tool_output_json=f'{{"baseline_max": {cust.typical_max_amount}, "typical_channel": "{cust.typical_channel}"}}',
                reasoning="Cross-referenced customer historical baseline to identify behavioral deviations."
            )
            log3 = AgentLog(
                investigation_id=case_id,
                transaction_id=txn.transaction_id,
                step_index=3,
                action_type="TOOL_CALL",
                tool_name="detect_anomalies",
                tool_input_json=f'{{"transaction_id": "{txn.transaction_id}"}}',
                tool_output_json=f'{{"anomaly_score": {ra.anomaly_score}, "risk_score": {ra.risk_score}}}',
                reasoning="Ran Isolation Forest anomaly detection engine."
            )
            db.add_all([log1, log2, log3])
            
            # If approved or rejected, add approval decision
            if status == "APPROVED_FRAUD":
                appr = Approval(
                    investigation_id=case_id,
                    decision="APPROVED_FRAUD",
                    analyst_name="Vansh Raut (Lead Fraud Analyst)",
                    analyst_notes="Confirmed unauthorized account takeover attempt. Card frozen and customer notified.",
                    action_taken="ACCOUNT_RESTRICTED"
                )
                db.add(appr)
            elif status == "REJECTED_LEGITIMATE":
                appr = Approval(
                    investigation_id=case_id,
                    decision="REJECTED_LEGITIMATE",
                    analyst_name="Vansh Raut (Lead Fraud Analyst)",
                    analyst_notes="Customer confirmed purchase of electronics during midnight sale via SMS OTP.",
                    action_taken="WHITELISTED"
                )
                db.add(appr)
                
        db.commit()
        
        # Also save raw CSV for reference as requested
        csv_path = Path("data/raw/transactions.csv")
        csv_path.parent.mkdir(parents=True, exist_ok=True)
        df_scored.to_csv(csv_path, index=False)
        
        return {
            "status": "success",
            "customers_count": len(cust_data),
            "transactions_count": len(df_scored),
            "anomalies_detected": int(df_scored["is_anomaly"].sum()),
            "cases_seeded": len(critical_txns)
        }
    finally:
        db.close()


if __name__ == "__main__":
    result = seed_database()
    print("Database seeded successfully:", result)
