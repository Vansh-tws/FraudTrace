import numpy as np
import pandas as pd

# Attempt to load scikit-learn IsolationForest; fall back to pure-numpy IsolationForest if DLL policy blocks
SKLEARN_AVAILABLE = False
try:
    from sklearn.ensemble import IsolationForest as SklearnIsolationForest
    SKLEARN_AVAILABLE = True
except Exception:
    SKLEARN_AVAILABLE = False


class PureNumpyIsolationTree:
    """Pure NumPy recursive isolation tree node for sandboxed or zero-dependency environments."""
    def __init__(self, depth=0, max_depth=10):
        self.depth = depth
        self.max_depth = max_depth
        self.split_feature = None
        self.split_val = None
        self.left = None
        self.right = None
        self.size = 0

    def fit(self, X, rng):
        self.size = len(X)
        if self.depth >= self.max_depth or self.size <= 1:
            return self

        # Random feature selection
        n_features = X.shape[1]
        self.split_feature = rng.randint(0, n_features)
        feat_col = X[:, self.split_feature]
        min_v, max_v = feat_col.min(), feat_col.max()
        if min_v == max_v:
            return self

        # Random split between min and max
        self.split_val = rng.uniform(min_v, max_v)
        left_mask = feat_col < self.split_val
        right_mask = ~left_mask

        if np.sum(left_mask) == 0 or np.sum(right_mask) == 0:
            return self

        self.left = PureNumpyIsolationTree(self.depth + 1, self.max_depth).fit(X[left_mask], rng)
        self.right = PureNumpyIsolationTree(self.depth + 1, self.max_depth).fit(X[right_mask], rng)
        return self

    def path_length(self, x):
        if self.left is None or self.right is None:
            return self.depth + self._c(self.size)
        if x[self.split_feature] < self.split_val:
            return self.left.path_length(x)
        return self.right.path_length(x)

    @staticmethod
    def _c(n):
        if n <= 1:
            return 0
        if n == 2:
            return 1
        return 2 * (np.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n)


class PureNumpyIsolationForest:
    """Pure NumPy Isolation Forest matching sklearn API."""
    def __init__(self, n_estimators=100, contamination=0.05, random_state=42):
        self.n_estimators = n_estimators
        self.contamination = contamination
        self.random_state = random_state
        self.trees = []

    def fit(self, X):
        rng = np.random.RandomState(self.random_state)
        n_samples = len(X)
        max_depth = int(np.ceil(np.log2(max(n_samples, 2))))
        subsample_size = min(256, n_samples)

        self.trees = []
        for _ in range(self.n_estimators):
            idx = rng.choice(n_samples, subsample_size, replace=False)
            tree = PureNumpyIsolationTree(max_depth=max_depth).fit(X[idx], rng)
            self.trees.append(tree)
        return self

    def decision_function(self, X):
        # Average path length
        n_samples = len(X)
        c_n = PureNumpyIsolationTree._c(min(256, n_samples))
        paths = np.zeros((n_samples, len(self.trees)))
        for i, tree in enumerate(self.trees):
            for j in range(n_samples):
                paths[j, i] = tree.path_length(X[j])
        avg_paths = paths.mean(axis=1)
        scores = 2.0 ** (-avg_paths / max(c_n, 1e-5))
        # Sklearn convention: higher decision_function means more normal (opposite of anomaly score)
        return 0.5 - scores

    def fit_predict(self, X):
        self.fit(X)
        scores = -self.decision_function(X)
        threshold = np.percentile(scores, 100 * (1 - self.contamination))
        return np.where(scores >= threshold, -1, 1)


