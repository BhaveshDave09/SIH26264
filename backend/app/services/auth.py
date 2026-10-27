import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, List
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.schemas.user import TokenData

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def hash_password(password: str) -> tuple[str, str]:
    """Hashes password with PBKDF2-HMAC-SHA256 and returns (salt, hashed_password)."""
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return salt, dk.hex()

def verify_password(plain_password: str, salt: str, hashed_password: str) -> bool:
    """Verifies a plain password against the stored salt and hash."""
    dk = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return secrets.compare_digest(dk.hex(), hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Encodes JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Extracts and validates current logged-in user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    user = db.query(User).filter(User.username == username, User.is_active == True).first()
    if user is None:
        raise credentials_exception
    return user

def require_roles(allowed_roles: List[str]):
    """Role-based authorization dependency factory."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles and current_user.role != "SUPER_ADMIN":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of roles {allowed_roles}, your role is {current_user.role}"
            )
        return current_user
    return role_checker

def require_write_access(current_user: User = Depends(get_current_user)) -> User:
    """Blocks Read-Only Management Viewers from modifying records."""
    if current_user.role == "READ_ONLY":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Read-Only Management Viewers cannot perform modifying actions."
        )
    return current_user

def check_bureau_and_region_access(user: User, bureau: Optional[str], region: Optional[str]) -> bool:
    """Checks whether the user has authorization for the specified bureau and region."""
    if user.role == "SUPER_ADMIN":
        return True
    if user.role == "READ_ONLY":
        return True
    
    # Regional officer check
    if user.role == "REGIONAL_OFFICER":
        if user.region != "ALL" and region and user.region != region:
            return False
        return True

    # Bureau officer / Bureau head check
    if user.bureau != "ALL" and bureau and user.bureau != bureau:
        return False

    return True
