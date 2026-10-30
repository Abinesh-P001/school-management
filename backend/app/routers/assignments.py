from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.classroom import Classroom
from app.models.teacher import Teacher
from app.models.teacher_subject_assignment import TeacherSubjectAssignment
from app.models.user import User, UserRole
from app.schemas.assignment import (
    ClassMentorAssignRequest,
    ClassMentorResponse,
    SubjectAssignmentCreate,
    SubjectAssignmentUpdate,
    SubjectAssignmentResponse,
    TeacherAssignmentsOverview
)
from app.core.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/assignments", tags=["Assignments & Mentorship"])

# ------------------------------------------------------------------------------
# 1. Class Mentor Assignment (Admin only)
# ------------------------------------------------------------------------------
@router.post(
    "/classes/{class_id}/mentor",
    response_model=ClassMentorResponse,
    summary="Assign, edit, or update class mentor (Admin only)"
)
@router.put(
    "/classes/{class_id}/mentor",
    response_model=ClassMentorResponse,
    summary="Update class mentor assignment (Admin only)"
)
def assign_class_mentor(
    class_id: int,
    req: ClassMentorAssignRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    classroom = db.query(Classroom).filter(Classroom.id == class_id).first()
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class with ID {class_id} not found."
        )

    if req.teacher_id is not None:
        teacher = db.query(Teacher).filter(Teacher.id == req.teacher_id).first()
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Teacher with ID {req.teacher_id} not found."
            )

        # Enforce rule: A teacher can be mentor of only one class at a time.
        # If this teacher is already mentor of another class, update existing assignment
        prev_class = db.query(Classroom).filter(
            Classroom.class_teacher_id == req.teacher_id,
            Classroom.id != class_id
        ).first()
        if prev_class:
            prev_class.class_teacher_id = None

        classroom.class_teacher_id = req.teacher_id
    else:
        # Remove mentorship assignment without deleting teacher or students
        classroom.class_teacher_id = None

    db.commit()
    db.refresh(classroom)

    teacher_obj = classroom.class_teacher
    return ClassMentorResponse(
        class_id=classroom.id,
        class_code=classroom.class_code,
        name=classroom.name,
        class_name=classroom.name,
        section=classroom.section,
        mentor_id=teacher_obj.id if teacher_obj else None,
        mentor_name=teacher_obj.name if teacher_obj else None,
        mentor_email=teacher_obj.email if teacher_obj else None
    )

@router.delete(
    "/classes/{class_id}/mentor",
    response_model=ClassMentorResponse,
    summary="Remove class mentor assignment (Admin only)"
)
def remove_class_mentor(
    class_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    classroom = db.query(Classroom).filter(Classroom.id == class_id).first()
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class with ID {class_id} not found."
        )

    # Cleanly remove mentor assignment
    classroom.class_teacher_id = None
    db.commit()
    db.refresh(classroom)

    return ClassMentorResponse(
        class_id=classroom.id,
        class_code=classroom.class_code,
        name=classroom.name,
        class_name=classroom.name,
        section=classroom.section,
        mentor_id=None,
        mentor_name=None,
        mentor_email=None
    )

