import os
import uuid
import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

import db
import seeder
from vision_engine import analyze_images
from ml_model import predict_verification_status, train_ml_model
from explanation_engine import generate_explanation
from resolution_prediction_engine import (
    generate_all_predictions,
    predict_single_issue,
    build_dashboard_data,
)
from resolution_ml_model import train_resolution_models, load_metrics

app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin React frontend requests

# Config folders
UPLOAD_FOLDER = os.path.join(app.root_path, "static")
STATIC_REF_DIR = os.path.join(UPLOAD_FOLDER, "reference")
STATIC_PROOF_DIR = os.path.join(UPLOAD_FOLDER, "proofs")

os.makedirs(STATIC_REF_DIR, exist_ok=True)
os.makedirs(STATIC_PROOF_DIR, exist_ok=True)

# ----------------- SERVER INITIALIZATION -----------------
# Seed database, generate reference images, and train ML model on start
try:
    print("Initializing Hospital AI Verification Backend...")
    db.seed_database()
    seeder.seed_reference_images()
    train_ml_model(force_retrain=False)
    # Train resolution success prediction model and seed MongoDB
    res_result = generate_all_predictions(force_retrain=False)
    db.save_resolution_predictions(res_result["predictions"])
    db.save_resolution_model_metrics(res_result["metrics"])
    print(f"Resolution prediction: {len(res_result['predictions'])} issues scored.")
    print("Backend initialization complete!")
except Exception as e:
    print(f"Error during backend initialization: {e}")

# ----------------- AUTHENTICATION -----------------
@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.json
    if not data or not data.get("name") or not data.get("email") or not data.get("password") or not data.get("role"):
        return jsonify({"success": False, "message": "Missing required fields"}), 400
    
    success = db.create_user(
        name=data.get("name"),
        email=data.get("email"),
        password=data.get("password"),
        role=data.get("role")
    )
    if success:
        return jsonify({"success": True, "message": "User registered successfully!"}), 201
    else:
        return jsonify({"success": False, "message": "User with this email already exists."}), 409

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json
    if not data or not data.get("email") or not data.get("password"):
        return jsonify({"success": False, "message": "Missing email or password"}), 400
    
    email = db.normalize_email(data.get("email"))
    password = (data.get("password") or "").strip()
    
    user = db.get_user_by_email(email)
    if user and user["password"] == password:
        return jsonify({
            "success": True,
            "user": {
                "name": user["name"],
                "email": user["email"],
                "role": user["role"]
            }
        })
    else:
        return jsonify({"success": False, "message": "Invalid email or password."}), 401

# ----------------- CHECKLISTS -----------------
@app.route("/api/checklists", methods=["GET", "POST"])
def checklists():
    if request.method == "POST":
        data = request.form
        name = data.get("name")
        department = data.get("department")
        ward = data.get("ward")
        floor = data.get("floor")
        expected_objects_raw = data.get("expected_objects", "")
        
        if not name or not department or not ward or not floor or not expected_objects_raw:
            return jsonify({"success": False, "message": "Missing required checklist details"}), 400
            
        expected_objects = [obj.strip().lower() for obj in expected_objects_raw.split(",") if obj.strip()]
        
        # Save checklist to DB
        checklist_id = db.create_checklist(name, department, ward, floor, expected_objects)
        
        # Check if reference image was uploaded
        if "reference_image" in request.files:
            file = request.files["reference_image"]
            if file.filename != "":
                filename = f"ref_{checklist_id}.jpg"
                filepath = os.path.join(STATIC_REF_DIR, filename)
                file.save(filepath)
                url = f"/static/reference/{filename}"
                db.save_reference_image(checklist_id, url, expected_objects)
        else:
            # Generate a blank fallback image if none uploaded
            import numpy as np
            fallback_img = np.ones((400, 400, 3), dtype=np.uint8) * 200
            cv2 = seeder.cv2 # use cv2 from seeder
            cv2.putText(fallback_img, f"Ref: {name[:20]}", (50, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,0,0), 2)
            filename = f"ref_{checklist_id}.jpg"
            filepath = os.path.join(STATIC_REF_DIR, filename)
            cv2.imwrite(filepath, fallback_img)
            url = f"/static/reference/{filename}"
            db.save_reference_image(checklist_id, url, expected_objects)
            
        return jsonify({"success": True, "message": "Checklist and reference image saved successfully!", "checklist_id": checklist_id}), 201
    else:
        # GET all checklists
        checklists = db.get_all_checklists()
        # Add reference image URLs
        for chk in checklists:
            ref = db.get_reference_image_by_checklist(chk["_id"])
            if ref:
                chk["reference_image_url"] = ref["image_url"]
            else:
                chk["reference_image_url"] = None
        return jsonify({"success": True, "checklists": checklists})

