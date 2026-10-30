from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.database import get_db
from app.models.classroom import Classroom
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.teacher_subject_assignment import TeacherSubjectAssignment
from app.models.user import User, UserRole
from app.schemas.classroom import ClassroomCreate, ClassroomUpdate, ClassroomResponse
from app.schemas.student import StudentResponse
from app.core.dependencies import get_current_user, require_admin
from app.core.teacher_auth import (
    get_teacher_for_user,
    get_teacher_assigned_class_ids,
    is_teacher_assigned_to_class
)

router = APIRouter(prefix="/classes", tags=["Classes"])

def generate_class_code(db: Session) -> str:
    count = db.query(Classroom).count() + 1
    return f"CLS-{100 + count}"

@router.post(
    "/",
    response_model=ClassroomResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new class or section (Admin only)"
)
def create_class(
    class_in: ClassroomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    if class_in.class_teacher_id:
        teacher = db.query(Teacher).filter(Teacher.id == class_in.class_teacher_id).first()
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Faculty member with ID {class_in.class_teacher_id} not found."
            )

    class_code = class_in.class_code or generate_class_code(db)
    if db.query(Classroom).filter(Classroom.class_code == class_code).first():
        class_code = f"{class_code}-{db.query(Classroom).count() + 1}"

    classroom = Classroom(
        class_code=class_code,
        name=class_in.name,
        section=class_in.section,
        room=class_in.room,
        capacity=class_in.capacity,
        class_teacher_id=class_in.class_teacher_id,
        schedule=class_in.schedule
    )
    db.add(classroom)
    db.commit()
    db.refresh(classroom)

    classroom.student_count = 0
    return classroom

@router.get(
    "/",
    response_model=list[ClassroomResponse],
    summary="List all classrooms and sections"
)
def list_classes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Classroom)

    # Enforce role-based access control: Teachers only see their assigned classes
    if current_user.role == UserRole.TEACHER:
        teacher = get_teacher_for_user(current_user, db)
        if teacher:
            assigned_class_ids = get_teacher_assigned_class_ids(teacher.id, db)
            if not assigned_class_ids:
                return []
            query = query.filter(Classroom.id.in_(list(assigned_class_ids)))
        else:
            return []
    elif current_user.role == UserRole.STUDENT:
        student = db.query(Student).filter(
            (Student.user_id == current_user.id) | (Student.email == current_user.email)
        ).first()
        if student and student.class_id:
            query = query.filter(Classroom.id == student.class_id)
        else:
            return []

    classes = query.order_by(Classroom.id.asc()).offset(skip).limit(limit).all()
    # Calculate enrolled student count per class
    for cls in classes:
        cls.student_count = db.query(func.count(Student.id)).filter(Student.class_id == cls.id).scalar() or 0
    return classes

@router.get(
    "/{class_id}",
    response_model=ClassroomResponse,
    summary="Get class details by ID"
)
def get_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    classroom = db.query(Classroom).filter(Classroom.id == class_id).first()
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class with ID {class_id} not found."
        )

    # Enforce role access: Teachers view assigned classes (mentor or subject)
    if current_user.role == UserRole.TEACHER:
        teacher = get_teacher_for_user(current_user, db)
        if not teacher or not is_teacher_assigned_to_class(teacher.id, classroom.id, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view classes that are not assigned to you."
            )
    elif current_user.role == UserRole.STUDENT:
        student = db.query(Student).filter(
            (Student.user_id == current_user.id) | (Student.email == current_user.email)
        ).first()
        if not student or student.class_id != classroom.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view classes other than your assigned class."
            )

    classroom.student_count = db.query(func.count(Student.id)).filter(Student.class_id == classroom.id).scalar() or 0
    return classroom

@router.get(
    "/{class_id}/students",
    response_model=list[StudentResponse],
    summary="Get student roster for a class"
)
def get_class_roster(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    classroom = db.query(Classroom).filter(Classroom.id == class_id).first()
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class with ID {class_id} not found."
        )

    if current_user.role == UserRole.TEACHER:
        teacher = get_teacher_for_user(current_user, db)
        if not teacher or not is_teacher_assigned_to_class(teacher.id, classroom.id, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view student rosters for classes not assigned to you."
            )

    students = db.query(Student).filter(Student.class_id == class_id).order_by(Student.roll_number.asc()).all()
    return students

@router.put(
    "/{class_id}",
    response_model=ClassroomResponse,
    summary="Update classroom (Admin only)"
)
def update_class(
    class_id: int,
    class_in: ClassroomUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    classroom = db.query(Classroom).filter(Classroom.id == class_id).first()
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class with ID {class_id} not found."
        )

    update_data = class_in.model_dump(exclude_unset=True)
    if "class_teacher_id" in update_data and update_data["class_teacher_id"] is not None:
        teacher = db.query(Teacher).filter(Teacher.id == update_data["class_teacher_id"]).first()
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Faculty member with ID {update_data['class_teacher_id']} not found."
            )

    for field, value in update_data.items():
        setattr(classroom, field, value)

    db.commit()
    db.refresh(classroom)
    classroom.student_count = db.query(func.count(Student.id)).filter(Student.class_id == classroom.id).scalar() or 0
    return classroom

@router.delete(
    "/{class_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete class (Admin only)"
)
def delete_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    classroom = db.query(Classroom).filter(Classroom.id == class_id).first()
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class with ID {class_id} not found."
        )
    class_title = f"{classroom.name}-{classroom.section}"
    db.delete(classroom)
    db.commit()
    return {"success": True, "message": f"Class '{class_title}' successfully removed."}
