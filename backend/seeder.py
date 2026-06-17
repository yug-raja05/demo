import os
import cv2
import numpy as np
import db

STATIC_REF_DIR = os.path.join(os.path.dirname(__file__), "static", "reference")
os.makedirs(STATIC_REF_DIR, exist_ok=True)

def generate_icu_ref():
    # Light gray background
    img = np.ones((400, 400, 3), dtype=np.uint8) * 240
    
    # Floor boundary
    cv2.line(img, (0, 300), (400, 300), (120, 120, 120), 3)
    
    # ICU Bed
    cv2.rectangle(img, (80, 220), (320, 280), (180, 100, 80), -1)  # Bed body
    cv2.rectangle(img, (70, 190), (100, 280), (100, 100, 100), -1) # Headboard
    cv2.line(img, (120, 280), (120, 320), (0, 0, 0), 4)            # Legs
    cv2.line(img, (280, 280), (280, 320), (0, 0, 0), 4)
    
    # Drip Stand (IV Pole)
    cv2.line(img, (340, 100), (340, 280), (80, 80, 80), 4)         # Pole
    cv2.line(img, (320, 100), (360, 100), (80, 80, 80), 4)         # Crossbar
    cv2.circle(img, (325, 130), 18, (0, 0, 255), -1)               # IV Bag (Red)
    
    # Monitor (Wall mounted)
    cv2.rectangle(img, (140, 60), (240, 140), (40, 40, 40), -1)    # Monitor body
    cv2.rectangle(img, (150, 70), (230, 130), (0, 255, 0), -1)     # Green screen
    cv2.line(img, (150, 100), (230, 100), (255, 255, 255), 2)      # EKG line
    
    # Labels
    cv2.putText(img, "BED", (170, 255), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    cv2.putText(img, "MONITOR", (155, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
    cv2.putText(img, "DRIP STAND", (280, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
    
    return img

def generate_waste_ref():
    # Gray background
    img = np.ones((400, 400, 3), dtype=np.uint8) * 230
    
    # Red Waste Bin
    points = np.array([[120, 140], [280, 140], [250, 340], [150, 340]], np.int32)
    cv2.fillPoly(img, [points], (0, 0, 220))
    # Lid
    cv2.rectangle(img, (100, 120), (300, 145), (60, 60, 60), -1)
    
    # Yellow Biohazard Bag inside/peeking
    cv2.circle(img, (200, 210), 30, (0, 220, 220), -1) # Yellow circle
    
    # Biohazard symbol details
    cv2.circle(img, (200, 210), 12, (0, 0, 0), 2)
    cv2.line(img, (200, 190), (200, 230), (0, 0, 0), 2)
    cv2.line(img, (180, 210), (220, 210), (0, 0, 0), 2)
    
    # Labels
    cv2.putText(img, "WASTE BIN", (150, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
    cv2.putText(img, "BAG", (180, 215), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 2)
    
    return img

def generate_ppe_ref():
    # Light gray background
    img = np.ones((400, 400, 3), dtype=np.uint8) * 245
    
    # Draw Face Outline
    cv2.circle(img, (200, 200), 90, (220, 200, 180), -1)
    
    # Yellow Helmet
    cv2.ellipse(img, (200, 130), (95, 60), 0, 180, 360, (0, 220, 255), -1) # Yellow dome
    cv2.rectangle(img, (95, 125), (305, 138), (0, 200, 255), -1)           # Brim
    
    # Blue Surgical Mask
    cv2.rectangle(img, (140, 200), (260, 275), (255, 120, 0), -1) # Blue (BGR blue)
    # Mask strings
    cv2.line(img, (140, 210), (100, 200), (180, 180, 180), 3)
    cv2.line(img, (140, 260), (100, 250), (180, 180, 180), 3)
    cv2.line(img, (260, 210), (300, 200), (180, 180, 180), 3)
    cv2.line(img, (260, 260), (300, 250), (180, 180, 180), 3)
    
    # Green PPE Suit shoulders
    cv2.ellipse(img, (200, 380), (150, 90), 0, 180, 360, (0, 150, 0), -1) # Green scrubs
    
    # Labels
    cv2.putText(img, "HELMET", (170, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
    cv2.putText(img, "MASK", (180, 245), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    cv2.putText(img, "PPE SUIT", (165, 340), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    
    return img

def generate_hand_ref():
    # Light gray background
    img = np.ones((400, 400, 3), dtype=np.uint8) * 235
    
    # Sink (Grey metallic rect)
    cv2.rectangle(img, (80, 220), (320, 360), (160, 160, 160), -1)
    cv2.rectangle(img, (100, 240), (300, 340), (100, 100, 100), -1) # Sink basin
    
    # Faucet/Tap
    cv2.line(img, (200, 180), (200, 240), (180, 180, 180), 8)
    cv2.line(img, (200, 180), (220, 180), (180, 180, 180), 8)
    
    # Blue Sanitizer Bottle (on left)
    cv2.rectangle(img, (110, 150), (150, 230), (255, 100, 0), -1)  # Blue bottle body
    cv2.rectangle(img, (120, 130), (140, 150), (200, 200, 200), -1) # Pump neck
    cv2.line(img, (120, 130), (110, 130), (200, 200, 200), 4)       # Spout
    
    # Soap Dispenser (on right)
    cv2.rectangle(img, (250, 150), (290, 230), (150, 150, 150), -1) # White/gray dispenser
    cv2.circle(img, (270, 180), 10, (0, 255, 0), -1)                # Soap push button
    
    # Labels
    cv2.putText(img, "SINK", (180, 300), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
    cv2.putText(img, "BOTTLE", (90, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
    cv2.putText(img, "SOAP DISPENSER", (210, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
    
    return img

def generate_fire_ref():
    # Light gray background
    img = np.ones((400, 400, 3), dtype=np.uint8) * 240
    
    # Red cylinder (Fire Extinguisher)
    cv2.rectangle(img, (150, 140), (250, 340), (0, 0, 200), -1) # Red cylinder
    
    # Top valve assembly
    cv2.rectangle(img, (170, 110), (230, 140), (50, 50, 50), -1) # Valve
    cv2.line(img, (170, 100), (210, 120), (50, 50, 50), 6)       # Handle
    
    # Pressure Gauge
    cv2.circle(img, (200, 125), 10, (255, 255, 255), -1)
    cv2.line(img, (200, 125), (203, 118), (0, 255, 0), 2)        # Green reading pointer
    
    # Hose
    cv2.line(img, (220, 140), (270, 180), (30, 30, 30), 6)       # Hose curving down
    cv2.line(img, (270, 180), (270, 300), (30, 30, 30), 6)
    
    # Instruction Label on Cylinder
    cv2.rectangle(img, (170, 190), (230, 270), (255, 255, 255), -1)
    cv2.putText(img, "FIRE", (185, 220), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 200), 2)
    cv2.putText(img, "A B C", (185, 250), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1)
    
    # Labels
    cv2.putText(img, "FIRE EXTINGUISHER", (100, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
    
    return img

def seed_reference_images():
    """Generates synthetic reference images and saves them if they don't exist."""
    generators = {
        "ICU Cleanliness Audit": (generate_icu_ref, ["bed", "drip stand", "monitor"]),
        "Biomedical Waste Disposal": (generate_waste_ref, ["waste bin", "biohazard bag"]),
        "PPE Availability Check": (generate_ppe_ref, ["mask", "helmet", "ppe suit"]),
        "Hand Hygiene Station Audit": (generate_hand_ref, ["sanitizer bottle", "soap dispenser", "sink"]),
        "Fire Extinguisher Positioning": (generate_fire_ref, ["fire extinguisher"])
    }
    
    checklists = db.get_all_checklists()
    for checklist in checklists:
        chk_name = checklist["name"]
        chk_id = checklist["_id"]
        
        # Check if reference image is already stored
        existing_ref = db.get_reference_image_by_checklist(chk_id)
        if not existing_ref:
            if chk_name in generators:
                generator_fn, expected_objects = generators[chk_name]
                img = generator_fn()
                
                # Save file
                filename = f"ref_{chk_id}.jpg"
                filepath = os.path.join(STATIC_REF_DIR, filename)
                cv2.imwrite(filepath, img)
                
                # Update DB
                url = f"/static/reference/{filename}"
                db.save_reference_image(chk_id, url, expected_objects)
                print(f"Generated synthetic reference image for '{chk_name}' at {url}")
            else:
                # Fallback for custom checklists
                fallback_img = np.ones((400, 400, 3), dtype=np.uint8) * 200
                cv2.putText(fallback_img, f"Ref: {chk_name[:20]}", (50, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,0,0), 2)
                filename = f"ref_{chk_id}.jpg"
                filepath = os.path.join(STATIC_REF_DIR, filename)
                cv2.imwrite(filepath, fallback_img)
                url = f"/static/reference/{filename}"
                db.save_reference_image(chk_id, url, checklist.get("expected_objects", []))
                print(f"Generated fallback reference image for '{chk_name}'")
                
if __name__ == "__main__":
    db.seed_database()
    seed_reference_images()
