import os
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, asc

from app.database import get_db
from app.models.examination import Examination, Mark, GradingRule, MarkAuditLog
from app.models.classroom import Classroom
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.parent import Parent, ParentStudent
from app.models.user import User, UserRole
from app.models.teacher_subject_assignment import TeacherSubjectAssignment
from app.schemas.examination import (
    ExamCreate,
    ExamUpdate,
    ExamResponse,
    MarkCreate,
    MarkResponse,
    BulkMarksSubmit,
    GradingRuleResponse,
    GradingRuleBase,
    ClassResultsSummary,
    ClassStudentResult,
    StudentReportCardResponse,
    ReportCardSubjectItem,
    MarkAuditLogResponse
)
from app.core.dependencies import get_current_user, require_admin, require_teacher
from app.core.teacher_auth import (
    get_teacher_for_user,
    get_teacher_assigned_class_ids,
    is_teacher_assigned_to_class,
    is_teacher_assigned_to_subject
)

router = APIRouter(prefix="/examinations", tags=["Examinations & Marks"])

# ------------------------------------------------------------------------------
# Helpers: Grading, Permissions & Audit Logging
# ------------------------------------------------------------------------------

def generate_exam_code(db: Session, prefix: str = "EXM") -> str:
    count = db.query(Examination).count() + 1
    return f"{prefix}-{datetime.utcnow().year}-{count:03d}"

def calculate_grade_and_status(
    score: Optional[Decimal],
    total: int,
    pass_mark: int,
    is_absent: bool,
    db: Session
) -> tuple[str, str, Optional[float]]:
    """
    Dynamically computes grade, status and percentage based on configured GradingRule records.
    """
    if is_absent or score is None:
        return "AB", "Absent", None

    if total <= 0:
        return "F", "Failed", 0.0

    pct = round(float((score / Decimal(total)) * Decimal(100)), 2)
    passed = score >= Decimal(pass_mark)
    default_status = "Passed" if passed else "Failed"

    # Query configured grading rules ordered from highest to lowest
    rules = db.query(GradingRule).order_by(desc(GradingRule.min_percentage)).all()
    if rules:
        for r in rules:
            min_p = float(r.min_percentage)
            max_p = float(r.max_percentage)
            if min_p <= pct <= max_p:
                status_str = "Passed" if r.is_passing and passed else "Failed"
                return r.grade, status_str, pct

    # Fallback to standard scale if no rules configured
    if pct >= 90:
        grade = "A+"
    elif pct >= 80:
        grade = "A"
    elif pct >= 70:
        grade = "B+"
    elif pct >= 60:
        grade = "B"
    elif pct >= 50:
        grade = "C"
    elif pct >= 40:
        grade = "D"
    else:
        grade = "F"

    return grade, default_status, pct

def verify_teacher_exam_permission(current_user: User, exam: Examination, db: Session) -> Teacher:
    """
    Verifies that a teacher is authorized to enter marks for this specific exam and subject.
    Admins are always authorized.
    """
    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role == UserRole.ADMIN.value:
        return None

    teacher = db.query(Teacher).filter(
        or_(Teacher.user_id == current_user.id, Teacher.email == current_user.email)
    ).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teacher profile not found for current user account."
        )

    # Check if teacher is class mentor of this classroom
    cls = db.query(Classroom).filter(Classroom.id == exam.class_id).first()
    is_mentor = cls and cls.class_teacher_id == teacher.id

    # Check if teacher is assigned to this class and subject
    is_subject_teacher = db.query(TeacherSubjectAssignment).filter(
        TeacherSubjectAssignment.teacher_id == teacher.id,
        TeacherSubjectAssignment.class_id == exam.class_id,
        TeacherSubjectAssignment.subject.ilike(exam.subject)
    ).first() is not None

    if not (is_mentor or is_subject_teacher):
        cls_name = f"{cls.name} {cls.section}" if cls else f"Class #{exam.class_id}"
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: You are not assigned to teach '{exam.subject}' for {cls_name}."
        )

    return teacher

def record_audit_log(
    db: Session,
    examination_id: int,
    student_id: int,
    action: str,
    current_user: User,
    mark_id: Optional[int] = None,
    old_marks: Optional[Decimal] = None,
    new_marks: Optional[Decimal] = None,
    old_status: Optional[str] = None,
    new_status: Optional[str] = None,
    remarks: Optional[str] = None
):
    """Creates an immutable audit record for grade modification."""
    log = MarkAuditLog(
        mark_id=mark_id,
        examination_id=examination_id,
        student_id=student_id,
        old_marks=old_marks,
        new_marks=new_marks,
        old_status=old_status,
        new_status=new_status,
        action=action,
        changed_by=current_user.id,
        changed_by_email=current_user.email,
        remarks=remarks
    )
    db.add(log)


# ------------------------------------------------------------------------------
# 1. Examinations CRUD & Class/Section Isolation
# ------------------------------------------------------------------------------

