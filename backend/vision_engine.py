import os
import cv2
import numpy as np
from skimage.metrics import structural_similarity as ssim

# Global YOLO model holder
YOLO_MODEL = None
try:
    from ultralytics import YOLO
    # Try to load a lightweight model
    # Note: this will download yolov8n.pt if not present.
    # We load it lazily or catch errors if offline/uninstalled.
except ImportError:
    YOLO = None

def get_yolo_model():
    global YOLO_MODEL
    if YOLO is None:
        return None
    if YOLO_MODEL is None:
        try:
            # Load nano model
            YOLO_MODEL = YOLO("yolov8n.pt")
        except Exception as e:
            print(f"YOLOv8 loading failed: {e}. Falling back to classical CV detector.")
            YOLO_MODEL = None
    return YOLO_MODEL

def preprocess_image(img_path, target_size=(400, 400)):
    """Reads and resizes image, returning both BGR and Gray versions."""
    img = cv2.imread(img_path)
    if img is None:
        raise ValueError(f"Could not read image from {img_path}")
    img_resized = cv2.resize(img, target_size)
    gray = cv2.cvtColor(img_resized, cv2.COLOR_BGR2GRAY)
    return img_resized, gray

def compute_ssim(gray_ref, gray_proof):
    """Computes the Structural Similarity Index (SSIM) between two gray images."""
    score, diff = ssim(gray_ref, gray_proof, full=True)
    # diff is in range [-1, 1], convert to [0, 255]
    diff = ((diff + 1.0) * 127.5).astype("uint8")
    return float(score), diff

def compute_orb_matches(gray_ref, gray_proof):
    """Extracts ORB features and returns keypoint match count."""
    orb = cv2.ORB_create(nfeatures=1000)
    
    kp_ref, des_ref = orb.detectAndCompute(gray_ref, None)
    kp_proof, des_proof = orb.detectAndCompute(gray_proof, None)
    
    if des_ref is None or des_proof is None:
        return 0, []
        
    # BFMatcher with Hamming distance
    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    matches = bf.match(des_ref, des_proof)
    
    # Sort by distance
    matches = sorted(matches, key=lambda x: x.distance)
    
    # Keep good matches
    good_matches = [m for m in matches if m.distance < 50]
    return len(good_matches), good_matches

def compute_difference_area(gray_ref, gray_proof, diff_save_path=None):
    """Computes the absolute difference and difference area percentage."""
    # Absolute difference
    diff = cv2.absdiff(gray_ref, gray_proof)
    # Threshold the diff
    _, thresh = cv2.threshold(diff, 35, 255, cv2.THRESH_BINARY)
    
    # Calculate ratio of diff pixels
    total_pixels = thresh.shape[0] * thresh.shape[1]
    diff_pixels = np.count_nonzero(thresh)
    diff_ratio = float(diff_pixels / total_pixels)
    
    # Create diff visualization (overlay differences on proof image in red)
    diff_visual = cv2.merge([thresh, np.zeros_like(thresh), np.zeros_like(thresh)])
    
    if diff_save_path:
        # Create a nice visual diff: blue channels showing edge differences
        # We can highlight where the differences are on the actual image
        cv2.imwrite(diff_save_path, diff_visual)
        
    return diff_ratio, diff_visual

