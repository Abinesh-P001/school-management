from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.core.dependencies import require_parent, get_current_user
from app.models.user import User
from app.models.parent import Parent, ParentStudent, ParentCorrectionRequest
from app.models.student import Student
from app.models.attendance import Attendance
from app.models.examination import Examination, Mark
from app.models.timetable import TimetablePeriod
from app.models.fee import FeeInvoice
from app.schemas.parent import (
    ParentResponse, LinkedStudentInfo,
    CorrectionRequestCreate, CorrectionRequestResponse
)

router = APIRouter(prefix="/parent", tags=["Parent Portal"])

def _get_parent_for_user(user: User, db: Session) -> Parent:
    parent = db.query(Parent).filter(Parent.user_id == user.id).first()
    if not parent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent profile not found for this account."
        )
    if parent.status != "Active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Parent account is currently inactive. Please contact school administration."
        )
    return parent

def _verify_child_access(parent: Parent, student_id: int, db: Session) -> Student:
    """Strict authorization check: verify parent is linked to this specific student."""
    link = db.query(ParentStudent).filter(
        ParentStudent.parent_id == parent.id,
        ParentStudent.student_id == student_id,
        ParentStudent.is_verified == True
    ).first()
    if not link:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You do not have verified access to this student's records."
        )
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found."
        )
    return student