@router.get(
    "/",
    response_model=List[ExamResponse],
    summary="List examinations with strict class and section filters"
)
@router.get(
    "",
    response_model=List[ExamResponse],
    include_in_schema=False
)
def list_examinations(
    academic_year: Optional[str] = Query(None, description="Academic year filter, e.g. '2026-2027'"),
    class_id: Optional[int] = Query(None, description="Class ID filter"),
    section: Optional[str] = Query(None, description="Section filter, e.g. 'A'"),
    exam_type: Optional[str] = Query(None, description="Exam type filter"),
    subject: Optional[str] = Query(None, description="Subject filter"),
    status_filter: Optional[str] = Query(None, alias="status", description="Status filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Examination).join(Classroom, Examination.class_id == Classroom.id)

    # Privacy Protection: If student, restrict to their class and only published exams
    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role == UserRole.STUDENT.value:
        student = db.query(Student).filter(
            or_(Student.user_id == current_user.id, Student.email == current_user.email)
        ).first()
        if not student or not student.class_id:
            return []
        query = query.filter(
            Examination.class_id == student.class_id,
            or_(Examination.status.in_(["Published", "Completed"]), Examination.is_locked == True)
        )
    elif user_role == UserRole.TEACHER.value:
        teacher = get_teacher_for_user(current_user, db)
        if not teacher:
            return []
        assigned_ids = get_teacher_assigned_class_ids(teacher.id, db)
        if not assigned_ids:
            return []
        if class_id:
            if class_id not in assigned_ids:
                return []
            query = query.filter(Examination.class_id == class_id)
        else:
            query = query.filter(Examination.class_id.in_(list(assigned_ids)))
        if section:
            query = query.filter(or_(Examination.section == section, Examination.section == None))
    else:
        # Admins
        if class_id:
            query = query.filter(Examination.class_id == class_id)
        if section:
            query = query.filter(or_(Examination.section == section, Examination.section == None))

    if academic_year:
        query = query.filter(Examination.academic_year == academic_year)
    if exam_type and exam_type != "All":
        query = query.filter(Examination.exam_type == exam_type)
    if subject and subject != "All":
        query = query.filter(Examination.subject.ilike(f"%{subject.strip()}%"))
    if status_filter and status_filter != "All":
        query = query.filter(Examination.status == status_filter)

    exams = query.order_by(desc(Examination.exam_date), asc(Examination.subject)).all()
    results = []
    for ex in exams:
        cls = ex.classroom
        cls_str = f"{cls.name} - {cls.section}" if cls else "Unknown Class"
        results.append(ExamResponse(
            id=ex.id,
            exam_code=ex.exam_code,
            name=ex.name,
            academic_year=ex.academic_year,
            class_id=ex.class_id,
            section=ex.section,
            exam_type=ex.exam_type,
            subject=ex.subject,
            exam_date=ex.exam_date,
            start_date=ex.start_date,
            end_date=ex.end_date,
            time_slot=ex.time_slot,
            total_marks=ex.total_marks,
            passing_marks=ex.passing_marks,
            status=ex.status,
            is_locked=ex.is_locked,
            class_name=cls_str,
            published_at=ex.published_at,
            created_at=ex.created_at,
            updated_at=ex.updated_at
        ))
    return results

@router.post(
    "",
    response_model=ExamResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new examination for a specific class/section"
)
@router.post(
    "/",
    response_model=ExamResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False
)
def create_examination(
    payload: ExamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    cls = db.query(Classroom).filter(Classroom.id == payload.class_id).first()
    if not cls:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class with ID {payload.class_id} not found."
        )

    # Permission check for teachers: verify assignment to class and subject
    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role == UserRole.TEACHER.value:
        teacher = db.query(Teacher).filter(
            or_(Teacher.user_id == current_user.id, Teacher.email == current_user.email)
        ).first()
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Teacher profile not found for current user account."
            )
        is_mentor = cls.class_teacher_id == teacher.id
        is_subject_teacher = db.query(TeacherSubjectAssignment).filter(
            TeacherSubjectAssignment.teacher_id == teacher.id,
            TeacherSubjectAssignment.class_id == payload.class_id,
            TeacherSubjectAssignment.subject.ilike(payload.subject)
        ).first() is not None
        if not (is_mentor or is_subject_teacher):
            cls_name = f"{cls.name} {cls.section}" if cls else f"Class #{payload.class_id}"
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: You are not assigned to teach '{payload.subject}' for {cls_name}."
            )

    # Validate marks
    if payload.passing_marks > payload.total_marks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passing marks cannot exceed total maximum marks."
        )

    exam_code = payload.exam_code or generate_exam_code(db)
    if db.query(Examination).filter(Examination.exam_code == exam_code).first():
        exam_code = f"{exam_code}-{db.query(Examination).count() + 1}"

    exam = Examination(
        exam_code=exam_code,
        name=payload.name,
        academic_year=payload.academic_year or "2026-2027",
        class_id=payload.class_id,
        section=payload.section or cls.section,
        exam_type=payload.exam_type or "Term Exam",
        subject=payload.subject,
        exam_date=payload.exam_date,
        start_date=payload.start_date or payload.exam_date,
        end_date=payload.end_date or payload.exam_date,
        time_slot=payload.time_slot or "09:00 AM - 12:00 PM",
        total_marks=payload.total_marks,
        passing_marks=payload.passing_marks,
        status=payload.status or "Draft",
        is_locked=payload.is_locked or False,
        created_by=current_user.id
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)

    cls_str = f"{cls.name} - {cls.section}"
    return ExamResponse(
        id=exam.id,
        exam_code=exam.exam_code,
        name=exam.name,
        academic_year=exam.academic_year,
        class_id=exam.class_id,
        section=exam.section,
        exam_type=exam.exam_type,
        subject=exam.subject,
        exam_date=exam.exam_date,
        start_date=exam.start_date,
        end_date=exam.end_date,
        time_slot=exam.time_slot,
        total_marks=exam.total_marks,
        passing_marks=exam.passing_marks,
        status=exam.status,
        is_locked=exam.is_locked,
        class_name=cls_str,
        published_at=exam.published_at,
        created_at=exam.created_at,
        updated_at=exam.updated_at
    )

