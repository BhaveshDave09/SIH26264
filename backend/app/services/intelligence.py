import json
import re
from typing import List, Dict, Any, Optional
from rapidfuzz import fuzz
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from backend.app.config import settings
from backend.app.models.case import Case
from backend.app.models.institution import Institution, InstitutionAlias
from backend.app.models.relationship import CaseRelationship
from backend.app.models.notification import Notification

def clean_text(text: str) -> str:
    """Normalizes text for linguistic comparison."""
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    return ' '.join(text.split())

def calculate_text_similarity(text1: str, text2: str) -> float:
    """Calculates rapid token set similarity between two texts."""
    clean1 = clean_text(text1)
    clean2 = clean_text(text2)
    if not clean1 or not clean2:
        return 0.0
    ratio = fuzz.token_set_ratio(clean1, clean2) / 100.0
    return round(ratio, 4)

def check_category_affinity(cat1: str, cat2: str) -> tuple[bool, float]:
    """Checks if two categories are identical or closely related in regulatory domain."""
    if not cat1 or not cat2:
        return False, 0.0
    c1, c2 = cat1.strip().lower(), cat2.strip().lower()
    if c1 == c2:
        return True, 1.0
    
    # Regulatory affinity clusters
    fee_cluster = {"fee overcharging", "capitation fee", "admission irregularity", "refund of fees"}
    compliance_cluster = {"unapproved courses", "infrastructure deficit", "faculty shortage", "faculty exploitation"}
    conduct_cluster = {"ragging & safety", "harassment", "student welfare"}

    for cluster in [fee_cluster, compliance_cluster, conduct_cluster]:
        if c1 in cluster and c2 in cluster:
            return True, 0.7
    return False, 0.0

def evaluate_case_pair(case1: Case, case2: Case, db: Session) -> Optional[Dict[str, Any]]:
    """
    Evaluates cross-case relationship between two cases.
    Returns candidate relationship evaluation dictionary if correlation is detected, or None.
    """
    if case1.id == case2.id:
        return None

    signals = []
    score_components = []
    
    inst1 = db.query(Institution).filter(Institution.id == case1.institution_id).first()
    inst2 = db.query(Institution).filter(Institution.id == case2.institution_id).first()

    if not inst1 or not inst2:
        return None

    # Signal 1: AICTE Permanent Institution ID Match (Weight: 0.40)
    is_same_institution = (inst1.permanent_id == inst2.permanent_id)
    if is_same_institution:
        signals.append(f"AICTE Permanent Institution ID Exact Match: {inst1.permanent_id} ({inst1.name})")
        score_components.append(0.40)
    else:
        # RapidFuzz name match for institutions
        name_sim = fuzz.token_sort_ratio(inst1.normalized_name, inst2.normalized_name) / 100.0
        if name_sim >= 0.85:
            signals.append(f"High Institution Name Similarity: {round(name_sim*100, 1)}% ('{inst1.name}' vs '{inst2.name}')")
            score_components.append(0.25 * name_sim)
        else:
            # Different institution and no name match: no relationship
            return None

    # Signal 2: Category Match or Affinity (Weight: 0.25)
    cat_match, cat_weight = check_category_affinity(case1.category, case2.category)
    if cat_match:
        if cat_weight == 1.0:
            signals.append(f"Identical Complaint Category: '{case1.category}'")
            score_components.append(0.25)
        else:
            signals.append(f"Domain-Related Categories: '{case1.category}' & '{case2.category}'")
            score_components.append(0.18)

    # Signal 3: Text & Title Similarity (Weight: 0.25)
    title_sim = calculate_text_similarity(case1.title, case2.title)
    desc_sim = calculate_text_similarity(case1.description, case2.description)
    combined_text_sim = (title_sim * 0.4) + (desc_sim * 0.6)

    if combined_text_sim >= 0.70:
        signals.append(f"High Complaint Content Similarity: {round(combined_text_sim*100, 1)}%")
        score_components.append(0.25 * combined_text_sim)
    elif combined_text_sim >= 0.40:
        signals.append(f"Moderate Complaint Text Overlap: {round(combined_text_sim*100, 1)}%")
        score_components.append(0.15 * combined_text_sim)

    # Signal 4: Bureau Dispersion & Action Conflict (Weight: 0.10)
    is_cross_bureau = (case1.assigned_bureau != case2.assigned_bureau)
    if is_cross_bureau:
        signals.append(f"Cross-Bureau Dispersion: Handled simultaneously by {case1.assigned_bureau} and {case2.assigned_bureau}")
        score_components.append(0.10)

    # Check for potential action conflict
    # Example: RB has escalated/under process compliance while PGRC or Approval is processing without coordination
    active_statuses = {"Under Process", "Escalated", "Pending Review"}
    is_action_conflict = False
    if is_cross_bureau and is_same_institution and (case1.status in active_statuses) and (case2.status in active_statuses):
        if (case1.assigned_bureau == "RB" and case2.assigned_bureau in ["PGRC", "APPROVAL_BUREAU"]) or \
           (case2.assigned_bureau == "RB" and case1.assigned_bureau in ["PGRC", "APPROVAL_BUREAU"]):
            is_action_conflict = True
            signals.append("Potential Action Conflict: Concurrent independent regulatory/grievance inquiries on the same institution without inter-bureau coordination.")
            score_components.append(0.15)

    total_score = round(min(sum(score_components), 1.0), 3)

    # Classification logic
    if is_same_institution and combined_text_sim >= 0.85 and cat_weight == 1.0:
        rel_type = "POTENTIAL_DUPLICATE"
        recommended_action = "Review for duplicate filing. Verify complainant identities and consider consolidating."
    elif is_action_conflict:
        rel_type = "ACTION_CONFLICT"
        recommended_action = "Immediate Inter-Bureau Coordination Required: Align Regulation Bureau compliance findings with PGRC proceedings."
    elif total_score >= settings.MATCH_THRESHOLD_RELATED:
        rel_type = "RELATED_CASE"
        recommended_action = "Flag as confirmed related case. Link institutional records for shared evidence."
    elif is_same_institution and is_cross_bureau:
        rel_type = "COORDINATION_RECOMMENDED"
        recommended_action = "Same Institution - Recommend creating a joint coordination task between Bureaus."
    else:
        # Score too low to warrant an alert
        return None

    explanation = (
        f"Detected {rel_type.replace('_', ' ').title()} with correlation score {total_score}. "
        f"Key signals: {'; '.join(signals)}. "
        f"Recommended official action: {recommended_action}"
    )

    return {
        "case_id_1": case1.id,
        "case_id_2": case2.id,
        "institution_id": inst1.id,
        "relationship_type": rel_type,
        "similarity_score": total_score,
        "matching_signals": signals,
        "explanation": explanation,
        "recommended_action": recommended_action,
        "status": "DETECTED"
    }

