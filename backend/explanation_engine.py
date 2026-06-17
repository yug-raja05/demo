def generate_explanation(checklist_name, expected_objects, metrics, status):
    """
    Generates structured human-readable explanations and Difference Panel content.
    - expected_objects: list of lowercase strings
    - metrics: dictionary containing:
        - similarity_score (float, 0 to 1)
        - missing_list (list of missing strings)
        - new_list (list of new strings)
        - detected_objects (list of dicts)
    - status: 'Verified', 'Partially Verified', 'Failed'
    """
    sim_percent = int(metrics["similarity_score"] * 100)
    missing = metrics["missing_list"]
    new_objs = metrics["new_list"]
    detected_all = [d["name"] for d in metrics["detected_objects"]]
    
    # 1. Generate Explanation Bullet Points (explanation_list)
    explanation_list = []
    
    # List detected items that were expected
    detected_expected = [obj for obj in expected_objects if obj in detected_all]
    for obj in detected_expected:
        explanation_list.append(f"{obj.capitalize()} detected")
        
    # List missing items
    for obj in missing:
        explanation_list.append(f"{obj.capitalize()} missing")
        
    # Add similarity score
    explanation_list.append(f"Similarity score {sim_percent}%")
    
    # Add positional match details
    if metrics["similarity_score"] >= 0.85:
        explanation_list.append("Object positions match reference image")
    elif metrics["similarity_score"] >= 0.70:
        explanation_list.append("Minor layout/position deviations detected")
    else:
        explanation_list.append("Significant layout discrepancy compared to reference")
        
    # Status specific statements
    if status == "Verified":
        explanation_list.append("Audit compliance standards fully satisfied")
    elif status == "Partially Verified":
        explanation_list.append(f"Audit incomplete: {len(missing)} expected object not found")
    else: # Failed
        explanation_list.append("Major compliance violation detected")
        
    # 2. Difference Explanation Panel (Reference vs Uploaded & Summary)
    # Reference checklist summary list
    ref_list = []
    for obj in expected_objects:
        ref_list.append(f"1 {obj.capitalize()}")
    ref_text = ", ".join(ref_list)
    
    # Uploaded checklist summary list
    uploaded_list = []
    for obj in expected_objects:
        if obj in detected_all:
            uploaded_list.append(f"1 {obj.capitalize()}")
        else:
            uploaded_list.append(f"No {obj.capitalize()}")
    uploaded_text = ", ".join(uploaded_list)
    
    # Sentence explanation
    if missing:
        missing_phrase = " and ".join([m.capitalize() for m in missing])
        verb = "is" if len(missing) == 1 else "are"
        
        found_expected = [obj for obj in expected_objects if obj not in missing]
        if found_expected:
            found_phrase = ", ".join([f"{f.capitalize()}" for f in found_expected])
            explanation_sentence = f"{missing_phrase} {verb} missing compared to the reference image. {found_phrase} and floor condition match the expected checklist standards."
        else:
            explanation_sentence = f"All expected items ({missing_phrase}) are missing compared to the reference image. Major layout mismatch detected."
    else:
        # None missing
        expected_phrase = ", ".join([obj.capitalize() for obj in expected_objects])
        if new_objs:
            new_phrase = ", ".join([n.capitalize() for n in new_objs])
            explanation_sentence = f"All expected items ({expected_phrase}) match reference standards. However, unexpected extra objects ({new_phrase}) were detected in the area."
        else:
            explanation_sentence = f"All expected items ({expected_phrase}) match the reference standards, and the overall layouts are compliant."
            
    panel_explanation = {
        "reference": ref_text,
        "uploaded": uploaded_text,
        "generated_explanation": explanation_sentence
    }
    
    # 3. Alert Level Rules
    # If similarity < 70% -> Warning
    # If similarity < 50% -> Supervisor Alert
    alert_level = "none"
    alert_message = ""
    
    if metrics["similarity_score"] < 0.50:
        alert_level = "supervisor"
        alert_message = f"🚨 Supervisor Alert: Similarity is only {sim_percent}% (below 50%) for checklist '{checklist_name}'. Critical elements are missing or heavily out of place."
    elif metrics["similarity_score"] < 0.70:
        alert_level = "warning"
        alert_message = f"⚠ Verification Warning: Similarity score of {sim_percent}% is below compliance threshold (70%) for checklist '{checklist_name}'."
        
    return {
        "explanation_list": explanation_list,
        "panel_explanation": panel_explanation,
        "alert_level": alert_level,
        "alert_message": alert_message
    }