@router.put(
    "/{exam_id}",
    response_model=ExamResponse,
    summary="Update examination configuration (Admin & Authorized Teachers)"
)
def update_examination(
    exam_id: int,
    payload: ExamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    exam = db.query(Examination).filter(Examination.id == exam_id).first()
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Examination with ID {exam_id} not found."
        )

    verify_teacher_exam_permission(current_user, exam, db)

    if payload.total_marks is not None and payload.passing_marks is not None:
        if payload.passing_marks > payload.total_marks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Passing marks cannot exceed total maximum marks."
            )

    for field, val in payload.dict(exclude_unset=True).items():
        setattr(exam, field, val)

    exam.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(exam)

    cls = exam.classroom
    cls_str = f"{cls.name} - {cls.section}" if cls else "Unknown Class"
    return ExamResponse(
        id=exam.id,
        exam_code=exam.exam_code,
        name=exam.name,
        academic_year=exam.academic_year,
        class_id=exam.class_id,
        section=exam.section,
        exam_type=exam.exam_type,
        subject=exam.subject,
        exam_date=exam.exam_date,
        start_date=exam.start_date,
        end_date=exam.end_date,
        time_slot=exam.time_slot,
        total_marks=exam.total_marks,
        passing_marks=exam.passing_marks,
        status=exam.status,
        is_locked=exam.is_locked,
        class_name=cls_str,
        published_at=exam.published_at,
        created_at=exam.created_at,
        updated_at=exam.updated_at
    )

@router.delete(
    "/{exam_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete examination and associated marks (Admin only)"
)
def delete_examination(
    exam_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    exam = db.query(Examination).filter(Examination.id == exam_id).first()
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Examination with ID {exam_id} not found."
        )
    db.delete(exam)
    db.commit()
    return {"message": f"Examination '{exam.name}' and all associated marks successfully deleted."}


# ------------------------------------------------------------------------------
# 2. Lock, Publish, and Reopen Examination Results
# ------------------------------------------------------------------------------

