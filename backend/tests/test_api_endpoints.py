import pytest
from starlette.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_check_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["app"] == "NivaranX"

def test_auth_login_success():
    res = client.post("/api/v1/auth/login", data={"username": "superadmin", "password": "Admin@123"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["username"] == "superadmin"
    assert data["user"]["role"] == "SUPER_ADMIN"

def test_auth_login_invalid_password_rejected():
    res = client.post("/api/v1/auth/login", data={"username": "superadmin", "password": "WrongPassword"})
    assert res.status_code == 401

def test_get_dashboard_stats_authenticated():
    # 1. Login as rb_head (scoped to Regulation Bureau)
    login_res = client.post("/api/v1/auth/login", data={"username": "rb_head", "password": "Bureau@123"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/dashboard/stats", headers=headers)
    assert res.status_code == 200
    stats = res.json()
    assert stats["total_cases"] == 8  # RB cases
    assert "bureau_workload" in stats

    # 2. Login as superadmin (system-wide view)
    admin_login = client.post("/api/v1/auth/login", data={"username": "superadmin", "password": "Admin@123"})
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    admin_res = client.get("/api/v1/dashboard/stats?bureau=ALL", headers=admin_headers)
    assert admin_res.status_code == 200
    admin_stats = admin_res.json()
    assert admin_stats["total_cases"] >= 25

def test_institution_directory_and_360_profile():
    login_res = client.post("/api/v1/auth/login", data={"username": "superadmin", "password": "Admin@123"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Search institutions
    res = client.get("/api/v1/institutions?q=Apex", headers=headers)
    assert res.status_code == 200
    institutions = res.json()
    assert len(institutions) >= 1
    apex_id = institutions[0]["id"]
    assert institutions[0]["permanent_id"] == "1-1029384751"

    # Get 360 profile
    profile_res = client.get(f"/api/v1/institutions/{apex_id}", headers=headers)
    assert profile_res.status_code == 200
    profile = profile_res.json()
    assert profile["total_cases"] >= 2
    assert "cases_by_bureau" in profile
    assert "cases_by_status" in profile

def test_audit_verify_api_endpoint():
    login_res = client.post("/api/v1/auth/login", data={"username": "superadmin", "password": "Admin@123"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/audit/verify", headers=headers)
    assert res.status_code == 200
    result = res.json()
    assert result["is_valid"] is True
    assert result["total_events"] > 0


def test_get_case_detail_with_slashes():
    login_res = client.post("/api/v1/auth/login", data={"username": "superadmin", "password": "Admin@123"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Test case ID containing slashes: AICTE/PGRC/2026/001
    res = client.get("/api/v1/cases/AICTE/PGRC/2026/001", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == "AICTE/PGRC/2026/001"
    assert "history" in data
    assert "documents" in data

