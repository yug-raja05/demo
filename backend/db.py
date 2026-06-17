import copy
import datetime
import os

from bson import ObjectId
from pymongo import MongoClient

# MongoDB Atlas connection string from user
MONGO_URI = "mongodb+srv://Kaibhi:demo@cluster0.nudlczb.mongodb.net/"
DB_NAME = "hospital_audit_ai"


class _InsertOneResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id


class _UpdateResult:
    def __init__(self, matched_count=0, modified_count=0, upserted_id=None):
        self.matched_count = matched_count
        self.modified_count = modified_count
        self.upserted_id = upserted_id


class _MemoryCollection:
    def __init__(self):
        self._docs = []

    @staticmethod
    def _clone(doc):
        return copy.deepcopy(doc)

    @staticmethod
    def _matches(doc, query):
        for key, expected in (query or {}).items():
            if doc.get(key) != expected:
                return False
        return True

    def _iter_matches(self, query):
        return [doc for doc in self._docs if self._matches(doc, query)]

    def insert_one(self, doc):
        stored = self._clone(doc)
        stored.setdefault("_id", ObjectId())
        self._docs.append(stored)
        return _InsertOneResult(stored["_id"])

    def insert_many(self, docs):
        inserted = []
        for doc in docs:
            result = self.insert_one(doc)
            inserted.append(result.inserted_id)
        return inserted

    def find_one(self, query=None, sort=None):
        matches = self._iter_matches(query or {})
        if sort and matches:
            key, direction = sort[0]
            matches.sort(key=lambda doc: doc.get(key), reverse=direction < 0)
        return self._clone(matches[0]) if matches else None

    def find(self, query=None):
        return [self._clone(doc) for doc in self._iter_matches(query or {})]

    def count_documents(self, query=None):
        return len(self._iter_matches(query or {}))

    def delete_many(self, query=None):
        query = query or {}
        self._docs = [doc for doc in self._docs if not self._matches(doc, query)]

    def update_one(self, query, update, upsert=False):
        matches = self._iter_matches(query or {})
        if matches:
            target = matches[0]
            for op, values in (update or {}).items():
                if op == "$set":
                    target.update(values)
                elif op == "$setOnInsert":
                    continue
            return _UpdateResult(matched_count=1, modified_count=1)

        if not upsert:
            return _UpdateResult()

        new_doc = dict(query or {})
        for op, values in (update or {}).items():
            if op in {"$set", "$setOnInsert"}:
                new_doc.update(values)
        new_doc.setdefault("_id", ObjectId())
        self._docs.append(new_doc)
        return _UpdateResult(upserted_id=new_doc["_id"], matched_count=0, modified_count=0)

    def aggregate(self, pipeline):
        if not pipeline:
            return []
        first_stage = pipeline[0] or {}
        group_spec = first_stage.get("$group")
        if not group_spec:
            return []

        avg_field = None
        output_name = None
        for key, value in group_spec.items():
            if key == "_id":
                continue
            if isinstance(value, dict) and "$avg" in value:
                output_name = key
                avg_field = value["$avg"].lstrip("$")
                break

        if not avg_field:
            return []

        values = [doc.get(avg_field) for doc in self._docs if isinstance(doc.get(avg_field), (int, float))]
        if not values:
            return [{output_name: None}]
        return [{output_name: sum(values) / len(values)}]


def _build_memory_database():
    collections = {
        "users": _MemoryCollection(),
        "checklists": _MemoryCollection(),
        "reference_images": _MemoryCollection(),
        "proof_images": _MemoryCollection(),
        "verification_results": _MemoryCollection(),
        "alerts": _MemoryCollection(),
        "resolution_predictions": _MemoryCollection(),
        "resolution_model_metrics": _MemoryCollection(),
    }
    return None, collections, True


def _build_mongo_database():
    client = MongoClient(
        MONGO_URI,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000,
        socketTimeoutMS=20000,
    )
    client.admin.command("ping")
    database = client[DB_NAME]
    collections = {
        "users": database["users"],
        "checklists": database["checklists"],
        "reference_images": database["reference_images"],
        "proof_images": database["proof_images"],
        "verification_results": database["verification_results"],
        "alerts": database["alerts"],
        "resolution_predictions": database["resolution_predictions"],
        "resolution_model_metrics": database["resolution_model_metrics"],
    }
    return client, collections, False


