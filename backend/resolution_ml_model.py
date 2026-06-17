"""
Train, evaluate, and persist Resolution Success Prediction models.
Compares Random Forest, XGBoost, and Logistic Regression.
"""
import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)
from xgboost import XGBClassifier

from resolution_data_engine import (
    prepare_training_dataset,
    CATEGORICAL_FEATURES,
    NUMERIC_FEATURES,
    TARGET_LABELS,
)

MODEL_DIR = os.path.dirname(__file__)
BEST_MODEL_PATH = os.path.join(MODEL_DIR, "resolution_best_model.pkl")
METRICS_PATH = os.path.join(MODEL_DIR, "resolution_model_metrics.json")
IMPORTANCE_PATH = os.path.join(MODEL_DIR, "resolution_feature_importance.json")
LABEL_ENCODER_PATH = os.path.join(MODEL_DIR, "resolution_label_encoder.pkl")

_model_cache = None
_label_encoder_cache = None
_metrics_cache = None


def _build_preprocessor():
    return ColumnTransformer(
        transformers=[
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                CATEGORICAL_FEATURES,
            ),
            ("num", StandardScaler(), NUMERIC_FEATURES),
        ]
    )


def _build_models():
    return {
        "Random Forest": RandomForestClassifier(
            n_estimators=200,
            max_depth=12,
            min_samples_split=5,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        ),
        "XGBoost": XGBClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            objective="multi:softprob",
            eval_metric="mlogloss",
            random_state=42,
            n_jobs=-1,
        ),
        "Logistic Regression": LogisticRegression(
            max_iter=1000,
            class_weight="balanced",
            multi_class="multinomial",
            random_state=42,
        ),
    }


def _extract_feature_importance(model, preprocessor, feature_cols):
    """Extract feature importance from tree-based models or coefficients."""
    cat_encoder = preprocessor.named_transformers_["cat"]
    cat_names = list(cat_encoder.get_feature_names_out(CATEGORICAL_FEATURES))
    all_names = cat_names + NUMERIC_FEATURES

    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
    elif hasattr(model, "coef_"):
        importances = np.mean(np.abs(model.coef_), axis=0)
    else:
        return []

    pairs = sorted(zip(all_names, importances), key=lambda x: x[1], reverse=True)
    return [{"feature": name, "importance": round(float(imp), 4)} for name, imp in pairs[:20]]


def train_resolution_models(force_retrain=False):
    """Train all models, select best by macro F1, persist artifacts."""
    global _model_cache, _label_encoder_cache, _metrics_cache

    if not force_retrain and os.path.exists(BEST_MODEL_PATH) and os.path.exists(METRICS_PATH):
        print("Resolution prediction model already trained.")
        return load_metrics()

    print("Training Resolution Success Prediction models...")
    dataset = prepare_training_dataset()
    X, y = dataset["X"], dataset["y"]

    label_encoder = LabelEncoder()
    label_encoder.fit(TARGET_LABELS)
    y_encoded = label_encoder.transform(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )

    model_results = {}
    best_name = None
    best_pipeline = None
    best_f1 = -1.0

    for name, estimator in _build_models().items():
        pipeline = Pipeline([
            ("preprocessor", _build_preprocessor()),
            ("classifier", estimator),
        ])
        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)

        metrics = {
            "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
            "precision": round(float(precision_score(y_test, y_pred, average="macro", zero_division=0)), 4),
            "recall": round(float(recall_score(y_test, y_pred, average="macro", zero_division=0)), 4),
            "f1_score": round(float(f1_score(y_test, y_pred, average="macro", zero_division=0)), 4),
            "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
            "classification_report": classification_report(
                y_test, y_pred, target_names=label_encoder.classes_, output_dict=True, zero_division=0
            ),
        }
        model_results[name] = metrics

        if metrics["f1_score"] > best_f1:
            best_f1 = metrics["f1_score"]
            best_name = name
            best_pipeline = pipeline

    preprocessor = best_pipeline.named_steps["preprocessor"]
    classifier = best_pipeline.named_steps["classifier"]
    feature_importance = _extract_feature_importance(
        classifier, preprocessor, dataset["feature_cols"]
    )

    # Retrain best model on full dataset
    best_pipeline.fit(X, y_encoded)

    joblib.dump(best_pipeline, BEST_MODEL_PATH)
    joblib.dump(label_encoder, LABEL_ENCODER_PATH)

    full_metrics = {
        "best_model": best_name,
        "models": model_results,
        "target_distribution": dataset["target_distribution"],
        "correlation": dataset["correlation"],
        "feature_importance": feature_importance,
        "training_samples": len(X),
        "resolved_samples": len(dataset["resolved"]),
        "classes": list(label_encoder.classes_),
    }

    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(full_metrics, f, indent=2)

    with open(IMPORTANCE_PATH, "w", encoding="utf-8") as f:
        json.dump(feature_importance, f, indent=2)

    _model_cache = best_pipeline
    _label_encoder_cache = label_encoder
    _metrics_cache = full_metrics

    print(f"Best model: {best_name} (F1={best_f1:.4f})")
    print(f"Model saved to: {BEST_MODEL_PATH}")
    return full_metrics


def load_model():
    global _model_cache, _label_encoder_cache
    if _model_cache is None:
        if os.path.exists(BEST_MODEL_PATH):
            _model_cache = joblib.load(BEST_MODEL_PATH)
        if os.path.exists(LABEL_ENCODER_PATH):
            _label_encoder_cache = joblib.load(LABEL_ENCODER_PATH)
    return _model_cache, _label_encoder_cache


def load_metrics():
    global _metrics_cache
    if _metrics_cache is None and os.path.exists(METRICS_PATH):
        with open(METRICS_PATH, "r", encoding="utf-8") as f:
            _metrics_cache = json.load(f)
    return _metrics_cache


def predict_proba(features_df):
    """Return class labels and probability dict for feature rows."""
    model, label_encoder = load_model()
    if model is None or label_encoder is None:
        raise RuntimeError("Resolution model not trained. Call train_resolution_models() first.")

    proba = model.predict_proba(features_df)
    preds = model.predict(features_df)

    results = []
    for i, pred_idx in enumerate(preds):
        label = label_encoder.inverse_transform([pred_idx])[0]
        prob_dict = {
            label_encoder.inverse_transform([j])[0]: round(float(proba[i][j]), 4)
            for j in range(len(label_encoder.classes_))
        }
        success_prob = prob_dict.get("Successful Resolution", 0.0)
        reopen_prob = prob_dict.get("High Reopen Risk", 0.0)
        moderate_prob = prob_dict.get("Moderate Risk", 0.0)

        results.append({
            "prediction": label,
            "success_probability": round(success_prob * 100, 1),
            "reopen_probability": round((reopen_prob + moderate_prob * 0.5) * 100, 1),
            "risk_score": round(reopen_prob * 100 + moderate_prob * 40, 1),
            "probabilities": {k: round(v * 100, 1) for k, v in prob_dict.items()},
        })
    return results