@router.get("/me")
def get_parent_me(
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    parent = _get_parent_for_user(current_user, db)
    children = []
    for ps in parent.parent_students:
        st = ps.student
        if st and ps.is_verified:
            children.append({
                "id": st.id,
                "student_id": st.student_id,
                "name": st.name,
                "admission_number": st.admission_number,
                "roll_number": st.roll_number,
                "class_id": st.class_id,
                "grade": st.classroom.name if st.classroom else None,
                "section": st.classroom.section if st.classroom else None,
                "gender": st.gender,
                "fees_status": st.fees_status,
                "relationship": ps.relationship,
                "is_primary_contact": ps.is_primary_contact,
                "is_verified": ps.is_verified
            })
    return {
        "id": parent.id,
        "user_id": parent.user_id,
        "parent_code": parent.parent_code,
        "name": parent.name,
        "email": parent.email,
        "phone": parent.phone,
        "alternate_phone": parent.alternate_phone,
        "relationship_type": parent.relationship_type,
        "address": parent.address,
        "occupation": parent.occupation,
        "status": parent.status,
        "children": children
    }

@router.get("/children")
def get_parent_children(
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    parent = _get_parent_for_user(current_user, db)
    children = []
    for ps in parent.parent_students:
        st = ps.student
        if st and ps.is_verified:
            children.append({
                "id": st.id,
                "student_id": st.student_id,
                "name": st.name,
                "admission_number": st.admission_number,
                "roll_number": st.roll_number,
                "class_id": st.class_id,
                "grade": st.classroom.name if st.classroom else None,
                "section": st.classroom.section if st.classroom else None,
                "gender": st.gender,
                "fees_status": st.fees_status,
                "relationship": ps.relationship,
                "is_primary_contact": ps.is_primary_contact
            })
    return children

@router.get("/children/{student_id}")
def get_child_profile(
    student_id: int,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    parent = _get_parent_for_user(current_user, db)
    student = _verify_child_access(parent, student_id, db)
    return {
        "id": student.id,
        "student_id": student.student_id,
        "admission_number": student.admission_number,
        "roll_number": student.roll_number,
        "name": student.name,
        "email": student.email,
        "gender": student.gender,
        "date_of_birth": student.date_of_birth.isoformat() if student.date_of_birth else None,
        "guardian_name": student.guardian_name,
        "guardian_phone": student.guardian_phone,
        "admission_date": student.admission_date.isoformat() if student.admission_date else None,
        "status": student.status,
        "fees_status": student.fees_status,
        "class_id": student.class_id,
        "grade": student.classroom.name if student.classroom else None,
        "section": student.classroom.section if student.classroom else None,
        "room_number": student.classroom.room if student.classroom else None
    }

@router.get("/children/{student_id}/attendance")
def get_child_attendance(
    student_id: int,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    parent = _get_parent_for_user(current_user, db)
    student = _verify_child_access(parent, student_id, db)

    records = db.query(Attendance).filter(
        Attendance.student_id == student.id
    ).order_by(desc(Attendance.date)).all()

    total_days = len(records)
    present_days = sum(1 for r in records if r.status.lower() == "present")
    absent_days = sum(1 for r in records if r.status.lower() == "absent")
    late_days = sum(1 for r in records if r.status.lower() == "late")
    attendance_rate = round((present_days / total_days * 100), 1) if total_days > 0 else 100.0

    today = date.today()
    today_rec = next((r for r in records if r.date == today), None)
    today_status = today_rec.status if today_rec else "Not Recorded"

    return {
        "student_id": student.id,
        "student_name": student.name,
        "today_status": today_status,
        "total_days": total_days,
        "present_days": present_days,
        "absent_days": absent_days,
        "late_days": late_days,
        "attendance_rate": f"{attendance_rate}%",
        "history": [
            {
                "id": r.id,
                "date": r.date.isoformat(),
                "status": r.status,
                "remarks": r.remarks
            }
            for r in records[:60]
        ]
    }

@router.get("/children/{student_id}/results")
def get_child_results(
    student_id: int,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    """
    CRITICAL REQUIREMENT:
    Return marks ONLY for published examinations.
    Draft, locked, or unpublished exam marks are strictly excluded.
    """
    parent = _get_parent_for_user(current_user, db)
    student = _verify_child_access(parent, student_id, db)

    marks = db.query(Mark).join(Examination).filter(
        Mark.student_id == student.id,
        Examination.status == "Published"
    ).order_by(desc(Examination.exam_date)).all()

    results = []
    for m in marks:
        exam = m.examination
        results.append({
            "mark_id": m.id,
            "examination_id": exam.id,
            "exam_code": exam.exam_code,
            "exam_name": exam.name,
            "exam_type": exam.exam_type,
            "subject": exam.subject,
            "exam_date": exam.exam_date.isoformat() if exam.exam_date else None,
            "total_marks": exam.total_marks,
            "passing_marks": exam.passing_marks,
            "marks_obtained": float(m.marks_obtained) if m.marks_obtained is not None else 0.0,
            "percentage": round((float(m.marks_obtained or 0) / exam.total_marks) * 100, 1) if exam.total_marks > 0 else 0,
            "grade": m.grade,
            "status": m.status,
            "is_absent": m.is_absent,
            "remarks": m.remarks,
            "academic_year": exam.academic_year
        })

    # Also retrieve upcoming published examinations for this student's class
    upcoming_exams = []
    if student.class_id:
        today = date.today()
        upcoming = db.query(Examination).filter(
            Examination.class_id == student.class_id,
            Examination.exam_date >= today
        ).order_by(Examination.exam_date.asc()).limit(5).all()

        for u in upcoming:
            upcoming_exams.append({
                "id": u.id,
                "exam_code": u.exam_code,
                "name": u.name,
                "subject": u.subject,
                "exam_date": u.exam_date.isoformat(),
                "time_slot": u.time_slot,
                "total_marks": u.total_marks,
                "passing_marks": u.passing_marks,
                "status": u.status
            })

    return {
        "student_id": student.id,
        "student_name": student.name,
        "results": results,
        "upcoming_exams": upcoming_exams
    }

@router.get("/children/{student_id}/timetable")
def get_child_timetable(
    student_id: int,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    parent = _get_parent_for_user(current_user, db)
    student = _verify_child_access(parent, student_id, db)

    if not student.class_id:
        return {"student_id": student.id, "timetable": []}

    periods = db.query(TimetablePeriod).filter(
        TimetablePeriod.class_id == student.class_id
    ).order_by(TimetablePeriod.day_of_week, TimetablePeriod.period_number).all()

    formatted = []
    for p in periods:
        formatted.append({
            "id": p.id,
            "academic_year": p.academic_year,
            "day_of_week": p.day_of_week,
            "period_number": p.period_number,
            "start_time": p.start_time,
            "end_time": p.end_time,
            "subject": p.subject,
            "room": p.room,
            "teacher_name": p.teacher.name if p.teacher else "Faculty Instructor",
            "is_break": p.is_break
        })

    return {
        "student_id": student.id,
        "student_name": student.name,
        "grade": student.classroom.name if student.classroom else None,
        "section": student.classroom.section if student.classroom else None,
        "timetable": formatted
    }

@router.get("/children/{student_id}/fees")
def get_child_fees(
    student_id: int,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    parent = _get_parent_for_user(current_user, db)
    student = _verify_child_access(parent, student_id, db)

    invoices = db.query(FeeInvoice).filter(
        FeeInvoice.student_id == student.id
    ).order_by(desc(FeeInvoice.due_date)).all()

    total_billed = sum(float(inv.amount) for inv in invoices)
    total_paid = sum(float(inv.amount) for inv in invoices if inv.status.lower() == "paid")
    outstanding_balance = total_billed - total_paid

    return {
        "student_id": student.id,
        "student_name": student.name,
        "total_billed": total_billed,
        "total_paid": total_paid,
        "outstanding_balance": outstanding_balance,
        "fees_status": student.fees_status,
        "invoices": [
            {
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "fee_type": inv.fee_type,
                "amount": float(inv.amount),
                "due_date": inv.due_date.isoformat(),
                "paid_date": inv.paid_date.isoformat() if inv.paid_date else None,
                "status": inv.status,
                "payment_method": inv.payment_method,
                "notes": inv.notes
            }
            for inv in invoices
        ]
    }

@router.post("/profile-correction-requests", status_code=status.HTTP_201_CREATED)
def submit_profile_correction_request(
    request_in: CorrectionRequestCreate,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    parent = _get_parent_for_user(current_user, db)
    student = _verify_child_access(parent, request_in.student_id, db)

    corr = ParentCorrectionRequest(
        parent_id=parent.id,
        student_id=student.id,
        requested_field=request_in.requested_field,
        current_value=request_in.current_value,
        proposed_value=request_in.proposed_value,
        reason=request_in.reason,
        status="Pending"
    )
    db.add(corr)
    db.commit()
    db.refresh(corr)
    return {
        "message": "Correction request submitted successfully. School administration will review the change.",
        "request_id": corr.id
    }

@router.get("/profile-correction-requests")
def get_parent_correction_requests(
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db)
):
    parent = _get_parent_for_user(current_user, db)
    requests = db.query(ParentCorrectionRequest).filter(
        ParentCorrectionRequest.parent_id == parent.id
    ).order_by(desc(ParentCorrectionRequest.created_at)).all()

    return [
        {
            "id": r.id,
            "student_id": r.student_id,
            "student_name": r.student.name if r.student else "Unknown",
            "requested_field": r.requested_field,
            "current_value": r.current_value,
            "proposed_value": r.proposed_value,
            "reason": r.reason,
            "status": r.status,
            "admin_notes": r.admin_notes,
            "created_at": r.created_at
        }
        for r in requests
    ]
