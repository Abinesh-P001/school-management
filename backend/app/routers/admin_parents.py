from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.core.dependencies import require_admin
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.parent import Parent, ParentStudent, ParentCorrectionRequest
from app.models.student import Student
from app.schemas.parent import (
    ParentCreate, ParentUpdate, ParentResponse, LinkedStudentInfo,
    ParentLinkStudent, ParentResetPassword,
    CorrectionRequestResponse, CorrectionRequestStatusUpdate
)

router = APIRouter(prefix="/admin/parents", tags=["Admin Parent Management"])

def _format_parent_response(p: Parent) -> dict:
    linked_students = []
    for ps in p.parent_students:
        st = ps.student
        if st:
            classroom_name = st.classroom.name if st.classroom else None
            section_name = st.classroom.section if st.classroom else None
            linked_students.append({
                "id": st.id,
                "student_id": st.student_id,
                "name": st.name,
                "admission_number": st.admission_number,
                "roll_number": st.roll_number,
                "class_id": st.class_id,
                "grade": classroom_name,
                "section": section_name,
                "gender": st.gender,
                "fees_status": st.fees_status,
                "relationship": ps.relationship,
                "is_primary_contact": ps.is_primary_contact,
                "is_verified": ps.is_verified
            })
    return {
        "id": p.id,
        "user_id": p.user_id,
        "parent_code": p.parent_code,
        "name": p.name,
        "email": p.email,
        "phone": p.phone,
        "alternate_phone": p.alternate_phone,
        "relationship_type": p.relationship_type,
        "address": p.address,
        "occupation": p.occupation,
        "status": p.status,
        "created_at": p.created_at,
        "students": linked_students
    }

@router.get("", response_model=List[ParentResponse])
def get_all_parents(
    search: Optional[str] = Query(None, description="Search by name, email, or parent code"),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    query = db.query(Parent)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Parent.name.ilike(term),
                Parent.email.ilike(term),
                Parent.parent_code.ilike(term),
                Parent.phone.ilike(term)
            )
        )
    if status_filter:
        query = query.filter(Parent.status == status_filter)

    parents = query.order_by(Parent.id.desc()).all()
    return [_format_parent_response(p) for p in parents]

