"""
Batch and single-issue prediction engine for Resolution Success.
"""
import pandas as pd
from resolution_data_engine import (
    prepare_training_dataset,
    record_to_features,
    CATEGORICAL_FEATURES,
    NUMERIC_FEATURES,
)
from resolution_ml_model import predict_proba, load_metrics, train_resolution_models
from resolution_explanation_engine import generate_resolution_explanation


def _features_to_df(feature_dict):
    cols = CATEGORICAL_FEATURES + NUMERIC_FEATURES
    return pd.DataFrame([{c: feature_dict[c] for c in cols}])


def predict_single_issue(record):
    """Predict resolution success for a single audit record."""
    features = record_to_features(record)
    pred = predict_proba(_features_to_df(features))[0]
    explanation = generate_resolution_explanation(record, features, pred)
    return {
        "audit_id": record.get("audit_id", "N/A"),
        "ward": record.get("ward"),
        "department": record.get("department"),
        "checklist_type": features["checklist_type"],
        "issue_category": features["issue_category"],
        **pred,
        "explanation": explanation,
    }


def generate_all_predictions(force_retrain=False):
    """Train model (if needed), predict all resolved issues, return full results."""
    train_resolution_models(force_retrain=force_retrain)
    dataset = prepare_training_dataset()
    resolved = dataset["resolved"]

    feature_cols = CATEGORICAL_FEATURES + NUMERIC_FEATURES
    predictions_df = predict_proba(resolved[feature_cols])

    records = []
    for idx, (_, row) in enumerate(resolved.iterrows()):
        pred = predictions_df[idx]
        record = row.to_dict()
        record["date"] = row["date"].strftime("%Y-%m-%d") if hasattr(row["date"], "strftime") else str(row["date"])
        features = {c: row[c] for c in feature_cols}
        explanation = generate_resolution_explanation(record, features, pred)

        records.append({
            "audit_id": row["audit_id"],
            "date": record["date"],
            "ward": row["ward"],
            "department": row["department"],
            "floor": int(row["floor"]),
            "checklist_type": row["checklist_type"],
            "issue_category": row["issue_category"],
            "status": row["status"],
            "priority": row["priority"],
            "assigned_staff": row["assigned_staff"],
            "completion_time": int(row["completion_time"]),
            "risk_score": int(row["risk_score"]),
            "compliance_score": int(row["compliance_score"]),
            "previous_failure_count": int(row["previous_failure_count"]),
            "escalation_status": row["escalation_status"],
            "actual_resolution_success": row["resolution_success"],
            "prediction": pred["prediction"],
            "success_probability": pred["success_probability"],
            "reopen_probability": pred["reopen_probability"],
            "risk_score_prediction": pred["risk_score"],
            "probabilities": pred["probabilities"],
            "explanation": explanation,
        })

    return {
        "predictions": records,
        "metrics": load_metrics(),
        "dataset_stats": {
            "total_records": len(dataset["engineered"]),
            "resolved_records": len(resolved),
            "target_distribution": dataset["target_distribution"],
        },
    }


