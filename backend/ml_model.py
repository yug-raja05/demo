import os
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier

MODEL_PATH = os.path.join(os.path.dirname(__file__), "rf_classifier.pkl")

def generate_synthetic_ml_dataset(num_samples=600):
    """
    Generates a synthetic dataset to train the Random Forest Classifier.
    Features: [Similarity Score, Missing Objects, New Objects, Feature Match Score, Image Difference Area]
    Classes: 'Verified', 'Partially Verified', 'Failed'
    """
    np.random.seed(42)
    X = []
    y = []
    
    samples_per_class = num_samples // 3
    
    # Class 0: Verified (Perfect or near perfect match)
    for _ in range(samples_per_class):
        # Similarity score high: 0.75 to 0.98
        sim = np.random.uniform(0.75, 0.98)
        # Missing objects: 0
        missing = 0
        # New objects: 0 or 1 (minor noise)
        new_objs = np.random.choice([0, 1], p=[0.8, 0.2])
        # Feature matches high: 80 to 400
        feat_match = np.random.randint(80, 400)
        # Diff area low: 0.01 to 0.20
        diff = np.random.uniform(0.01, 0.20)
        
        X.append([sim, missing, new_objs, feat_match, diff])
        y.append("Verified")
        
    # Class 1: Partially Verified (Minor issues, e.g. 1 missing object)
    for _ in range(samples_per_class):
        # Similarity score medium: 0.50 to 0.75
        sim = np.random.uniform(0.50, 0.75)
        # Missing objects: 1 or 2
        missing = np.random.choice([1, 2], p=[0.7, 0.3])
        # New objects: 0, 1, or 2
        new_objs = np.random.randint(0, 3)
        # Feature matches medium: 30 to 120
        feat_match = np.random.randint(30, 120)
        # Diff area medium: 0.15 to 0.45
        diff = np.random.uniform(0.15, 0.45)
        
        X.append([sim, missing, new_objs, feat_match, diff])
        y.append("Partially Verified")
        
    # Class 2: Failed (Significant issues, missing key objects, very low similarity)
    for _ in range(samples_per_class):
        # Similarity score low: 0.10 to 0.52
        sim = np.random.uniform(0.10, 0.52)
        # Missing objects: 2 or more
        missing = np.random.randint(2, 5)
        # New objects: 0 to 4
        new_objs = np.random.randint(0, 5)
        # Feature matches low: 0 to 45
        feat_match = np.random.randint(0, 45)
        # Diff area high: 0.35 to 0.85
        diff = np.random.uniform(0.35, 0.85)
        
        X.append([sim, missing, new_objs, feat_match, diff])
        y.append("Failed")
        
    return np.array(X), np.array(y)

def train_ml_model(force_retrain=False):
    """Trains a Random Forest classifier and saves it to a pickle file."""
    if os.path.exists(MODEL_PATH) and not force_retrain:
        print("Model already exists at:", MODEL_PATH)
        return True
        
    print("Training Random Forest classifier for hospital audit image classification...")
    X, y = generate_synthetic_ml_dataset()
    
    # Train Random Forest Classifier
    rf = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42)
    rf.fit(X, y)
    
    # Save model
    joblib.dump(rf, MODEL_PATH)
    print("Model trained and saved to:", MODEL_PATH)
    return True

def predict_verification_status(metrics):
    """
    Predicts the verification status based on CV metrics:
    metrics = {
        'similarity_score': float,
        'missing_objects': int,
        'new_objects': int,
        'feature_match_score': int,
        'diff_area': float
    }
    """
    # Ensure model is trained
    if not os.path.exists(MODEL_PATH):
        train_ml_model()
        
    rf = joblib.load(MODEL_PATH)
    
    # Extract features in correct order
    features = [
        metrics["similarity_score"],
        metrics["missing_objects"],
        metrics["new_objects"],
        metrics["feature_match_score"],
        metrics["diff_area"]
    ]
    
    # Reshape for prediction
    features_arr = np.array(features).reshape(1, -1)
    
    # Predict status
    status = rf.predict(features_arr)[0]
    
    # Get probability mapping for debugging/confidence score if needed
    probs = rf.predict_proba(features_arr)[0]
    classes = rf.classes_
    prob_dict = {cls: float(prob) for cls, prob in zip(classes, probs)}
    
    return status, prob_dict
