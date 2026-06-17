"""
Human-readable explanation generator for Resolution Success predictions.
"""


def generate_resolution_explanation(record, features, prediction):
    """Generate bullet-point explanations for a prediction."""
    bullets = []
    pred_label = prediction["prediction"]
    median_completion = 32

    prev_failures = int(features.get("previous_failure_count", 0))
    if prev_failures >= 3:
        bullets.append(f"Similar issue occurred {prev_failures} times previously")
    elif prev_failures >= 1:
        bullets.append(f"Similar issue occurred {prev_failures} time(s) previously in this ward")
    else:
        bullets.append("No repeated failures found in ward history")

    ward_rate = float(features.get("ward_failure_rate", 0))
    if ward_rate > 0.35:
        bullets.append(f"Ward has high historical failure rate ({ward_rate * 100:.0f}%)")
    elif ward_rate > 0.25:
        bullets.append(f"Ward shows elevated historical failure rate ({ward_rate * 100:.0f}%)")
    else:
        bullets.append("Ward has acceptable historical compliance rate")

    completion = float(features.get("completion_time", 30))
    if completion > median_completion + 10:
        bullets.append("Resolution time exceeded average duration")
    elif completion <= median_completion:
        bullets.append("Resolution completed within standard time")
    else:
        bullets.append("Resolution time is within acceptable range")

    compliance = float(features.get("compliance_score", 80))
    if compliance < 65:
        bullets.append("Compliance score below threshold")
    elif compliance >= 85:
        bullets.append("Compliance score improved and meets excellence threshold")
    elif compliance >= 75:
        bullets.append("Compliance score meets acceptable standards")
    else:
        bullets.append("Compliance score is marginally below target")

    risk = float(features.get("risk_score", 50))
    if risk >= 75:
        bullets.append(f"Risk score is critically high ({int(risk)})")
    elif risk >= 60:
        bullets.append(f"Risk score indicates elevated recurrence risk ({int(risk)})")
    else:
        bullets.append(f"Risk score within manageable range ({int(risk)})")

    status = features.get("status", record.get("status", "Pass"))
    if status == "Fail":
        bullets.append("Audit checklist result indicates non-compliance")
    elif status == "Pass":
        bullets.append("Checklist result passed compliance verification")

    if pred_label == "Successful Resolution":
        bullets.append("Similar issues rarely reopen based on historical patterns")
    elif pred_label == "High Reopen Risk":
        bullets.append("Historical patterns suggest high likelihood of recurrence")
    else:
        bullets.append("Issue requires monitoring for potential recurrence")

    recommendations = _generate_recommendations(pred_label, features)

    return {
        "bullets": bullets[:6],
        "summary": _build_summary(record, pred_label, prediction),
        "recommendations": recommendations,
    }


def _build_summary(record, pred_label, prediction):
    ward = record.get("ward", "Unknown Ward")
    issue = record.get("issue_category", record.get("checklist_type", "audit issue"))
    success = prediction["success_probability"]
    reopen = prediction["reopen_probability"]
    return (
        f"Issue in {ward} ({issue}): {pred_label}. "
        f"Success probability {success}%, reopen probability {reopen}%."
    )


def _generate_recommendations(pred_label, features):
    recs = []
    if pred_label == "High Reopen Risk":
        recs.append("Schedule follow-up audit within 7 days")
        recs.append("Assign senior supervisor for resolution verification")
        if float(features.get("compliance_score", 80)) < 70:
            recs.append("Conduct compliance training for assigned staff")
        if int(features.get("previous_failure_count", 0)) >= 2:
            recs.append("Investigate root cause of repeated failures")
    elif pred_label == "Moderate Risk":
        recs.append("Monitor ward for 14 days post-resolution")
        recs.append("Document corrective actions taken")
    else:
        recs.append("Standard monitoring protocol sufficient")
        recs.append("Archive resolution documentation for compliance records")
    return recs
