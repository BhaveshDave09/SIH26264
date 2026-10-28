from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.schemas.user import TokenResponse, UserResponse
from backend.app.services.auth import verify_password, create_access_token, get_current_user
from backend.app.services.audit import record_audit_event

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Authenticates demo users using username and password."""
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.salt, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user account")

    access_token = create_access_token(
        data={
            "sub": user.username,
            "role": user.role,
            "bureau": user.bureau,
            "region": user.region
        }
    )

    # Log audit event for sign-in
    record_audit_event(
        db=db,
        actor_username=user.username,
        actor_role=user.role,
        action="USER_LOGIN",
        entity_type="User",
        entity_id=str(user.id),
        details={"username": user.username, "role": user.role, "bureau": user.bureau},
        reason="User successfully authenticated"
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Returns currently authenticated user profile."""
    return current_user

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Records logout event in audit history."""
    record_audit_event(
        db=db,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="USER_LOGOUT",
        entity_type="User",
        entity_id=str(current_user.id),
        details={"username": current_user.username},
        reason="User logged out"
    )
    return {"message": "Logged out successfully"}