@app.route("/api/checklists/upload-reference", methods=["POST"])
def upload_reference():
    if "image" not in request.files or "checklist_id" not in request.form:
        return jsonify({"success": False, "message": "Missing checklist ID or image file"}), 400
        
    checklist_id = request.form["checklist_id"]
    file = request.files["image"]
    
    checklist = db.get_checklist_by_id(checklist_id)
    if not checklist:
        return jsonify({"success": False, "message": "Checklist not found"}), 404
        
    if file.filename == "":
        return jsonify({"success": False, "message": "No selected file"}), 400
        
    filename = f"ref_{checklist_id}.jpg"
    filepath = os.path.join(STATIC_REF_DIR, filename)
    file.save(filepath)
    
    url = f"/static/reference/{filename}"
    db.save_reference_image(checklist_id, url, checklist.get("expected_objects", []))
    
    return jsonify({"success": True, "message": "Reference image uploaded successfully!", "image_url": url})

# ----------------- IMAGE VERIFICATION -----------------
@app.route("/api/verify", methods=["POST"])
def verify_proof():
    if "image" not in request.files or "checklist_id" not in request.form or "inspector_id" not in request.form:
        return jsonify({"success": False, "message": "Missing proof image, checklist ID, or inspector ID"}), 400
        
    checklist_id = request.form["checklist_id"]
    inspector_id = request.form["inspector_id"]
    file = request.files["image"]
    
    if file.filename == "":
        return jsonify({"success": False, "message": "No selected file"}), 400
        
    checklist = db.get_checklist_by_id(checklist_id)
    if not checklist:
        return jsonify({"success": False, "message": "Checklist not found"}), 404
        
    # Get reference image details
    ref_image_rec = db.get_reference_image_by_checklist(checklist_id)
    if not ref_image_rec:
        return jsonify({"success": False, "message": "No reference image stored for this checklist. Please upload a reference image first."}), 400
        
    # Build absolute paths for comparison
    ref_image_path = os.path.join(app.root_path, ref_image_rec["image_url"].lstrip("/"))
    if not os.path.exists(ref_image_path):
        return jsonify({"success": False, "message": f"Reference image file not found on server at {ref_image_rec['image_url']}"}), 500
        
    # Generate unique filenames for uploaded proof and verification visuals
    unique_id = uuid.uuid4().hex[:12]
    proof_filename = f"proof_{unique_id}.jpg"
    proof_filepath = os.path.join(STATIC_PROOF_DIR, proof_filename)
    
    annotated_filename = f"annotated_{unique_id}.jpg"
    annotated_filepath = os.path.join(STATIC_PROOF_DIR, annotated_filename)
    
    diff_filename = f"diff_{unique_id}.jpg"
    diff_filepath = os.path.join(STATIC_PROOF_DIR, diff_filename)
    
    # Save the raw proof file temporarily
    file.save(proof_filepath)
    
    # ----------------- CV ANALYSIS PIPELINE -----------------
    try:
        # Expected objects for checklist
        expected_objects = checklist.get("expected_objects", [])
        
        # Analyze images
        metrics = analyze_images(
            ref_img_path=ref_image_path,
            proof_img_path=proof_filepath,
            expected_objects=expected_objects,
            output_proof_path=annotated_filepath,
            output_diff_path=diff_filepath
        )
        
        # We replace the raw proof with the annotated bounding-box version, or keep both.
        # Let's save the URL to the annotated version for display.
        proof_image_url = f"/static/proofs/{annotated_filename}"
        diff_image_url = f"/static/proofs/{diff_filename}"
        
        # Save proof image record in DB
        proof_image_id = db.save_proof_image(checklist_id, proof_image_url, inspector_id)
        
        # ----------------- ML STATUS CLASSIFICATION -----------------
        status, prob_dict = predict_verification_status(metrics)
        
        # ----------------- EXPLANATION GENERATION -----------------
        explanation_data = generate_explanation(
            checklist_name=checklist["name"],
            expected_objects=expected_objects,
            metrics=metrics,
            status=status
        )
        
        # ----------------- SAVE RESULTS & ALERTS -----------------
        res_id = db.save_verification_result(
            checklist_id=checklist_id,
            proof_image_id=proof_image_id,
            metrics=metrics,
            status=status,
            explanation=explanation_data,
            alert_level=explanation_data["alert_level"],
            diff_image_url=diff_image_url
        )
        
        # Trigger Alerts if alert level is Warning or Supervisor
        if explanation_data["alert_level"] != "none":
            db.create_alert(
                verification_id=res_id,
                checklist_name=checklist["name"],
                department=checklist["department"],
                ward=checklist["ward"],
                floor=checklist["floor"],
                similarity_score=metrics["similarity_score"],
                alert_level=explanation_data["alert_level"],
                message=explanation_data["alert_message"]
            )
            
        # Compile response
        response = {
            "success": True,
            "verification_id": res_id,
            "status": status,
            "similarity_score": float(metrics["similarity_score"]),
            "feature_matches": int(metrics["feature_match_score"]),
            "diff_area_percentage": float(metrics["diff_area"] * 100.0),
            "explanation_bullets": explanation_data["explanation_list"],
            "explanation_summary": {
                "expected": expected_objects,
                "detected": [d["name"] for d in metrics["detected_objects"]],
                "missing": metrics["missing_list"],
                "added": metrics["new_list"]
            },
            # Debug fields: raw detections from reference and proof images
            "debug_ref_detections": metrics.get("ref_detected_objects", []),
            "debug_proof_detections": metrics.get("detected_objects", []),
            "alert_level": explanation_data["alert_level"],
            "alert_triggered": explanation_data["alert_level"] != "none",
            "reference_image_url": ref_image_rec["image_url"],
            "proof_image_url": proof_image_url,
            "diff_mask_url": diff_image_url,
            "diff_image_url": diff_image_url,
            "checklist_name": checklist["name"],
            "department": checklist["department"],
            "ward": checklist["ward"],
            "floor": checklist["floor"],
            "inspector_id": inspector_id,
            "inspector_name": db.get_user_by_email(inspector_id).get("name") if db.get_user_by_email(inspector_id) else inspector_id,
            "verification_time": datetime.datetime.utcnow().isoformat(),
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
        return jsonify(response), 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": f"Error running AI verification pipeline: {str(e)}"}), 500

# ----------------- AUDIT HISTORY & STATS -----------------
@app.route("/api/audit-history", methods=["GET"])
def audit_history():
    records = db.get_verification_results()
    return jsonify({"success": True, "records": records})

@app.route("/api/alerts", methods=["GET"])
def alerts():
    all_alerts = db.get_all_alerts()
    return jsonify({"success": True, "alerts": all_alerts})

@app.route("/api/alerts/<alert_id>/resolve", methods=["POST"])
def resolve_alert(alert_id):
    success = db.resolve_alert(alert_id)
    if success:
        return jsonify({"success": True, "message": "Alert marked as resolved."})
    else:
        return jsonify({"success": False, "message": "Failed to resolve alert."}), 400

@app.route("/api/dashboard-stats", methods=["GET"])
def dashboard_stats():
    stats = db.get_dashboard_stats()
    return jsonify({"success": True, "stats": stats})

# ----------------- RESOLUTION SUCCESS PREDICTION -----------------
@app.route("/api/resolution/train", methods=["POST"])
def resolution_train():
    try:
        result = generate_all_predictions(force_retrain=True)
        db.save_resolution_predictions(result["predictions"])
        db.save_resolution_model_metrics(result["metrics"])
        return jsonify({
            "success": True,
            "message": "Models retrained successfully.",
            "best_model": result["metrics"].get("best_model"),
            "training_samples": result["metrics"].get("training_samples"),
            "predictions_count": len(result["predictions"]),
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/api/resolution/model-metrics", methods=["GET"])
def resolution_model_metrics():
    metrics = db.get_resolution_model_metrics() or load_metrics()
    if not metrics:
        return jsonify({"success": False, "message": "Model not trained yet."}), 404
    return jsonify({"success": True, "metrics": metrics})

@app.route("/api/resolution/dashboard", methods=["GET"])
def resolution_dashboard():
    predictions = db.get_resolution_predictions()
    metrics = db.get_resolution_model_metrics() or load_metrics()
    if not predictions:
        result = generate_all_predictions(force_retrain=False)
        predictions = result["predictions"]
        db.save_resolution_predictions(predictions)
        metrics = result["metrics"]
    dashboard = build_dashboard_data(predictions, metrics)
    return jsonify({"success": True, "dashboard": dashboard})

@app.route("/api/resolution/predictions", methods=["GET"])
def resolution_predictions():
    predictions = db.get_resolution_predictions()
    if not predictions:
        result = generate_all_predictions(force_retrain=False)
        predictions = result["predictions"]
        db.save_resolution_predictions(predictions)
    return jsonify({"success": True, "predictions": predictions, "count": len(predictions)})

@app.route("/api/resolution/predict", methods=["POST"])
def resolution_predict():
    data = request.json
    if not data:
        return jsonify({"success": False, "message": "Missing request body"}), 400
    try:
        result = predict_single_issue(data)
        return jsonify({"success": True, "prediction": result})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/api/resolution/insights", methods=["GET"])
def resolution_insights():
    predictions = db.get_resolution_predictions()
    metrics = db.get_resolution_model_metrics() or load_metrics()
    dashboard = build_dashboard_data(predictions, metrics)
    return jsonify({
        "success": True,
        "insights": dashboard.get("insights", []),
        "top_risk_factors": dashboard.get("top_risk_factors", []),
    })

@app.route("/api/resolution/feature-importance", methods=["GET"])
def resolution_feature_importance():
    metrics = db.get_resolution_model_metrics() or load_metrics()
    if not metrics:
        return jsonify({"success": False, "message": "Model not trained."}), 404
    return jsonify({
        "success": True,
        "feature_importance": metrics.get("feature_importance", []),
        "correlation": metrics.get("correlation", {}),
    })

# Serve Static Uploaded Files
@app.route("/static/reference/<filename>")
def serve_ref_image(filename):
    return send_from_directory(STATIC_REF_DIR, filename)

@app.route("/static/proofs/<filename>")
def serve_proof_image(filename):
    return send_from_directory(STATIC_PROOF_DIR, filename)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