try:
    client, _collections, USING_MEMORY_DB = _build_mongo_database()
except Exception:
    client, _collections, USING_MEMORY_DB = _build_memory_database()

users_col = _collections["users"]
checklists_col = _collections["checklists"]
reference_images_col = _collections["reference_images"]
proof_images_col = _collections["proof_images"]
verification_results_col = _collections["verification_results"]
alerts_col = _collections["alerts"]
resolution_predictions_col = _collections["resolution_predictions"]
resolution_model_metrics_col = _collections["resolution_model_metrics"]

# ----------------- DB INITIALIZATION & SEEDING -----------------
DEFAULT_USERS = [
    {
        "name": "Dr. Sarah Miller",
        "email": "manager@hospital.com",
        "password": "manager123",
        "role": "manager",
    },
    {
        "name": "Inspector Alex Carter",
        "email": "worker@hospital.com",
        "password": "worker123",
        "role": "worker",
    },
]


def ensure_default_users():
    """Always upsert demo accounts so login credentials stay valid."""
    for user in DEFAULT_USERS:
        users_col.update_one(
            {"email": user["email"]},
            {
                "$set": {
                    "name": user["name"],
                    "password": user["password"],
                    "role": user["role"],
                },
                "$setOnInsert": {"created_at": datetime.datetime.utcnow()},
            },
            upsert=True,
        )


def seed_database():
    """Seeds the database with default users and checklists if empty."""
    ensure_default_users()
    if users_col.count_documents({}) <= len(DEFAULT_USERS):
        print("Default users ready (manager@hospital.com / worker@hospital.com).")
        
    # Seed checklists
    if checklists_col.count_documents({}) == 0:
        default_checklists = [
            {
                "name": "ICU Cleanliness Audit",
                "department": "Intensive Care Unit",
                "ward": "ICU Ward A",
                "floor": "3rd Floor",
                "expected_objects": ["bed", "drip stand", "monitor"],
                "created_at": datetime.datetime.utcnow()
            },
            {
                "name": "Biomedical Waste Disposal",
                "department": "Waste Management",
                "ward": "Disposal Center B",
                "floor": "Basement",
                "expected_objects": ["waste bin", "biohazard bag"],
                "created_at": datetime.datetime.utcnow()
            },
            {
                "name": "PPE Availability Check",
                "department": "General Medicine",
                "ward": "Emergency Ward",
                "floor": "1st Floor",
                "expected_objects": ["mask", "helmet", "ppe suit"],
                "created_at": datetime.datetime.utcnow()
            },
            {
                "name": "Hand Hygiene Station Audit",
                "department": "Infection Control",
                "ward": "OPD Corridor",
                "floor": "Ground Floor",
                "expected_objects": ["sanitizer bottle", "soap dispenser", "sink"],
                "created_at": datetime.datetime.utcnow()
            },
            {
                "name": "Fire Extinguisher Positioning",
                "department": "Facilities & Safety",
                "ward": "Corridor West",
                "floor": "2nd Floor",
                "expected_objects": ["fire extinguisher"],
                "created_at": datetime.datetime.utcnow()
            }
        ]
        checklists_col.insert_many(default_checklists)
        print("Seeded default checklists.")

# Auto-seed on import
try:
    seed_database()
except Exception as e:
    print(f"Error seeding database: {e}")

# ----------------- USERS -----------------
def normalize_email(email):
    return (email or "").strip().lower()


def create_user(name, email, password, role):
    email = normalize_email(email)
    if users_col.find_one({"email": email}):
        return False
    user = {
        "name": (name or "").strip(),
        "email": email,
        "password": (password or "").strip(),
        "role": role,
        "created_at": datetime.datetime.utcnow()
    }
    result = users_col.insert_one(user)
    return str(result.inserted_id)

def get_user_by_email(email):
    user = users_col.find_one({"email": normalize_email(email)})
    if user:
        user["_id"] = str(user["_id"])
    return user