# ----------------- Fallback Color/Contour Object Detector -----------------
def detect_objects_by_color(img, expected_objects):
    """
    Classical Computer Vision object detector using HSV Color Segmentation and Contour Analysis.
    Detects hospital objects based on typical color ranges:
    - waste bin: red or yellow
    - biohazard bag: yellow/orange
    - mask: blue/cyan
    - helmet: yellow/orange
    - ppe suit: green or white
    - sanitizer bottle: blue or light contours
    - fire extinguisher: red (vertical aspect ratio)
    - bed / sink / monitor: gray contours
    """
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    detections = []
    
    # Define color ranges
    # Red
    lower_red1 = np.array([0, 70, 50])
    upper_red1 = np.array([10, 255, 255])
    lower_red2 = np.array([170, 70, 50])
    upper_red2 = np.array([180, 255, 255])
    # Yellow
    lower_yellow = np.array([15, 60, 60])
    upper_yellow = np.array([35, 255, 255])
    # Blue
    lower_blue = np.array([90, 50, 50])
    upper_blue = np.array([130, 255, 255])
    # Green
    lower_green = np.array([36, 40, 40])
    upper_green = np.array([85, 255, 255])
    
    detected_names = set()
    
    for obj_name in expected_objects:
        obj_name_lower = obj_name.lower()
        mask = None
        box_color = (0, 255, 0)
        
        # Color segmentation mapping
        if "bin" in obj_name_lower or "extinguisher" in obj_name_lower or "red" in obj_name_lower:
            # Red mask
            m1 = cv2.inRange(hsv, lower_red1, upper_red1)
            m2 = cv2.inRange(hsv, lower_red2, upper_red2)
            mask = cv2.bitwise_or(m1, m2)
            box_color = (0, 0, 255) # Red bounding box
        elif "bag" in obj_name_lower or "yellow" in obj_name_lower or "helmet" in obj_name_lower:
            # Yellow mask
            mask = cv2.inRange(hsv, lower_yellow, upper_yellow)
            box_color = (0, 255, 255) # Yellow bounding box
        elif "mask" in obj_name_lower or "sanitizer" in obj_name_lower or "blue" in obj_name_lower or "bottle" in obj_name_lower:
            # Blue mask
            mask = cv2.inRange(hsv, lower_blue, upper_blue)
            box_color = (255, 100, 0) # Cyan/Blue bounding box
        elif "suit" in obj_name_lower or "ppe" in obj_name_lower or "green" in obj_name_lower:
            # Green mask
            mask = cv2.inRange(hsv, lower_green, upper_green)
            box_color = (0, 255, 0) # Green bounding box
        elif "drip stand" in obj_name_lower or "iv stand" in obj_name_lower:
            # Drip stands are typically thin vertical poles with a small top bar.
            # Use a stricter dark-contour filter so unrelated vertical edges do not count as a match.
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            _, mask = cv2.threshold(gray, 120, 255, cv2.THRESH_BINARY_INV)
            box_color = (180, 180, 180)
        else:
            # Fallback to general contour detection on gray scale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            # Thresholding
            _, mask = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY_INV)
            box_color = (150, 150, 150) # Gray bounding box

        # Process mask and find contours
        if mask is not None:
            # Clean mask
            kernel = np.ones((5,5), np.uint8)
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
            
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Find largest contour matching size threshold
            valid_contour = False
            for contour in contours:
                area = cv2.contourArea(contour)
                x, y, w, h = cv2.boundingRect(contour)

                if "drip stand" in obj_name_lower or "iv stand" in obj_name_lower:
                    aspect_ratio = h / max(w, 1)
                    # Loosened thresholds: allow smaller area and lower aspect ratios
                    # because proof photos may crop or scale the pole differently.
                    if area <= 300 or h < 80 or aspect_ratio < 1.8:
                        continue
                elif area <= 800: # Min pixel area to avoid noise
                    continue

                if area > 0:
                    detections.append({
                        "name": obj_name_lower,
                        "bbox": [x, y, w, h],
                        "confidence": float(min(0.95, 0.6 + area / 50000)),
                        "color": box_color
                    })
                    detected_names.add(obj_name_lower)
                    valid_contour = True
                    break # just detect one instance for simplicity
            
            # If no contour found, let's say it's missing (it won't be added to detections)
            
    # Also detect any random objects to represent "new/unexpected objects"
    # Search for contours that do not match expected objects
    # We can detect generic contours in the image
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, general_mask = cv2.threshold(gray, 50, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    general_contours, _ = cv2.findContours(general_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    general_count = 0
    for contour in general_contours:
        area = cv2.contourArea(contour)
        if area > 3000:
            x, y, w, h = cv2.boundingRect(contour)
            # Check overlap with existing detections
            overlap = False
            for det in detections:
                dx, dy, dw, dh = det["bbox"]
                # simple overlap check
                if not (x + w < dx or x > dx + dw or y + h < dy or y > dy + dh):
                    overlap = True
                    break
            
            if not overlap:
                general_count += 1
                # If we have a general object that is not in our checklist
                name = "unknown obstacle" if general_count == 1 else f"extra item {general_count}"
                # If the checklist is ICU and we see something unexpected
                detections.append({
                    "name": name,
                    "bbox": [x, y, w, h],
                    "confidence": 0.75,
                    "color": (0, 165, 255) # Orange (warning)
                })
                
    return detections

# ----------------- Combined Object Detection Pipeline -----------------
def detect_objects(img, expected_objects):
    """
    Main detection handler. Attempts to use YOLOv8.
    If unavailable or fails, uses classical CV color-contour segmentation.
    """
    yolo = get_yolo_model()
    if yolo is not None:
        try:
            results = yolo(img)[0]
            detections = []
            
            # YOLO classes
            names = yolo.names
            
            for box in results.boxes:
                cls_id = int(box.cls[0])
                name = names[cls_id].lower()
                conf = float(box.conf[0])
                xyxy = box.xyxy[0].tolist()
                x, y, x2, y2 = map(int, xyxy)
                w, h = x2 - x, y2 - y
                
                # Filter/map YOLO coco classes to our hospital domain
                # Bed -> bed
                # Bottle -> sanitizer bottle / bottle
                # Cup / bowl -> soap dispenser
                # Person -> worker / person
                # Backpack / handbag -> biohazard bag
                detections.append({
                    "name": name,
                    "bbox": [x, y, w, h],
                    "confidence": conf,
                    "color": (0, 255, 0)
                })
                
            # Filter detections to match checklist context
            return detections
        except Exception as e:
            print(f"YOLOv8 inference failed: {e}. Falling back to Classical CV detector.")
            
    # Classical CV detector
    return detect_objects_by_color(img, expected_objects)

# ----------------- Core Evaluation Pipeline -----------------
def analyze_images(ref_img_path, proof_img_path, expected_objects, output_proof_path, output_diff_path):
    """
    Executes the entire Computer Vision flow:
    1. Preprocesses both images
    2. Calculates SSIM similarity
    3. Performs ORB keypoint matching
    4. Computes absolute differences & difference area percentage
    5. Performs Object Detection
    6. Identifies missing and newly added objects
    7. Draws annotations and saves visualization images
    """
    # 1. Load and Preprocess
    ref_bgr, ref_gray = preprocess_image(ref_img_path)
    proof_bgr, proof_gray = preprocess_image(proof_img_path)
    
    # 2. Similarity analysis (SSIM)
    similarity_score, diff_gray = compute_ssim(ref_gray, proof_gray)
    
    # 3. Feature Match Score (ORB)
    match_count, good_matches = compute_orb_matches(ref_gray, proof_gray)
    
    # 4. Difference Area Ratio
    diff_area_ratio, diff_visual = compute_difference_area(ref_gray, proof_gray)
    
    # 5. Object Detection
    ref_detections = detect_objects(ref_bgr, expected_objects)
    proof_detections = detect_objects(proof_bgr, expected_objects)

    def normalize_object_name(name):
        normalized = name.strip().lower()
        alias_map = {
            "peoples": "people",
            "persons": "person",
            "benches": "bench",
            "trees": "tree",
            "drip stands": "drip stand",
            "iv stands": "iv stand",
        }
        return alias_map.get(normalized, normalized)
    
    # Extract unique detected names
    ref_names = [normalize_object_name(d["name"]) for d in ref_detections if d["name"] not in ["unknown obstacle"] and not d["name"].startswith("extra item")]
    proof_names = [normalize_object_name(d["name"]) for d in proof_detections if d["name"] not in ["unknown obstacle"] and not d["name"].startswith("extra item")]
    normalized_expected_objects = [normalize_object_name(obj) for obj in expected_objects]
    
    # If ref_names is empty, default it to the checklist expected_objects
    if not ref_names:
        ref_names = normalized_expected_objects
        
    # Determine missing and new objects
    missing_objects = []
    for item in ref_names:
        if item not in proof_names:
            missing_objects.append(item)
    if not missing_objects:
        for item in normalized_expected_objects:
            if item not in proof_names:
                missing_objects.append(item)
            
    new_objects = []
    for d in proof_detections:
        name = normalize_object_name(d["name"])
        # If it's not in the expected checklist item, it's a new/unexpected object
        if name not in ref_names and name not in normalized_expected_objects:
            new_objects.append(name)
            
    # 6. Save Annotations on Proof Image
    annotated_proof = proof_bgr.copy()
    for det in proof_detections:
        x, y, w, h = det["bbox"]
        name = det["name"]
        conf = det["confidence"]
        color = det["color"]
        
        # Draw bbox
        cv2.rectangle(annotated_proof, (x, y), (x + w, y + h), color, 2)
        # Draw label background
        label = f"{name} ({int(conf * 100)}%)"
        cv2.putText(annotated_proof, label, (x, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1, cv2.LINE_AA)
        
    # 7. Save Annotations on Reference Image (for side-by-side)
    # We can save it as annotated reference, or just serve original reference.
    # Write files
    cv2.imwrite(output_proof_path, annotated_proof)
    
    # Draw differences on the diff visual
    # Highlight differences overlayed on the proof image in red tint
    diff_overlay = proof_bgr.copy()
    # Mask of differences
    diff_mask = cv2.absdiff(ref_gray, proof_gray)
    _, thresh = cv2.threshold(diff_mask, 35, 255, cv2.THRESH_BINARY)
    # Apply red mask
    diff_overlay[thresh == 255] = [0, 0, 255] # Red tint
    
    # Blend original and red diff overlay
    blended_diff = cv2.addWeighted(proof_bgr, 0.7, diff_overlay, 0.3, 0)
    cv2.imwrite(output_diff_path, blended_diff)
    
    # Compile all vision metrics
    metrics = {
        "similarity_score": similarity_score, # range [0, 1]
        "missing_objects": len(missing_objects),
        "new_objects": len(new_objects),
        "feature_match_score": match_count,
        "diff_area": float(diff_area_ratio), # range [0, 1]
        "detected_objects": [
            {"name": d["name"], "confidence": d["confidence"], "bbox": d["bbox"]}
            for d in proof_detections
        ],
        "ref_detected_objects": [
            {"name": d["name"], "confidence": d.get("confidence", 1.0), "bbox": d.get("bbox", [])}
            for d in ref_detections
        ],
        "missing_list": missing_objects,
        "new_list": new_objects
    }
    
    return metrics