class FraudDetectionEngine:
    """
    Unsupervised transaction anomaly detection using Isolation Forest.
    Synthetic fraud labels are never used for model training.
    """

    def __init__(self, contamination=0.05, random_state=42):
        if not 0 < contamination <= 0.5:
            raise ValueError("Contamination must be between 0 and 0.5")

        self.contamination = contamination
        self.random_state = random_state
        
        if SKLEARN_AVAILABLE:
            self.model = SklearnIsolationForest(
                n_estimators=150,
                contamination=contamination,
                random_state=random_state,
                n_jobs=-1
            )
            self.engine_type = "scikit-learn"
        else:
            self.model = PureNumpyIsolationForest(
                n_estimators=100,
                contamination=contamination,
                random_state=random_state
            )
            self.engine_type = "numpy-native"

    def prepare_features(self, df):
        required = [
            "amount",
            "transaction_type",
            "channel",
            "city",
            "transaction_time"
        ]

        missing = [column for column in required if column not in df.columns]
        if missing:
            raise ValueError(f"Missing required columns: {missing}")

        features = pd.DataFrame(index=df.index)

        amount = pd.to_numeric(df["amount"], errors="coerce")
        amount = amount.fillna(amount.median()).fillna(0).clip(lower=0)

        timestamps = pd.to_datetime(
            df["transaction_time"],
            errors="coerce",
            utc=True
        )

        hour = timestamps.dt.hour

        if "hour" in df.columns:
            supplied_hour = pd.to_numeric(df["hour"], errors="coerce")
            hour = hour.fillna(supplied_hour)

        hour = hour.fillna(12)

        features["log_amount"] = np.log1p(amount)
        features["hour"] = hour
        features["night_transaction"] = hour.apply(
            lambda value: int(value <= 5 or value >= 23)
        )
        features["amount_to_median"] = (
            amount / max(float(amount.median()), 1.0)
        )

        categorical = df[
            ["transaction_type", "channel", "city"]
        ].fillna("unknown").astype(str)

        encoded = pd.get_dummies(
            categorical,
            prefix=["type", "channel", "city"],
            dtype=int
        )

        features = pd.concat([features, encoded], axis=1)
        return features.replace([np.inf, -np.inf], 0).fillna(0)

    def detect(self, df):
        """
        Return transactions with anomaly scores, risk levels
        and human-readable explanations.
        """
        if df.empty:
            raise ValueError("Transaction dataset is empty")

        if len(df) < 10:
            raise ValueError("At least 10 transactions are required")

        results = df.copy()
        features = self.prepare_features(results)

        if self.engine_type == "scikit-learn":
            predictions = self.model.fit_predict(features)
            raw_scores = -self.model.decision_function(features)
        else:
            X_mat = features.values
            predictions = self.model.fit_predict(X_mat)
            raw_scores = -self.model.decision_function(X_mat)

        # Convert anomaly strength into a 0-100 percentile score
        risk_scores = (
            pd.Series(raw_scores, index=results.index)
            .rank(pct=True) * 100
        )

        results["anomaly_score"] = np.round(raw_scores, 5)
        results["risk_score"] = np.round(risk_scores, 2)
        results["is_anomaly"] = predictions == -1

        results["risk_level"] = results["risk_score"].apply(self._risk_level)
        results["risk_reasons"] = results.apply(self._explain_transaction, axis=1)

        return results

    @staticmethod
    def _risk_level(score):
        if score >= 98:
            return "Critical"
        elif score >= 90:
            return "High"
        elif score >= 75:
            return "Medium"
        return "Low"

    @staticmethod
    def _explain_transaction(row):
        reasons = []
        amount = float(row["amount"])
        hour = int(row["hour"]) if pd.notna(row["hour"]) else 12

        if amount >= 30000:
            reasons.append("Unusually high transaction amount")

        if hour <= 5 or hour >= 23:
            reasons.append("Transaction occurred during late-night hours")

        if str(row["channel"]).lower() in ["web", "mobile"]:
            if amount >= 20000:
                reasons.append("High-value digital transaction")

        if row.get("is_anomaly") and not reasons:
            reasons.append("Unusual combination of transaction characteristics")

        if not reasons:
            reasons.append("No major suspicious pattern detected")

        return reasons


def analyze_transactions(df, contamination=0.05):
    engine = FraudDetectionEngine(contamination=contamination)
    return engine.detect(df)


def get_detection_summary(results):
    total = len(results)
    suspicious = int(results["is_anomaly"].sum())

    return {
        "total_transactions": total,
        "anomalies_detected": suspicious,
        "normal_transactions": total - suspicious,
        "anomaly_rate": round((suspicious / total) * 100, 2) if total else 0,
        "risk_distribution": {
            str(level): int(count)
            for level, count in results["risk_level"].value_counts().items()
        }
    }