# ----------------- CHECKLISTS -----------------
def create_checklist(name, department, ward, floor, expected_objects):
    normalized_aliases = {
        "banches": "benches",
        "peoples": "people",
        "persons": "person",
        "trees": "trees",
        "drip stands": "drip stand",
        "iv stands": "iv stand",
    }

    normalized_objects = []
    for obj in expected_objects:
        cleaned = obj.strip().lower()
        normalized_objects.append(normalized_aliases.get(cleaned, cleaned))

    checklist = {
        "name": name,
        "department": department,
        "ward": ward,
        "floor": floor,
        "expected_objects": normalized_objects,
        "created_at": datetime.datetime.utcnow()
    }
    result = checklists_col.insert_one(checklist)
    return str(result.inserted_id)

def get_all_checklists():
    checklists = list(checklists_col.find({}))
    for c in checklists:
        c["_id"] = str(c["_id"])
    return checklists

def get_checklist_by_id(checklist_id):
    try:
        checklist = checklists_col.find_one({"_id": ObjectId(checklist_id)})
        if checklist:
            checklist["_id"] = str(checklist["_id"])
        return checklist
    except Exception:
        return None

# ----------------- REFERENCE IMAGES -----------------
def save_reference_image(checklist_id, image_url, detected_objects=None):
    ref_image = {
        "checklist_id": checklist_id,
        "image_url": image_url,
        "detected_objects": detected_objects or [],
        "uploaded_at": datetime.datetime.utcnow()
    }
    # Update if exists for this checklist, otherwise insert
    result = reference_images_col.update_one(
        {"checklist_id": checklist_id},
        {"$set": ref_image},
        upsert=True
    )
    return True

def get_reference_image_by_checklist(checklist_id):
    ref = reference_images_col.find_one({"checklist_id": checklist_id})
    if ref:
        ref["_id"] = str(ref["_id"])
    return ref

# ----------------- PROOF IMAGES -----------------
def save_proof_image(checklist_id, image_url, inspector_id):
    proof = {
        "checklist_id": checklist_id,
        "image_url": image_url,
        "inspector_id": inspector_id,
        "uploaded_at": datetime.datetime.utcnow()
    }
    result = proof_images_col.insert_one(proof)
    return str(result.inserted_id)

# ----------------- VERIFICATION RESULTS -----------------
def save_verification_result(checklist_id, proof_image_id, metrics, status, explanation, alert_level, diff_image_url=None):
    result = {
        "checklist_id": checklist_id,
        "proof_image_id": proof_image_id,
        "similarity_score": metrics["similarity_score"],
        "missing_objects": metrics["missing_objects"],
        "new_objects": metrics["new_objects"],
        "feature_match_score": metrics["feature_match_score"],
        "diff_area": metrics["diff_area"],
        "detected_objects": metrics["detected_objects"],
        "missing_list": metrics.get("missing_list", []),
        "new_list": metrics.get("new_list", []),
        "status": status,
        "explanation": explanation,
        "alert_level": alert_level,
        "diff_image_url": diff_image_url,
        "timestamp": datetime.datetime.utcnow()
    }
    insert_result = verification_results_col.insert_one(result)
    return str(insert_result.inserted_id)

def get_verification_results():
    results = list(verification_results_col.find({}))
    for r in results:
        r["_id"] = str(r["_id"])
        # Fetch associated checklist details
        chk = get_checklist_by_id(r["checklist_id"])
        if chk:
            r["checklist_name"] = chk["name"]
            r["department"] = chk["department"]
            r["ward"] = chk["ward"]
            r["floor"] = chk["floor"]
            expected = chk.get("expected_objects", [])
        else:
            expected = []
        
        # Fetch associated proof details
        try:
            proof = proof_images_col.find_one({"_id": ObjectId(r["proof_image_id"])})
            if proof:
                r["proof_image_url"] = proof["image_url"]
                r["inspector_id"] = proof["inspector_id"]
                # Get inspector name
                user = users_col.find_one({"email": proof["inspector_id"]})
                r["inspector_name"] = user["name"] if user else proof["inspector_id"]
        except Exception:
            pass
            
        # Fetch reference image details
        ref = get_reference_image_by_checklist(r["checklist_id"])
        if ref:
            r["reference_image_url"] = ref["image_url"]

        # Normalize fields for frontend UI consumption
        r["verification_time"] = r["timestamp"].isoformat() if "timestamp" in r else None
        r["alert_triggered"] = r.get("alert_level", "none") != "none"
        r["diff_mask_url"] = r.get("diff_image_url")
        r["feature_matches"] = r.get("feature_match_score", 0)
        r["diff_area_percentage"] = r.get("diff_area", 0.0) * 100.0
        
        explanation_obj = r.get("explanation", {})
        r["explanation_bullets"] = explanation_obj.get("explanation_list", [])
        
        detected_names = [d["name"] for d in r.get("detected_objects", [])]
        r["explanation_summary"] = {
            "expected": expected,
            "detected": detected_names,
            "missing": r.get("missing_list", []),
            "added": r.get("new_list", [])
        }

    # Sort by timestamp descending
    results.sort(key=lambda x: x["timestamp"] if "timestamp" in x else datetime.datetime.min, reverse=True)
    return results