@router.get(
    "/classes/mentors",
    response_model=List[ClassMentorResponse],
    summary="List all class mentorship assignments"
)
def list_class_mentors(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    classes = db.query(Classroom).order_by(Classroom.id.asc()).all()
    results = []
    for c in classes:
        t = c.class_teacher
        results.append(ClassMentorResponse(
            class_id=c.id,
            class_code=c.class_code,
            name=c.name,
            class_name=c.name,
            section=c.section,
            mentor_id=t.id if t else None,
            mentor_name=t.name if t else None,
            mentor_email=t.email if t else None
        ))
    return results

# ------------------------------------------------------------------------------
# 2. Subject Teaching Assignments (Admin only for CUD, Read for all auth)
# ------------------------------------------------------------------------------
@router.get(
    "/subjects",
    response_model=List[SubjectAssignmentResponse],
    summary="List subject teaching assignments"
)
def list_subject_assignments(
    teacher_id: Optional[int] = Query(None),
    class_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    query = db.query(TeacherSubjectAssignment)
    if teacher_id:
        query = query.filter(TeacherSubjectAssignment.teacher_id == teacher_id)
    if class_id:
        query = query.filter(TeacherSubjectAssignment.class_id == class_id)

    assignments = query.order_by(TeacherSubjectAssignment.id.desc()).all()
    results = []
    for a in assignments:
        results.append(SubjectAssignmentResponse(
            id=a.id,
            teacher_id=a.teacher_id,
            teacher_name=a.teacher.name if a.teacher else "Unknown",
            teacher_email=a.teacher.email if a.teacher else "",
            class_id=a.class_id,
            class_name=a.classroom.name if a.classroom else "Unknown",
            section=a.classroom.section if a.classroom else "",
            subject=a.subject,
            can_add_students=a.can_add_students,
            created_at=a.created_at
        ))
    return results

@router.post(
    "/subjects",
    response_model=SubjectAssignmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create subject teaching assignment (Admin only)"
)
def create_subject_assignment(
    req: SubjectAssignmentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    teacher = db.query(Teacher).filter(Teacher.id == req.teacher_id).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Teacher with ID {req.teacher_id} not found."
        )

    classroom = db.query(Classroom).filter(Classroom.id == req.class_id).first()
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class with ID {req.class_id} not found."
        )

    # Check for duplicate assignment
    existing = db.query(TeacherSubjectAssignment).filter(
        TeacherSubjectAssignment.teacher_id == req.teacher_id,
        TeacherSubjectAssignment.class_id == req.class_id,
        TeacherSubjectAssignment.subject == req.subject.strip()
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{teacher.name} is already assigned to teach {req.subject.strip()} in {classroom.name}-{classroom.section}."
        )

    assignment = TeacherSubjectAssignment(
        teacher_id=req.teacher_id,
        class_id=req.class_id,
        subject=req.subject.strip(),
        can_add_students=req.can_add_students
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    return SubjectAssignmentResponse(
        id=assignment.id,
        teacher_id=teacher.id,
        teacher_name=teacher.name,
        teacher_email=teacher.email,
        class_id=classroom.id,
        class_name=classroom.name,
        section=classroom.section,
        subject=assignment.subject,
        can_add_students=assignment.can_add_students,
        created_at=assignment.created_at
    )

@router.patch(
    "/subjects/{assignment_id}",
    response_model=SubjectAssignmentResponse,
    summary="Update subject assignment (Admin only)"
)
def update_subject_assignment(
    assignment_id: int,
    req: SubjectAssignmentUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    assignment = db.query(TeacherSubjectAssignment).filter(
        TeacherSubjectAssignment.id == assignment_id
    ).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject assignment not found."
        )

    if req.subject is not None:
        assignment.subject = req.subject.strip()
    if req.can_add_students is not None:
        assignment.can_add_students = req.can_add_students

    db.commit()
    db.refresh(assignment)

    return SubjectAssignmentResponse(
        id=assignment.id,
        teacher_id=assignment.teacher_id,
        teacher_name=assignment.teacher.name,
        teacher_email=assignment.teacher.email,
        class_id=assignment.class_id,
        class_name=assignment.classroom.name,
        section=assignment.classroom.section,
        subject=assignment.subject,
        can_add_students=assignment.can_add_students,
        created_at=assignment.created_at
    )

@router.delete(
    "/subjects/{assignment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete subject assignment (Admin only)"
)
def delete_subject_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    assignment = db.query(TeacherSubjectAssignment).filter(
        TeacherSubjectAssignment.id == assignment_id
    ).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject assignment not found."
        )

    db.delete(assignment)
    db.commit()
    return None

# ------------------------------------------------------------------------------
# 3. Teacher Self-Overview (My Mentorship & Teaching Assignments)
# ------------------------------------------------------------------------------
@router.get(
    "/my-assignments",
    response_model=TeacherAssignmentsOverview,
    summary="Get authenticated teacher's mentorship and subject assignments"
)
def get_my_assignments(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if user.role != UserRole.TEACHER:
        # Admin can view or empty for others
        teacher = db.query(Teacher).filter(
            (Teacher.user_id == user.id) | (Teacher.email == user.email)
        ).first()
        if not teacher:
            return TeacherAssignmentsOverview(
                teacher_id=0,
                teacher_name=user.full_name,
                teacher_email=user.email,
                mentorship_class=None,
                teaching_assignments=[],
                authorized_classes=[]
            )
    else:
        teacher = db.query(Teacher).filter(
            (Teacher.user_id == user.id) | (Teacher.email == user.email)
        ).first()
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher profile not found for authenticated user."
            )

    # 1. Mentorship Class (teacher is class_teacher_id)
    mentored = db.query(Classroom).filter(Classroom.class_teacher_id == teacher.id).first()
    mentored_resp = None
    if mentored:
        mentored_resp = ClassMentorResponse(
            class_id=mentored.id,
            class_code=mentored.class_code,
            name=mentored.name,
            section=mentored.section,
            mentor_id=teacher.id,
            mentor_name=teacher.name,
            mentor_email=teacher.email
        )

    # 2. Teaching Assignments
    sub_assignments = db.query(TeacherSubjectAssignment).filter(
        TeacherSubjectAssignment.teacher_id == teacher.id
    ).all()

    teaching_resp = []
    authorized_classes = {}

    # If mentor, mentored class is automatically authorized for student registration!
    if mentored:
        authorized_classes[mentored.id] = {
            "class_id": mentored.id,
            "class_name": mentored.name,
            "section": mentored.section,
            "display": f"{mentored.name} - Section {mentored.section} (Class Mentor)",
            "role": "mentor",
            "can_add_students": True
        }

    for sa in sub_assignments:
        c = sa.classroom
        teaching_resp.append(SubjectAssignmentResponse(
            id=sa.id,
            teacher_id=teacher.id,
            teacher_name=teacher.name,
            teacher_email=teacher.email,
            class_id=sa.class_id,
            class_name=c.name if c else "Unknown",
            section=c.section if c else "",
            subject=sa.subject,
            can_add_students=sa.can_add_students,
            created_at=sa.created_at
        ))
        if c:
            if c.id not in authorized_classes:
                authorized_classes[c.id] = {
                    "class_id": c.id,
                    "class_name": c.name,
                    "section": c.section,
                    "display": f"{c.name} - Section {c.section} (Subject: {sa.subject})",
                    "role": "subject_teacher",
                    "can_add_students": bool(sa.can_add_students)
                }
            elif sa.can_add_students:
                authorized_classes[c.id]["can_add_students"] = True

    return TeacherAssignmentsOverview(
        teacher_id=teacher.id,
        teacher_name=teacher.name,
        teacher_email=teacher.email,
        mentorship_class=mentored_resp,
        teaching_assignments=teaching_resp,
        authorized_classes=list(authorized_classes.values())
    )

