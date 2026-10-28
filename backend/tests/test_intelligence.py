from backend.app.database import SessionLocal
from backend.app.services.intelligence import calculate_text_similarity, check_category_affinity, evaluate_case_pair
from backend.app.models.case import Case

def test_text_similarity():
    t1 = "Refusal to refund caution deposit money to mechanical students"
    t2 = "Non-refund of student caution deposit and certificates"
    score = calculate_text_similarity(t1, t2)
    assert score > 0.60

def test_category_affinity():
    matched, weight = check_category_affinity("Fee Overcharging", "Capitation Fee")
    assert matched is True
    assert weight > 0.5

    matched, weight = check_category_affinity("Ragging & Safety", "Fee Overcharging")
    assert matched is False

def test_case_pair_evaluation():
    db = SessionLocal()
    try:
        case_pgrc = db.query(Case).filter(Case.id == "AICTE/PGRC/2026/001").first()
        case_rb = db.query(Case).filter(Case.id == "AICTE/RB/2026/002").first()
        
        assert case_pgrc is not None
        assert case_rb is not None

        result = evaluate_case_pair(case_pgrc, case_rb, db)
        assert result is not None
        assert result["relationship_type"] in ["ACTION_CONFLICT", "COORDINATION_RECOMMENDED", "RELATED_CASE"]
        assert result["similarity_score"] > 0.60
        assert len(result["matching_signals"]) > 0
        assert "Apex Institute" in result["explanation"]
    finally:
        db.close()