# ----------------- ALERTS -----------------
def create_alert(verification_id, checklist_name, department, ward, floor, similarity_score, alert_level, message):
    alert = {
        "verification_id": verification_id,
        "checklist_name": checklist_name,
        "department": department,
        "ward": ward,
        "floor": floor,
        "similarity_score": similarity_score,
        "alert_level": alert_level, # 'warning' or 'supervisor'
        "message": message,
        "status": "unresolved", # 'unresolved' or 'resolved'
        "timestamp": datetime.datetime.utcnow()
    }
    result = alerts_col.insert_one(alert)
    return str(result.inserted_id)

def get_all_alerts():
    alerts = list(alerts_col.find({}))
    for a in alerts:
        a["_id"] = str(a["_id"])
    alerts.sort(key=lambda x: x["timestamp"], reverse=True)
    return alerts

def resolve_alert(alert_id):
    try:
        alerts_col.update_one(
            {"_id": ObjectId(alert_id)},
            {"$set": {"status": "resolved", "resolved_at": datetime.datetime.utcnow()}}
        )
        return True
    except Exception:
        return False

# ----------------- DASHBOARD STATS -----------------
def get_dashboard_stats():
    total_checklists = checklists_col.count_documents({})
    total_verifications = verification_results_col.count_documents({})
    
    verified_count = verification_results_col.count_documents({"status": "Verified"})
    partially_verified_count = verification_results_col.count_documents({"status": "Partially Verified"})
    failed_count = verification_results_col.count_documents({"status": "Failed"})
    
    total_alerts = alerts_col.count_documents({"status": "unresolved"})
    warning_alerts = alerts_col.count_documents({"status": "unresolved", "alert_level": "warning"})
    supervisor_alerts = alerts_col.count_documents({"status": "unresolved", "alert_level": "supervisor"})
    
    # Calculate average similarity score
    avg_similarity = 0.0
    pipeline = [{"$group": {"_id": None, "avg_sim": {"$avg": "$similarity_score"}}}]
    cursor = list(verification_results_col.aggregate(pipeline))
    if cursor and cursor[0]["avg_sim"] is not None:
        avg_similarity = round(cursor[0]["avg_sim"] * 100, 1)

    return {
        "total_checklists": total_checklists,
        "total_verifications": total_verifications,
        "verified_count": verified_count,
        "partially_verified_count": partially_verified_count,
        "failed_count": failed_count,
        "unresolved_alerts": total_alerts,
        "warning_alerts": warning_alerts,
        "supervisor_alerts": supervisor_alerts,
        "avg_similarity": avg_similarity
    }

# ----------------- RESOLUTION PREDICTION -----------------
def save_resolution_predictions(predictions):
    """Replace stored resolution predictions with fresh batch."""
    resolution_predictions_col.delete_many({})
    if predictions:
        resolution_predictions_col.insert_many(predictions)
    return len(predictions)

def get_resolution_predictions():
    records = list(resolution_predictions_col.find({}))
    for r in records:
        r["_id"] = str(r["_id"])
    return records

def save_resolution_model_metrics(metrics):
    resolution_model_metrics_col.delete_many({})
    resolution_model_metrics_col.insert_one({
        **metrics,
        "updated_at": datetime.datetime.utcnow()
    })

def get_resolution_model_metrics():
    doc = resolution_model_metrics_col.find_one({}, sort=[("updated_at", -1)])
    if doc:
        doc["_id"] = str(doc["_id"])
        if "updated_at" in doc:
            doc["updated_at"] = doc["updated_at"].isoformat()
    return doc
