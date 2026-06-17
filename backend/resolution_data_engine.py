"""
Data loading, cleaning, feature engineering, and target derivation
for Resolution Success Prediction using hospital_audit_500.csv.
"""
import os
import numpy as np
import pandas as pd

CSV_PATH = os.path.join(os.path.dirname(__file__), "hospital_audit_500.csv")

TARGET_LABELS = [
    "Successful Resolution",
    "Moderate Risk",
    "High Reopen Risk",
]

CATEGORICAL_FEATURES = [
    "ward",
    "department",
    "checklist_type",
    "issue_category",
    "priority",
    "assigned_staff",
    "status",
    "escalation_status",
    "image_uploaded",
    "risk_level",
    "compliance_status",
]

NUMERIC_FEATURES = [
    "floor",
    "completion_time",
    "risk_score",
    "compliance_score",
    "previous_failure_count",
    "ward_failure_rate",
    "department_failure_rate",
    "checklist_failure_rate",
    "resolution_time_ratio",
    "month",
]


def _map_issue_category(checklist_type):
    mapping = {
        "Hygiene Audit": "Hygiene Violation",
        "Waste Audit": "Waste Management",
        "Safety Audit": "Equipment Maintenance",
        "Fire Safety Audit": "Fire Safety / Equipment",
    }
    return mapping.get(checklist_type, "General Compliance")


def _map_risk_level(risk_score):
    if risk_score < 40:
        return "Low"
    if risk_score < 60:
        return "Medium"
    if risk_score < 80:
        return "High"
    return "Critical"


def _map_compliance_status(score):
    if score >= 85:
        return "Excellent"
    if score >= 75:
        return "Acceptable"
    if score >= 65:
        return "Below Threshold"
    return "Non-Compliant"


def _compute_resolution_success(row, median_completion):
    """Derive 3-class target from audit outcome signals and historical patterns."""
    score = 0

    if row["status"] == "Pass":
        score += 3
    elif row["status"] == "Pending":
        score += 0
    else:
        score -= 2

    if row["compliance_score"] >= 85:
        score += 2
    elif row["compliance_score"] >= 75:
        score += 1
    elif row["compliance_score"] >= 65:
        score += 0
    else:
        score -= 2

    if row["risk_score"] < 40:
        score += 2
    elif row["risk_score"] < 60:
        score += 1
    elif row["risk_score"] < 75:
        score -= 1
    else:
        score -= 2

    if row["previous_failure_count"] == 0:
        score += 2
    elif row["previous_failure_count"] <= 2:
        score -= 1
    else:
        score -= 3

    if row["completion_time"] <= median_completion:
        score += 1
    else:
        score -= 1

    if row["escalation_status"] == "Closed":
        score += 1

    if row["ward_failure_rate"] > 0.35:
        score -= 1

    if row["image_uploaded"] == "Yes":
        score += 1

    if score >= 5:
        return "Successful Resolution"
    if score <= 0:
        return "High Reopen Risk"
    return "Moderate Risk"


def load_raw_data(csv_path=None):
    path = csv_path or CSV_PATH
    df = pd.read_csv(path)
    df["date"] = pd.to_datetime(df["date"])
    return df


def engineer_features(df):
    """Clean data, engineer features, and derive resolution_success target."""
    data = df.copy().sort_values("date").reset_index(drop=True)

    data["issue_category"] = data["checklist_type"].apply(_map_issue_category)
    data["risk_level"] = data["risk_score"].apply(_map_risk_level)
    data["compliance_status"] = data["compliance_score"].apply(_map_compliance_status)
    data["month"] = data["date"].dt.month

    median_completion = data["completion_time"].median()
    data["resolution_time_ratio"] = data["completion_time"] / max(median_completion, 1)

    # Historical failure counts per ward + checklist type (prior records only)
    data["previous_failure_count"] = 0
    for (ward, checklist), group_idx in data.groupby(["ward", "checklist_type"]).groups.items():
        indices = sorted(group_idx)
        fail_count = 0
        for idx in indices:
            data.at[idx, "previous_failure_count"] = fail_count
            if data.at[idx, "status"] == "Fail":
                fail_count += 1

    # Aggregate failure rates
    ward_rates = data.groupby("ward")["status"].apply(lambda s: (s == "Fail").mean()).to_dict()
    dept_rates = data.groupby("department")["status"].apply(lambda s: (s == "Fail").mean()).to_dict()
    checklist_rates = data.groupby("checklist_type")["status"].apply(lambda s: (s == "Fail").mean()).to_dict()

    data["ward_failure_rate"] = data["ward"].map(ward_rates).round(4)
    data["department_failure_rate"] = data["department"].map(dept_rates).round(4)
    data["checklist_failure_rate"] = data["checklist_type"].map(checklist_rates).round(4)

    data["resolution_success"] = data.apply(
        lambda row: _compute_resolution_success(row, median_completion), axis=1
    )

    return data, median_completion


