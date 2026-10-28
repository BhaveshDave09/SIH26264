import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models.document import Document
from backend.app.models.case import Case, CaseHistory
from backend.app.models.user import User
from backend.app.schemas.case import DocumentResponse
from backend.app.services.auth import get_current_user, require_write_access, check_bureau_and_region_access
from backend.app.services.audit import record_audit_event

router = APIRouter(prefix="/documents", tags=["Supporting Documents"])

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

@router.post("/cases/{case_id:path}/upload", response_model=DocumentResponse)
async def upload_case_document(
    case_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_write_access)
):
    """
    Secure document upload:
    - Validates file extension and size
    - Generates randomized safe server-side filename
    - Prevents directory traversal
    - Records upload in CaseHistory and tamper-evident audit log
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if not check_bureau_and_region_access(current_user, case.assigned_bureau, case.institution.region):
        raise HTTPException(status_code=403, detail="Forbidden: You cannot upload files to cases outside your bureau.")

    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed extensions: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

    # Read and check size
    contents = await file.read()
    file_size = len(contents)
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if file_size > max_bytes:
        raise HTTPException(status_code=400, detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB.")

    # Safe filename
    safe_filename = f"{uuid.uuid4().hex}{ext}"
    target_path = os.path.join(settings.UPLOAD_DIR, safe_filename)

    with open(target_path, "wb") as f:
        f.write(contents)

    doc = Document(
        case_id=case.id,
        original_filename=file.filename,
        safe_filename=safe_filename,
        file_size_bytes=file_size,
        content_type=file.content_type or "application/octet-stream",
        uploaded_by_username=current_user.username,
        uploaded_at=datetime.now(timezone.utc)
    )
    db.add(doc)

    # Append to CaseHistory
    hist = CaseHistory(
        case_id=case.id,
        actor_username=current_user.username,
        action_type="ACTION_RECORDED",
        remarks=f"Document uploaded: '{file.filename}' ({round(file_size/1024, 1)} KB).",
        timestamp=datetime.now(timezone.utc)
    )
    db.add(hist)
    db.commit()
    db.refresh(doc)

    # Record audit event
    record_audit_event(
        db=db,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="DOCUMENT_UPLOADED",
        entity_type="Case",
        entity_id=case.id,
        details={
            "document_id": doc.id,
            "filename": file.filename,
            "size_bytes": file_size,
            "content_type": file.content_type
        },
        reason="Supporting evidence uploaded"
    )

    return doc

@router.get("/{id}/download")
def download_document(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Securely downloads document after verifying authorization."""
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    case = doc.case
    if not check_bureau_and_region_access(current_user, case.assigned_bureau, case.institution.region):
        raise HTTPException(status_code=403, detail="Forbidden: You do not have permission to view documents for this case.")

    file_path = os.path.join(settings.UPLOAD_DIR, doc.safe_filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File content not found on server")

    return FileResponse(
        path=file_path,
        filename=doc.original_filename,
        media_type=doc.content_type
    )
