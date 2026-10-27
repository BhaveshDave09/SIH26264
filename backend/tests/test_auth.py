import pytest
from backend.app.services.auth import hash_password, verify_password, create_access_token
import jwt
from backend.app.config import settings

def test_password_hashing_and_verification():
    password = "SuperSecretPassword123!"
    salt, hashed = hash_password(password)
    
    assert salt is not None
    assert hashed is not None
    assert len(salt) == 32  # 16 bytes hex
    
    # Valid password verification
    assert verify_password(password, salt, hashed) is True
    
    # Invalid password rejection
    assert verify_password("WrongPassword!", salt, hashed) is False
    assert verify_password("", salt, hashed) is False

def test_jwt_token_creation_and_payload():
    payload = {"sub": "test_officer", "role": "BUREAU_OFFICER", "bureau": "RB", "region": "North"}
    token = create_access_token(payload)
    
    decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert decoded["sub"] == "test_officer"
    assert decoded["role"] == "BUREAU_OFFICER"
    assert decoded["bureau"] == "RB"
    assert decoded["region"] == "North"
    assert "exp" in decoded