def get_resolved_issues(df):
    """Issues considered resolved: closed escalation or passed/failed audits (not pending)."""
    return df[df["escalation_status"] == "Closed"].copy()


def get_feature_matrix(df):
    """Return X (features) and y (target) for model training."""
    feature_cols = CATEGORICAL_FEATURES + NUMERIC_FEATURES
    X = df[feature_cols].copy()
    y = df["resolution_success"].copy()
    return X, y, feature_cols


def compute_correlation_analysis(df):
    """Correlation of numeric features with encoded target."""
    numeric_df = df[NUMERIC_FEATURES + ["resolution_success"]].copy()
    label_map = {label: i for i, label in enumerate(TARGET_LABELS)}
    numeric_df["target_encoded"] = numeric_df["resolution_success"].map(label_map)

    corr = numeric_df.corr(numeric_only=True)["target_encoded"].drop("target_encoded", errors="ignore")
    corr = corr.sort_values(key=abs, ascending=False)

    return {
        "correlations": {k: round(float(v), 4) for k, v in corr.items()},
        "top_predictors": [
            {"feature": k, "correlation": round(float(v), 4)}
            for k, v in corr.head(8).items()
        ],
    }


def record_to_features(record):
    """Convert a single audit record dict into model-ready feature dict."""
    median_completion = 32.0
    completion_time = float(record.get("completion_time", record.get("resolution_time", 30)))
    risk_score = float(record.get("risk_score", 50))
    compliance_score = float(record.get("compliance_score", 80))
    checklist_type = record.get("checklist_type", record.get("issue_category", "Hygiene Audit"))

    if "issue_category" in record and "checklist_type" not in record:
        reverse_map = {
            "Hygiene Violation": "Hygiene Audit",
            "Waste Management": "Waste Audit",
            "Equipment Maintenance": "Safety Audit",
            "Fire Safety / Equipment": "Fire Safety Audit",
        }
        checklist_type = reverse_map.get(record["issue_category"], "Hygiene Audit")

    return {
        "ward": record.get("ward", "General Ward"),
        "department": record.get("department", "Patient Care"),
        "checklist_type": checklist_type,
        "issue_category": record.get("issue_category", _map_issue_category(checklist_type)),
        "priority": record.get("priority", "Medium"),
        "assigned_staff": record.get("assigned_staff", "S001"),
        "status": record.get("status", "Pass"),
        "escalation_status": record.get("escalation_status", "Closed"),
        "image_uploaded": record.get("image_uploaded", "No"),
        "risk_level": record.get("risk_level", _map_risk_level(risk_score)),
        "compliance_status": record.get("compliance_status", _map_compliance_status(compliance_score)),
        "floor": int(record.get("floor", 2)),
        "completion_time": completion_time,
        "risk_score": risk_score,
        "compliance_score": compliance_score,
        "previous_failure_count": int(record.get("previous_failure_count", 0)),
        "ward_failure_rate": float(record.get("ward_failure_rate", 0.25)),
        "department_failure_rate": float(record.get("department_failure_rate", 0.25)),
        "checklist_failure_rate": float(record.get("checklist_failure_rate", 0.25)),
        "resolution_time_ratio": completion_time / max(median_completion, 1),
        "month": int(record.get("month", 6)),
    }


def prepare_training_dataset(csv_path=None):
    """Full pipeline: load, engineer, filter resolved, return train-ready data."""
    raw = load_raw_data(csv_path)
    engineered, median_completion = engineer_features(raw)
    resolved = get_resolved_issues(engineered)
    correlation = compute_correlation_analysis(engineered)
    X, y, feature_cols = get_feature_matrix(resolved)

    return {
        "raw": raw,
        "engineered": engineered,
        "resolved": resolved,
        "X": X,
        "y": y,
        "feature_cols": feature_cols,
        "correlation": correlation,
        "median_completion": median_completion,
        "target_distribution": resolved["resolution_success"].value_counts().to_dict(),
    }