def build_dashboard_data(predictions, metrics):
    """Aggregate dashboard statistics from predictions."""
    preds = predictions
    total = len(preds)
    if total == 0:
        return {}

    high_risk = sum(1 for p in preds if p["prediction"] == "High Reopen Risk")
    successful = sum(1 for p in preds if p["prediction"] == "Successful Resolution")
    moderate = sum(1 for p in preds if p["prediction"] == "Moderate Risk")

    # Department-wise risk
    dept_stats = {}
    for p in preds:
        dept = p["department"]
        if dept not in dept_stats:
            dept_stats[dept] = {"total": 0, "high_risk": 0, "successful": 0, "avg_reopen": 0}
        dept_stats[dept]["total"] += 1
        dept_stats[dept]["avg_reopen"] += p["reopen_probability"]
        if p["prediction"] == "High Reopen Risk":
            dept_stats[dept]["high_risk"] += 1
        if p["prediction"] == "Successful Resolution":
            dept_stats[dept]["successful"] += 1

    for dept in dept_stats:
        dept_stats[dept]["avg_reopen"] = round(dept_stats[dept]["avg_reopen"] / dept_stats[dept]["total"], 1)
        dept_stats[dept]["success_rate"] = round(
            dept_stats[dept]["successful"] / dept_stats[dept]["total"] * 100, 1
        )

    # Ward-wise reopen risk
    ward_stats = {}
    for p in preds:
        ward = p["ward"]
        if ward not in ward_stats:
            ward_stats[ward] = {"total": 0, "avg_reopen": 0, "high_risk": 0}
        ward_stats[ward]["total"] += 1
        ward_stats[ward]["avg_reopen"] += p["reopen_probability"]
        if p["prediction"] == "High Reopen Risk":
            ward_stats[ward]["high_risk"] += 1

    for ward in ward_stats:
        ward_stats[ward]["avg_reopen"] = round(ward_stats[ward]["avg_reopen"] / ward_stats[ward]["total"], 1)

    # Monthly trend
    monthly = {}
    for p in preds:
        month = p["date"][:7]
        if month not in monthly:
            monthly[month] = {"successful": 0, "moderate": 0, "high_risk": 0, "total": 0}
        monthly[month]["total"] += 1
        if p["prediction"] == "Successful Resolution":
            monthly[month]["successful"] += 1
        elif p["prediction"] == "Moderate Risk":
            monthly[month]["moderate"] += 1
        else:
            monthly[month]["high_risk"] += 1

    trend = sorted([
        {
            "month": m,
            "successful": v["successful"],
            "moderate": v["moderate"],
            "high_risk": v["high_risk"],
            "success_rate": round(v["successful"] / v["total"] * 100, 1) if v["total"] else 0,
        }
        for m, v in monthly.items()
    ], key=lambda x: x["month"])

    # Predictive insights
    insights = []
    for p in sorted(preds, key=lambda x: x["reopen_probability"], reverse=True)[:5]:
        if p["prediction"] == "High Reopen Risk":
            icon = "🔴"
            msg = f"{p['ward']} {p['issue_category'].lower()} likely to reopen"
        elif p["prediction"] == "Successful Resolution":
            icon = "🟢"
            msg = f"{p['issue_category']} in {p['ward']} successfully resolved"
        else:
            icon = "⚠️"
            msg = f"{p['ward']} {p['checklist_type'].lower()} showing repeated failure pattern"
        insights.append({"icon": icon, "message": msg, "audit_id": p["audit_id"], "reopen_probability": p["reopen_probability"]})

    for p in sorted(preds, key=lambda x: x["success_probability"], reverse=True)[:3]:
        if p["prediction"] == "Successful Resolution":
            insights.append({
                "icon": "🟢",
                "message": f"{p['issue_category']} in {p['ward']} successfully resolved",
                "audit_id": p["audit_id"],
                "reopen_probability": p["reopen_probability"],
            })

    feature_importance = metrics.get("feature_importance", []) if metrics else []

    return {
        "total_resolved_issues": total,
        "high_reopen_risk_issues": high_risk,
        "successful_resolutions": successful,
        "moderate_risk_issues": moderate,
        "resolution_success_rate": round(successful / total * 100, 1) if total else 0,
        "avg_reopen_probability": round(sum(p["reopen_probability"] for p in preds) / total, 1),
        "department_risk": [
            {"department": k, **v} for k, v in sorted(dept_stats.items(), key=lambda x: -x[1]["avg_reopen"])
        ],
        "ward_reopen_risk": [
            {"ward": k, **v} for k, v in sorted(ward_stats.items(), key=lambda x: -x[1]["avg_reopen"])
        ],
        "monthly_trend": trend,
        "top_risk_factors": feature_importance[:10],
        "insights": insights[:8],
        "prediction_distribution": {
            "Successful Resolution": successful,
            "Moderate Risk": moderate,
            "High Reopen Risk": high_risk,
        },
    }