def scan_case_for_overlaps(case: Case, db: Session) -> List[CaseRelationship]:
    """
    Evaluates the newly created or updated case against other cases in the database.
    Stores any detected relationships in the database and creates notifications for responsible bureaus.
    """
    other_cases = db.query(Case).filter(Case.id != case.id).all()
    created_relationships = []

    for other in other_cases:
        eval_result = evaluate_case_pair(case, other, db)
        if not eval_result:
            continue

        # Check if relationship already exists
        existing = db.query(CaseRelationship).filter(
            ((CaseRelationship.case_id_1 == case.id) & (CaseRelationship.case_id_2 == other.id)) |
            ((CaseRelationship.case_id_1 == other.id) & (CaseRelationship.case_id_2 == case.id))
        ).first()

        if existing:
            continue

        rel = CaseRelationship(
            case_id_1=case.id,
            case_id_2=other.id,
            institution_id=eval_result["institution_id"],
            relationship_type=eval_result["relationship_type"],
            similarity_score=eval_result["similarity_score"],
            matching_signals=json.dumps(eval_result["matching_signals"]),
            explanation=eval_result["explanation"],
            recommended_action=eval_result["recommended_action"],
            status="DETECTED",
            created_at=datetime.now(timezone.utc)
        )
        db.add(rel)
        db.commit()
        db.refresh(rel)
        created_relationships.append(rel)

        # Create alert notification for involved bureaus
        inst = db.query(Institution).filter(Institution.id == case.institution_id).first()
        inst_name = inst.name if inst else "Institution"
        alert_msg = f"Potential Overlapping Cases — Coordination Required: Case {case.id} ({case.assigned_bureau}) matches Case {other.id} ({other.assigned_bureau}) for {inst_name}."
        
        notif = Notification(
            bureau=case.assigned_bureau,
            title="Potential Case Overlap Alert",
            message=alert_msg,
            notification_type="OVERLAP_DETECTED",
            link=f"/intelligence?rel_id={rel.id}",
            created_at=datetime.now(timezone.utc)
        )
        db.add(notif)
        if other.assigned_bureau != case.assigned_bureau:
            notif2 = Notification(
                bureau=other.assigned_bureau,
                title="Potential Case Overlap Alert",
                message=alert_msg,
                notification_type="OVERLAP_DETECTED",
                link=f"/intelligence?rel_id={rel.id}",
                created_at=datetime.now(timezone.utc)
            )
            db.add(notif2)
        db.commit()

    return created_relationships