@router.post("", response_model=ParentResponse, status_code=status.HTTP_201_CREATED)
def create_parent(
    parent_in: ParentCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == parent_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email {parent_in.email} already exists."
        )

    # Generate parent code
    last_parent = db.query(Parent).order_by(Parent.id.desc()).first()
    next_num = (last_parent.id + 1001) if last_parent else 1001
    parent_code = f"PAR-{next_num}"

    # Default initial password if none provided
    initial_pw = parent_in.password if parent_in.password else "ParentSecure123!"

    new_user = User(
        email=parent_in.email,
        hashed_password=hash_password(initial_pw),
        full_name=parent_in.name,
        role=UserRole.PARENT,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    new_parent = Parent(
        user_id=new_user.id,
        parent_code=parent_code,
        name=parent_in.name,
        email=parent_in.email,
        phone=parent_in.phone,
        alternate_phone=parent_in.alternate_phone,
        relationship_type=parent_in.relationship_type,
        address=parent_in.address,
        occupation=parent_in.occupation,
        status="Active"
    )
    db.add(new_parent)
    db.commit()
    db.refresh(new_parent)

    # Link initial students if provided
    if parent_in.student_ids:
        for sid in parent_in.student_ids:
            st = db.query(Student).filter(Student.id == sid).first()
            if st:
                link = ParentStudent(
                    parent_id=new_parent.id,
                    student_id=st.id,
                    relationship=parent_in.relationship_type,
                    is_primary_contact=True,
                    is_verified=True,
                    verified_at=datetime.utcnow(),
                    verified_by=admin_user.id
                )
                db.add(link)
        db.commit()
        db.refresh(new_parent)

    return _format_parent_response(new_parent)

@router.get("/{parent_id}", response_model=ParentResponse)
def get_parent_by_id(
    parent_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent record not found")
    return _format_parent_response(parent)

@router.put("/{parent_id}", response_model=ParentResponse)
def update_parent(
    parent_id: int,
    parent_in: ParentUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent record not found")

    update_dict = parent_in.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(parent, field, val)

    if parent_in.name and parent.user:
        parent.user.full_name = parent_in.name

    db.commit()
    db.refresh(parent)
    return _format_parent_response(parent)

@router.post("/{parent_id}/link-student", status_code=status.HTTP_201_CREATED)
def link_student_to_parent(
    parent_id: int,
    link_data: ParentLinkStudent,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent record not found")

    student = db.query(Student).filter(Student.id == link_data.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")

    existing = db.query(ParentStudent).filter(
        ParentStudent.parent_id == parent_id,
        ParentStudent.student_id == link_data.student_id
    ).first()
    if existing:
        existing.relationship = link_data.relationship
        existing.is_primary_contact = link_data.is_primary_contact
        existing.is_verified = link_data.is_verified
        if link_data.is_verified and not existing.verified_at:
            existing.verified_at = datetime.utcnow()
            existing.verified_by = admin_user.id
        db.commit()
        return {"message": "Student link relationship updated successfully"}

    new_link = ParentStudent(
        parent_id=parent_id,
        student_id=link_data.student_id,
        relationship=link_data.relationship,
        is_primary_contact=link_data.is_primary_contact,
        is_verified=link_data.is_verified,
        verified_at=datetime.utcnow() if link_data.is_verified else None,
        verified_by=admin_user.id if link_data.is_verified else None
    )
    db.add(new_link)
    db.commit()
    return {"message": f"Successfully linked {student.name} to {parent.name}"}

@router.delete("/{parent_id}/unlink-student/{student_id}")
def unlink_student_from_parent(
    parent_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    link = db.query(ParentStudent).filter(
        ParentStudent.parent_id == parent_id,
        ParentStudent.student_id == student_id
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Student is not linked to this parent")

    db.delete(link)
    db.commit()
    return {"message": "Student successfully unlinked from parent profile"}

@router.put("/{parent_id}/toggle-status")
def toggle_parent_status(
    parent_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")

    new_status = "Inactive" if parent.status == "Active" else "Active"
    parent.status = new_status
    if parent.user:
        parent.user.is_active = (new_status == "Active")

    db.commit()
    return {"message": f"Parent status changed to {new_status}", "status": new_status}

@router.post("/{parent_id}/reset-password")
def reset_parent_password(
    parent_id: int,
    reset_data: ParentResetPassword,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent or not parent.user:
        raise HTTPException(status_code=404, detail="Parent account or user not found")

    parent.user.hashed_password = hash_password(reset_data.new_password)
    db.commit()
    return {"message": f"Password for {parent.email} has been securely updated."}

@router.delete("/{parent_id}")
def delete_parent(
    parent_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")

    user = parent.user
    db.delete(parent)
    if user:
        db.delete(user)
    db.commit()
    return {"message": "Parent account removed without modifying student records."}

# Correction Requests for Admin
@router.get("/correction-requests/all", response_model=List[CorrectionRequestResponse])
def get_all_correction_requests(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    query = db.query(ParentCorrectionRequest)
    if status_filter:
        query = query.filter(ParentCorrectionRequest.status == status_filter)

    requests = query.order_by(ParentCorrectionRequest.id.desc()).all()
    results = []
    for r in requests:
        results.append({
            "id": r.id,
            "parent_id": r.parent_id,
            "parent_name": r.parent.name if r.parent else "Unknown",
            "student_id": r.student_id,
            "student_name": r.student.name if r.student else "Unknown",
            "requested_field": r.requested_field,
            "current_value": r.current_value,
            "proposed_value": r.proposed_value,
            "reason": r.reason,
            "status": r.status,
            "admin_notes": r.admin_notes,
            "reviewed_at": r.reviewed_at,
            "created_at": r.created_at
        })
    return results

@router.put("/correction-requests/{request_id}")
def update_correction_request_status(
    request_id: int,
    status_data: CorrectionRequestStatusUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    req = db.query(ParentCorrectionRequest).filter(ParentCorrectionRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Correction request not found")

    req.status = status_data.status
    req.admin_notes = status_data.admin_notes
    req.reviewed_by = admin_user.id
    req.reviewed_at = datetime.utcnow()

    # If approved, update student record if it's a known field
    if status_data.status.lower() == "approved" and req.student:
        field_lower = req.requested_field.lower().replace(" ", "_")
        if field_lower in ["guardian_phone", "phone"]:
            req.student.guardian_phone = req.proposed_value
        elif field_lower in ["guardian_name"]:
            req.student.guardian_name = req.proposed_value

    db.commit()
    return {"message": f"Request marked as {status_data.status}"}