@router.post(
    "/{exam_id}/lock",
    summary="Lock marks editing for an examination (Admin only)"
)
def lock_examination(
    exam_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    exam = db.query(Examination).filter(Examination.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found.")
    exam.is_locked = True
    exam.updated_at = datetime.utcnow()
    db.commit()
    return {"message": f"Marks for '{exam.name}' ({exam.subject}) are now locked."}

@router.post(
    "/{exam_id}/publish",
    summary="Publish examination results (Admin only)"
)
def publish_examination(
    exam_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    exam = db.query(Examination).filter(Examination.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found.")
    exam.status = "Published"
    exam.published_at = datetime.utcnow()
    exam.is_locked = True
    exam.updated_at = datetime.utcnow()
    db.commit()
    return {"message": f"Results for '{exam.name}' ({exam.subject}) published to students."}

@router.post(
    "/{exam_id}/reopen",
    summary="Reopen locked examination marks for corrections (Admin only)"
)
def reopen_examination(
    exam_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    exam = db.query(Examination).filter(Examination.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found.")
    exam.is_locked = False
    exam.updated_at = datetime.utcnow()
    db.commit()
    return {"message": f"Examination '{exam.name}' ({exam.subject}) unlocked for editing."}


# ------------------------------------------------------------------------------
# 3. Marks Entry & Upsertion (Subject-Wise, Class/Section Isolated)
# ------------------------------------------------------------------------------

@router.get(
    "/{exam_id}/marks",
    response_model=List[MarkResponse],
    summary="Get marks for an exam including all enrolled students ready for marks entry"
)
def get_exam_marks(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exam = db.query(Examination).filter(Examination.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail=f"Examination with ID {exam_id} not found.")

    cls = exam.classroom
    cls_name = cls.name if cls else "Unknown"
    sec = cls.section if cls else "A"

    # Privacy Protection
    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role == UserRole.STUDENT.value:
        if not (exam.status in ["Published", "Completed"] or exam.is_locked):
            raise HTTPException(status_code=403, detail="Results for this examination have not been published yet.")
        student_profile = db.query(Student).filter(
            or_(Student.user_id == current_user.id, Student.email == current_user.email)
        ).first()
        if not student_profile:
            return []
        marks = db.query(Mark).filter(
            Mark.examination_id == exam_id,
            Mark.student_id == student_profile.id
        ).all()
    elif user_role == UserRole.TEACHER.value:
        teacher = get_teacher_for_user(current_user, db)
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Teacher profile not found for current user account."
            )
        if not is_teacher_assigned_to_class(teacher.id, exam.class_id, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: You are not assigned to {cls_name}."
            )
        marks = db.query(Mark).filter(Mark.examination_id == exam_id).all()
    else:
        # Admins: load marks for this exam
        marks = db.query(Mark).filter(Mark.examination_id == exam_id).all()

    # Map existing marks by student_id
    marks_by_student = {m.student_id: m for m in marks}

    # Fetch all students officially enrolled in this exam's class
    enrolled_students = db.query(Student).filter(Student.class_id == exam.class_id).order_by(
        asc(Student.roll_number), asc(Student.name)
    ).all()

    results = []
    # If student, only return their single mark
    if user_role == UserRole.STUDENT.value:
        for m in marks:
            st = m.student
            pct = round((float(m.marks_obtained) / exam.total_marks) * 100, 2) if m.marks_obtained is not None else None
            results.append(MarkResponse(
                id=m.id,
                examination_id=m.examination_id,
                student_id=m.student_id,
                marks_obtained=float(m.marks_obtained) if m.marks_obtained is not None else None,
                is_absent=m.is_absent,
                percentage=pct,
                grade=m.grade,
                status=m.status,
                remarks=m.remarks,
                student_name=st.name if st else "Student",
                student_code=st.student_id if st else None,
                roll_number=st.roll_number if st else None,
                admission_number=st.admission_number if st else None,
                class_name=cls_name,
                section=sec,
                exam_name=exam.name,
                subject=exam.subject,
                max_marks=exam.total_marks,
                passing_marks=exam.passing_marks,
                is_locked=exam.is_locked,
                updated_at=m.updated_at
            ))
        return results

    # For Teachers / Admin: ensure all enrolled students are listed (with existing mark or blank placeholder)
    for st in enrolled_students:
        m = marks_by_student.get(st.id)
        if m:
            pct = round((float(m.marks_obtained) / exam.total_marks) * 100, 2) if m.marks_obtained is not None else None
            results.append(MarkResponse(
                id=m.id,
                examination_id=exam.id,
                student_id=st.id,
                marks_obtained=float(m.marks_obtained) if m.marks_obtained is not None else None,
                is_absent=m.is_absent,
                percentage=pct,
                grade=m.grade,
                status=m.status,
                remarks=m.remarks,
                student_name=st.name,
                student_code=st.student_id,
                roll_number=st.roll_number,
                admission_number=st.admission_number,
                class_name=cls_name,
                section=sec,
                exam_name=exam.name,
                subject=exam.subject,
                max_marks=exam.total_marks,
                passing_marks=exam.passing_marks,
                is_locked=exam.is_locked,
                updated_at=m.updated_at
            ))
        else:
            # Unentered student placeholder
            results.append(MarkResponse(
                id=0,
                examination_id=exam.id,
                student_id=st.id,
                marks_obtained=None,
                is_absent=False,
                percentage=None,
                grade="--",
                status="Pending",
                remarks=None,
                student_name=st.name,
                student_code=st.student_id,
                roll_number=st.roll_number,
                admission_number=st.admission_number,
                class_name=cls_name,
                section=sec,
                exam_name=exam.name,
                subject=exam.subject,
                max_marks=exam.total_marks,
                passing_marks=exam.passing_marks,
                is_locked=exam.is_locked,
                updated_at=None
            ))

    return results

@router.post(
    "/{exam_id}/marks",
    response_model=MarkResponse,
    status_code=status.HTTP_200_OK,
    summary="Record or update single student exam mark (Upsert with Audit Log)"
)
def record_student_mark(
    exam_id: int,
    mark_in: MarkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    exam = db.query(Examination).filter(Examination.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found.")

    verify_teacher_exam_permission(current_user, exam, db)

    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if exam.is_locked and user_role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This examination is locked. Contact an administrator to make changes."
        )

    student = db.query(Student).filter(Student.id == mark_in.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    # Strict class enrollment verification: Student MUST be enrolled in exam's class
    if student.class_id != exam.class_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Enrollment mismatch: Student {student.name} is not enrolled in this class."
        )

    # Validate marks obtained
    if not mark_in.is_absent:
        if mark_in.marks_obtained is None:
            raise HTTPException(status_code=400, detail="Marks obtained required for present student.")
        if mark_in.marks_obtained < Decimal("0"):
            raise HTTPException(status_code=400, detail="Marks obtained cannot be negative.")
        if mark_in.marks_obtained > Decimal(str(exam.total_marks)):
            raise HTTPException(
                status_code=400,
                detail=f"Marks obtained ({mark_in.marks_obtained}) cannot exceed total marks ({exam.total_marks})."
            )

    grade, pass_status, pct = calculate_grade_and_status(
        mark_in.marks_obtained,
        exam.total_marks,
        exam.passing_marks,
        mark_in.is_absent,
        db
    )

    existing = db.query(Mark).filter(
        Mark.examination_id == exam.id,
        Mark.student_id == student.id
    ).first()

    if existing:
        old_marks = existing.marks_obtained
        old_status = existing.status
        existing.marks_obtained = mark_in.marks_obtained if not mark_in.is_absent else Decimal("0")
        existing.is_absent = mark_in.is_absent
        existing.grade = grade
        existing.status = pass_status
        existing.remarks = mark_in.remarks
        existing.updated_at = datetime.utcnow()
        existing.updated_by = current_user.id
        db.commit()
        db.refresh(existing)
        target = existing

        record_audit_log(
            db=db,
            examination_id=exam.id,
            student_id=student.id,
            action="UPDATED",
            current_user=current_user,
            mark_id=target.id,
            old_marks=old_marks,
            new_marks=target.marks_obtained,
            old_status=old_status,
            new_status=pass_status,
            remarks=mark_in.remarks
        )
        db.commit()
    else:
        new_mark = Mark(
            examination_id=exam.id,
            student_id=student.id,
            marks_obtained=mark_in.marks_obtained if not mark_in.is_absent else Decimal("0"),
            is_absent=mark_in.is_absent,
            grade=grade,
            status=pass_status,
            remarks=mark_in.remarks,
            updated_by=current_user.id
        )
        db.add(new_mark)
        db.commit()
        db.refresh(new_mark)
        target = new_mark

        record_audit_log(
            db=db,
            examination_id=exam.id,
            student_id=student.id,
            action="CREATED",
            current_user=current_user,
            mark_id=target.id,
            new_marks=target.marks_obtained,
            new_status=pass_status,
            remarks=mark_in.remarks
        )
        db.commit()

    cls = exam.classroom
    return MarkResponse(
        id=target.id,
        examination_id=exam.id,
        student_id=student.id,
        marks_obtained=float(target.marks_obtained) if target.marks_obtained is not None else None,
        is_absent=target.is_absent,
        percentage=pct,
        grade=target.grade,
        status=target.status,
        remarks=target.remarks,
        student_name=student.name,
        student_code=student.student_id,
        roll_number=student.roll_number,
        admission_number=student.admission_number,
        class_name=cls.name if cls else None,
        section=cls.section if cls else None,
        exam_name=exam.name,
        subject=exam.subject,
        max_marks=exam.total_marks,
        passing_marks=exam.passing_marks,
        is_locked=exam.is_locked,
        updated_at=target.updated_at
    )

@router.post(
    "/{exam_id}/bulk-marks",
    summary="Bulk submit / save marks for entire class roster"
)
def bulk_save_marks(
    exam_id: int,
    payload: BulkMarksSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    exam = db.query(Examination).filter(Examination.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found.")

    verify_teacher_exam_permission(current_user, exam, db)

    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if exam.is_locked and user_role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This examination is locked. Contact an administrator to make changes."
        )

    saved_count = 0
    for item in payload.marks:
        student = db.query(Student).filter(Student.id == item.student_id).first()
        if not student or student.class_id != exam.class_id:
            continue

        if not item.is_absent:
            if item.marks_obtained is None:
                continue
            if item.marks_obtained < Decimal("0") or item.marks_obtained > Decimal(str(exam.total_marks)):
                continue

        grade, pass_status, _ = calculate_grade_and_status(
            item.marks_obtained,
            exam.total_marks,
            exam.passing_marks,
            item.is_absent,
            db
        )

        existing = db.query(Mark).filter(
            Mark.examination_id == exam.id,
            Mark.student_id == student.id
        ).first()

        if existing:
            old_score = existing.marks_obtained
            old_st = existing.status
            existing.marks_obtained = item.marks_obtained if not item.is_absent else Decimal("0")
            existing.is_absent = item.is_absent
            existing.grade = grade
            existing.status = pass_status
            existing.remarks = item.remarks
            existing.updated_at = datetime.utcnow()
            existing.updated_by = current_user.id
            record_audit_log(
                db=db,
                examination_id=exam.id,
                student_id=student.id,
                action="BULK_UPDATED",
                current_user=current_user,
                mark_id=existing.id,
                old_marks=old_score,
                new_marks=existing.marks_obtained,
                old_status=old_st,
                new_status=pass_status
            )
        else:
            new_mark = Mark(
                examination_id=exam.id,
                student_id=student.id,
                marks_obtained=item.marks_obtained if not item.is_absent else Decimal("0"),
                is_absent=item.is_absent,
                grade=grade,
                status=pass_status,
                remarks=item.remarks,
                updated_by=current_user.id
            )
            db.add(new_mark)
            db.flush()
            record_audit_log(
                db=db,
                examination_id=exam.id,
                student_id=student.id,
                action="BULK_CREATED",
                current_user=current_user,
                mark_id=new_mark.id,
                new_marks=new_mark.marks_obtained,
                new_status=pass_status
            )
        saved_count += 1

    db.commit()
    return {"message": f"Successfully processed marks for {saved_count} students.", "saved_count": saved_count}


# ------------------------------------------------------------------------------
# 4. Results & Automatic Class Ranking
# ------------------------------------------------------------------------------

@router.get(
    "/{exam_id}/results",
    response_model=ClassResultsSummary,
    summary="Compute class-wide examination results and ranks"
)
def get_examination_results_summary(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exam = db.query(Examination).filter(Examination.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found.")

    cls = exam.classroom
    cls_name = cls.name if cls else "Unknown Class"
    sec = cls.section if cls else "A"

    # Fetch all students in class
    students = db.query(Student).filter(Student.class_id == exam.class_id).all()
    marks = db.query(Mark).filter(Mark.examination_id == exam.id).all()
    marks_map = {m.student_id: m for m in marks}

    student_results: List[ClassStudentResult] = []
    scores_for_stats = []

    for s in students:
        m = marks_map.get(s.id)
        if m and not m.is_absent and m.marks_obtained is not None:
            obtained = float(m.marks_obtained)
            scores_for_stats.append(obtained)
            pct = round((obtained / exam.total_marks) * 100, 2)
            student_results.append(ClassStudentResult(
                student_id=s.id,
                student_name=s.name,
                student_code=s.student_id,
                admission_number=s.admission_number,
                roll_number=s.roll_number,
                total_max_marks=exam.total_marks,
                total_marks_obtained=obtained,
                overall_percentage=pct,
                overall_grade=m.grade,
                overall_status=m.status,
                rank=None,
                is_absent_all=False,
                subjects_count=1,
                passed_subjects_count=1 if m.status == "Passed" else 0
            ))
        elif m and m.is_absent:
            student_results.append(ClassStudentResult(
                student_id=s.id,
                student_name=s.name,
                student_code=s.student_id,
                admission_number=s.admission_number,
                roll_number=s.roll_number,
                total_max_marks=exam.total_marks,
                total_marks_obtained=0.0,
                overall_percentage=0.0,
                overall_grade="AB",
                overall_status="Absent",
                rank=None,
                is_absent_all=True,
                subjects_count=1,
                passed_subjects_count=0
            ))
        else:
            student_results.append(ClassStudentResult(
                student_id=s.id,
                student_name=s.name,
                student_code=s.student_id,
                admission_number=s.admission_number,
                roll_number=s.roll_number,
                total_max_marks=exam.total_marks,
                total_marks_obtained=0.0,
                overall_percentage=0.0,
                overall_grade="--",
                overall_status="Pending",
                rank=None,
                is_absent_all=False,
                subjects_count=1,
                passed_subjects_count=0
            ))

    # Calculate Rankings: sort present students by score descending
    present_results = [r for r in student_results if not r.is_absent_all and r.overall_status != "Pending"]
    present_results.sort(key=lambda x: x.total_marks_obtained, reverse=True)

    current_rank = 1
    for idx, r in enumerate(present_results):
        if idx > 0 and r.total_marks_obtained < present_results[idx - 1].total_marks_obtained:
            current_rank = idx + 1
        r.rank = current_rank

    # Statistics
    total_enrolled = len(students)
    appeared = len(scores_for_stats)
    absent_cnt = sum(1 for r in student_results if r.is_absent_all)
    passed_cnt = sum(1 for r in student_results if r.overall_status == "Passed")
    failed_cnt = sum(1 for r in student_results if r.overall_status == "Failed")
    pass_pct = round((passed_cnt / appeared * 100), 2) if appeared > 0 else 0.0
    avg_score = round(sum(scores_for_stats) / appeared, 2) if appeared > 0 else 0.0
    hi_score = max(scores_for_stats) if scores_for_stats else 0.0
    lo_score = min(scores_for_stats) if scores_for_stats else 0.0

    return ClassResultsSummary(
        class_id=exam.class_id,
        class_name=cls_name,
        section=sec,
        academic_year=exam.academic_year,
        examination_name=exam.name,
        total_enrolled=total_enrolled,
        appeared_count=appeared,
        absent_count=absent_cnt,
        passed_count=passed_cnt,
        failed_count=failed_cnt,
        pass_percentage=pass_pct,
        class_average=avg_score,
        highest_score=hi_score,
        lowest_score=lo_score,
        results=student_results
    )


# ------------------------------------------------------------------------------
# 5. Report Cards Generation (Class-Wide & Single Student)
# ------------------------------------------------------------------------------

@router.get(
    "/{exam_id}/report-cards",
    response_model=List[StudentReportCardResponse],
    summary="Generate official student report cards for an examination"
)
def get_exam_report_cards(
    exam_id: int,
    student_id: Optional[int] = Query(None, description="Optional filter for a specific student"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exam = db.query(Examination).filter(Examination.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found.")

    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role).lower()

    # Privacy Protection & Role-Based Authorization
    if user_role in [UserRole.STUDENT.value, "student"]:
        if not (exam.status in ["Published", "Completed"] or exam.is_locked):
            raise HTTPException(status_code=403, detail="Report cards for this examination are not published yet.")
        student_profile = db.query(Student).filter(
            or_(Student.user_id == current_user.id, Student.email.ilike(current_user.email))
        ).first()
        if not student_profile:
            return []
        if student_id is not None and student_id != student_profile.id:
            raise HTTPException(status_code=403, detail="Students can only view their own academic report card.")
        if student_profile.class_id != exam.class_id:
            return []
        target_student_ids = [student_profile.id]

    elif user_role in [UserRole.PARENT.value, "parent"]:
        if not (exam.status in ["Published", "Completed"] or exam.is_locked):
            raise HTTPException(status_code=403, detail="Report cards for this examination are not published yet.")
        parent = db.query(Parent).filter(
            or_(Parent.user_id == current_user.id, Parent.email.ilike(current_user.email))
        ).first()
        if not parent:
            raise HTTPException(status_code=403, detail="Parent profile not found for current user account.")
        
        verified_links = db.query(ParentStudent).filter(
            ParentStudent.parent_id == parent.id,
            ParentStudent.is_verified == True
        ).all()
        verified_student_ids = {l.student_id for l in verified_links}

        if student_id is not None:
            if student_id not in verified_student_ids:
                raise HTTPException(status_code=403, detail="Parents can only view report cards for verified linked children.")
            target_student_ids = [student_id]
        else:
            children_in_cls = db.query(Student).filter(
                Student.id.in_(verified_student_ids),
                Student.class_id == exam.class_id
            ).all()
            target_student_ids = [c.id for c in children_in_cls]

    elif user_role in [UserRole.TEACHER.value, "teacher"]:
        teacher = db.query(Teacher).filter(
            or_(Teacher.user_id == current_user.id, Teacher.email.ilike(current_user.email))
        ).first()
        if not teacher:
            raise HTTPException(status_code=403, detail="Teacher profile not found for current user account.")
        cls = exam.classroom
        is_mentor = cls and cls.class_teacher_id == teacher.id
        is_subject_teacher = db.query(TeacherSubjectAssignment).filter(
            TeacherSubjectAssignment.teacher_id == teacher.id,
            TeacherSubjectAssignment.class_id == exam.class_id
        ).first() is not None

        if not (is_mentor or is_subject_teacher):
            raise HTTPException(status_code=403, detail="Faculty can only access report cards for students in their assigned classes.")
        
        if student_id is not None:
            target_student_ids = [student_id]
        else:
            students_in_cls = db.query(Student).filter(Student.class_id == exam.class_id).all()
            target_student_ids = [s.id for s in students_in_cls]

    elif user_role in [UserRole.ADMIN.value, "admin"]:
        if student_id is not None:
            target_student_ids = [student_id]
        else:
            students_in_cls = db.query(Student).filter(Student.class_id == exam.class_id).all()
            target_student_ids = [s.id for s in students_in_cls]

    else:
        raise HTTPException(status_code=403, detail="Access denied: unauthorized role.")

    cls = exam.classroom
    cls_name = cls.name if cls else "Class"
    sec = cls.section if cls else "A"

    # Find all exams for this class and academic year that share the same examination name (e.g. all subjects of "Annual Exam")
    related_exams_query = db.query(Examination).filter(
        Examination.class_id == exam.class_id,
        Examination.academic_year == exam.academic_year,
        Examination.name == exam.name
    )
    if user_role in [UserRole.STUDENT.value, UserRole.PARENT.value, "student", "parent"]:
        related_exams = [e for e in related_exams_query.all() if (e.status in ["Published", "Completed"] or e.is_locked)]
    else:
        related_exams = related_exams_query.all()

    related_exam_ids = [e.id for e in related_exams]
    all_marks = db.query(Mark).filter(Mark.examination_id.in_(related_exam_ids)).all()
    
    # Map marks by (student_id, exam_id)
    marks_map: Dict[tuple, Mark] = {(m.student_id, m.examination_id): m for m in all_marks}

    report_cards: List[StudentReportCardResponse] = []
    total_class_students = db.query(Student).filter(Student.class_id == exam.class_id).count()

    # Precalculate rank among all class students across these related exams
    all_class_student_totals = []
    for sid in [s.id for s in db.query(Student).filter(Student.class_id == exam.class_id).all()]:
        tot = sum(
            float(marks_map[(sid, e.id)].marks_obtained)
            for e in related_exams
            if (sid, e.id) in marks_map and marks_map[(sid, e.id)].marks_obtained is not None
        )
        all_class_student_totals.append((sid, tot))
    all_class_student_totals.sort(key=lambda x: x[1], reverse=True)
    rank_map = {sid: rank + 1 for rank, (sid, _) in enumerate(all_class_student_totals)}

    for s_id in target_student_ids:
        st = db.query(Student).filter(Student.id == s_id).first()
        if not st:
            continue

        subject_items: List[ReportCardSubjectItem] = []
        total_max = 0
        total_obtained = 0.0
        has_failed_subject = False
        all_absent = True

        for re in related_exams:
            total_max += re.total_marks
            m = marks_map.get((st.id, re.id))
            if m:
                if not m.is_absent and m.marks_obtained is not None:
                    all_absent = False
                    score = float(m.marks_obtained)
                    total_obtained += score
                    pct = round((score / re.total_marks) * 100, 2)
                    if m.status == "Failed":
                        has_failed_subject = True
                    subject_items.append(ReportCardSubjectItem(
                        subject=re.subject,
                        max_marks=re.total_marks,
                        passing_marks=re.passing_marks,
                        marks_obtained=score,
                        is_absent=False,
                        percentage=pct,
                        grade=m.grade,
                        status=m.status,
                        remarks=m.remarks
                    ))
                else:
                    has_failed_subject = True
                    subject_items.append(ReportCardSubjectItem(
                        subject=re.subject,
                        max_marks=re.total_marks,
                        passing_marks=re.passing_marks,
                        marks_obtained=None,
                        is_absent=True,
                        percentage=0.0,
                        grade="AB",
                        status="Absent",
                        remarks=m.remarks
                    ))
            else:
                has_failed_subject = True
                subject_items.append(ReportCardSubjectItem(
                    subject=re.subject,
                    max_marks=re.total_marks,
                    passing_marks=re.passing_marks,
                    marks_obtained=None,
                    is_absent=False,
                    percentage=None,
                    grade="--",
                    status="Pending",
                    remarks="Awaiting entry"
                ))

        overall_pct = round((total_obtained / total_max * 100), 2) if total_max > 0 and not all_absent else 0.0
        if all_absent:
            overall_status = "ABSENT"
            overall_grade = "AB"
        elif has_failed_subject:
            overall_status = "FAILED"
            overall_grade = "F"
        else:
            overall_status = "PASSED"
            if overall_pct >= 90: overall_grade = "A+"
            elif overall_pct >= 80: overall_grade = "A"
            elif overall_pct >= 70: overall_grade = "B+"
            elif overall_pct >= 60: overall_grade = "B"
            elif overall_pct >= 50: overall_grade = "C"
            else: overall_grade = "D"

        report_cards.append(StudentReportCardResponse(
            student_id=st.id,
            student_name=st.name,
            student_code=st.student_id,
            roll_number=st.roll_number,
            admission_number=st.admission_number,
            class_id=exam.class_id,
            class_name=cls_name,
            section=sec,
            academic_year=exam.academic_year,
            examination_name=exam.name,
            exam_type=exam.exam_type,
            exam_date=exam.exam_date.strftime("%d %b %Y"),
            subjects=subject_items,
            total_max_marks=total_max,
            total_marks_obtained=total_obtained,
            overall_percentage=overall_pct,
            overall_grade=overall_grade,
            overall_status=overall_status,
            rank_in_class=rank_map.get(st.id, 1),
            total_students_in_class=total_class_students,
            is_published=(exam.status in ["Published", "Completed"] or exam.is_locked),
            remarks="Excellent academic performance" if overall_status == "PASSED" else "Needs improvement in weak subjects"
        ))

    return report_cards

@router.get(
    "/student/{student_id}/report-card",
    response_model=List[StudentReportCardResponse],
    summary="Get all published report cards for a student"
)
def get_single_student_report_card_history(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role).lower()

    # 1. Role-specific Access Authorization
    if user_role in [UserRole.ADMIN.value, "admin"]:
        # Admin has full institutional access
        pass
    elif user_role in [UserRole.STUDENT.value, "student"]:
        is_own = (
            (student.user_id is not None and student.user_id == current_user.id) or
            (student.email and current_user.email and student.email.strip().lower() == current_user.email.strip().lower())
        )
        if not is_own:
            raise HTTPException(status_code=403, detail="Students can only view their own academic report card.")
    elif user_role in [UserRole.PARENT.value, "parent"]:
        parent = db.query(Parent).filter(
            or_(Parent.user_id == current_user.id, Parent.email.ilike(current_user.email))
        ).first()
        if not parent:
            raise HTTPException(status_code=403, detail="Parent profile not found for current user account.")
        
        link = db.query(ParentStudent).filter(
            ParentStudent.parent_id == parent.id,
            ParentStudent.student_id == student.id,
            ParentStudent.is_verified == True
        ).first()
        if not link:
            raise HTTPException(status_code=403, detail="Parents can only view report cards for verified linked children.")
    elif user_role in [UserRole.TEACHER.value, "teacher"]:
        teacher = db.query(Teacher).filter(
            or_(Teacher.user_id == current_user.id, Teacher.email.ilike(current_user.email))
        ).first()
        if not teacher:
            raise HTTPException(status_code=403, detail="Teacher profile not found for current user account.")
        
        cls = db.query(Classroom).filter(Classroom.id == student.class_id).first() if student.class_id else None
        is_mentor = cls and cls.class_teacher_id == teacher.id
        is_subject_teacher = db.query(TeacherSubjectAssignment).filter(
            TeacherSubjectAssignment.teacher_id == teacher.id,
            TeacherSubjectAssignment.class_id == student.class_id
        ).first() is not None

        if not (is_mentor or is_subject_teacher):
            raise HTTPException(
                status_code=403,
                detail="Faculty can only access report cards for students in their assigned classes."
            )
    else:
        raise HTTPException(status_code=403, detail="Access denied: unauthorized role.")

    # 2. Result Publication & Confidentiality Protection
    student_marks = db.query(Mark).filter(Mark.student_id == student.id).all()
    exam_ids = list(set([m.examination_id for m in student_marks]))
    exams = db.query(Examination).filter(Examination.id.in_(exam_ids)).all()

    # Protect unpublished/draft examinations from students and parents
    if user_role in [UserRole.STUDENT.value, UserRole.PARENT.value, "student", "parent"]:
        exams = [e for e in exams if (e.status in ["Published", "Completed"] or e.is_locked)]

    distinct_exam_names = list(set([(e.name, e.academic_year) for e in exams]))
    all_reports = []
    for ename, year in distinct_exam_names:
        sample_exam = next((e for e in exams if e.name == ename and e.academic_year == year), None)
        if sample_exam:
            cards = get_exam_report_cards(sample_exam.id, student_id=student.id, db=db, current_user=current_user)
            all_reports.extend(cards)

    return all_reports


# ------------------------------------------------------------------------------
# 6. Marks Analytics, Audit Logs & Grading Rules
# ------------------------------------------------------------------------------

@router.get(
    "/grading-rules",
    response_model=List[GradingRuleResponse],
    summary="Get configured grading scale rules"
)
def get_grading_rules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(GradingRule).order_by(desc(GradingRule.min_percentage)).all()

@router.put(
    "/grading-rules/{rule_id}",
    response_model=GradingRuleResponse,
    summary="Update a grading rule threshold (Admin only)"
)
def update_grading_rule(
    rule_id: int,
    payload: GradingRuleBase,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    rule = db.query(GradingRule).filter(GradingRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Grading rule not found.")
    rule.min_percentage = payload.min_percentage
    rule.max_percentage = payload.max_percentage
    rule.grade_point = payload.grade_point
    rule.description = payload.description
    rule.is_passing = payload.is_passing
    rule.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(rule)
    return rule

@router.get(
    "/audit-logs",
    response_model=List[MarkAuditLogResponse],
    summary="View marks audit trail of changes (Admin only)"
)
def get_marks_audit_logs(
    examination_id: Optional[int] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    query = db.query(MarkAuditLog)
    if examination_id:
        query = query.filter(MarkAuditLog.examination_id == examination_id)
    logs = query.order_by(desc(MarkAuditLog.created_at)).limit(limit).all()
    results = []
    for l in logs:
        st = l.student
        results.append(MarkAuditLogResponse(
            id=l.id,
            mark_id=l.mark_id,
            examination_id=l.examination_id,
            student_id=l.student_id,
            student_name=st.name if st else "Student",
            old_marks=float(l.old_marks) if l.old_marks is not None else None,
            new_marks=float(l.new_marks) if l.new_marks is not None else None,
            old_status=l.old_status,
            new_status=l.new_status,
            action=l.action,
            changed_by_email=l.changed_by_email,
            remarks=l.remarks,
            created_at=l.created_at
        ))
    return results

@router.get(
    "/marks",
    response_model=List[MarkResponse],
    summary="Flat search across all examination marks"
)
def flat_marks_search(
    examination_id: Optional[int] = Query(None),
    student_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None, description="Search student name, ID, or subject"),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Mark).join(Student, Mark.student_id == Student.id).join(Examination, Mark.examination_id == Examination.id)

    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role == UserRole.STUDENT.value:
        student_profile = db.query(Student).filter(
            or_(Student.user_id == current_user.id, Student.email == current_user.email)
        ).first()
        if student_profile:
            query = query.filter(Mark.student_id == student_profile.id)
        else:
            return []

    if examination_id:
        query = query.filter(Mark.examination_id == examination_id)
    if student_id:
        query = query.filter(Mark.student_id == student_id)
    if search:
        s_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Student.name.ilike(s_term),
                Student.student_id.ilike(s_term),
                Student.roll_number.ilike(s_term),
                Student.admission_number.ilike(s_term),
                Examination.subject.ilike(s_term),
                Examination.name.ilike(s_term)
            )
        )

    marks = query.order_by(desc(Mark.id)).offset(skip).limit(limit).all()
    results = []
    for m in marks:
        st = m.student
        ex = m.examination
        cls = ex.classroom if ex else None
        pct = round((float(m.marks_obtained) / ex.total_marks) * 100, 2) if m.marks_obtained is not None and ex else None
        results.append(MarkResponse(
            id=m.id,
            examination_id=m.examination_id,
            student_id=m.student_id,
            marks_obtained=float(m.marks_obtained) if m.marks_obtained is not None else None,
            is_absent=m.is_absent,
            percentage=pct,
            grade=m.grade,
            status=m.status,
            remarks=m.remarks,
            student_name=st.name if st else None,
            student_code=st.student_id if st else None,
            roll_number=st.roll_number if st else None,
            admission_number=st.admission_number if st else None,
            class_name=cls.name if cls else None,
            section=cls.section if cls else None,
            exam_name=ex.name if ex else None,
            subject=ex.subject if ex else None,
            max_marks=ex.total_marks if ex else 100,
            passing_marks=ex.passing_marks if ex else 40,
            is_locked=ex.is_locked if ex else False,
            updated_at=m.updated_at
        ))
    return results
