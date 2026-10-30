from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.teacher import Teacher
from app.models.user import User
from app.schemas.teacher import TeacherCreate, TeacherUpdate, TeacherResponse
from app.core.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/teachers", tags=["Teachers"])

def generate_employee_code(db: Session) -> str:
    count = db.query(Teacher).count() + 1
    return f"TCH-{200 + count}"

@router.post(
    "",
    response_model=TeacherResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add faculty member (Admin only)",
    description="Register an instructor, department allocation, and contact details."
)
@router.post(
    "/",
    response_model=TeacherResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False
)
def create_teacher(
    teacher_in: TeacherCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    if db.query(Teacher).filter(Teacher.email == teacher_in.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A faculty member with this email address already exists."
        )

    employee_id = teacher_in.employee_id or generate_employee_code(db)
    if db.query(Teacher).filter(Teacher.employee_id == employee_id).first():
        employee_id = f"{employee_id}-{db.query(Teacher).count() + 1}"

    teacher = Teacher(
        employee_id=employee_id,
        name=teacher_in.name,
        email=teacher_in.email,
        phone=teacher_in.phone,
        department=teacher_in.department,
        subject=teacher_in.subject,
        qualification=teacher_in.qualification,
        experience=teacher_in.experience,
        status=teacher_in.status
    )
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return teacher

@router.get(
    "",
    response_model=list[TeacherResponse],
    summary="List faculty directory",
    description="Search and filter teachers by department, subject, or name."
)
@router.get(
    "/",
    response_model=list[TeacherResponse],
    include_in_schema=False
)
def list_teachers(
    search: str | None = Query(None, description="Search by faculty name, subject, or email"),
    department: str | None = Query(None, description="Filter by department"),
    status_filter: str | None = Query(None, alias="status", description="Filter by status (Active/On Leave/Retired)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Teacher)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Teacher.name.ilike(search_pattern),
                Teacher.subject.ilike(search_pattern),
                Teacher.email.ilike(search_pattern),
                Teacher.employee_id.ilike(search_pattern)
            )
        )
    if department:
        query = query.filter(Teacher.department == department)
    if status_filter:
        query = query.filter(Teacher.status == status_filter)

    return query.order_by(Teacher.id.desc()).offset(skip).limit(limit).all()

@router.get(
    "/{teacher_id}",
    response_model=TeacherResponse,
    summary="Get teacher details by ID"
)
def get_teacher(
    teacher_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Faculty member with ID {teacher_id} not found."
        )
    return teacher

@router.put(
    "/{teacher_id}",
    response_model=TeacherResponse,
    summary="Update faculty profile (Admin only)"
)
def update_teacher(
    teacher_id: int,
    teacher_in: TeacherUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Faculty member with ID {teacher_id} not found."
        )

    update_data = teacher_in.model_dump(exclude_unset=True)

    if "email" in update_data and update_data["email"] != teacher.email:
        if db.query(Teacher).filter(Teacher.email == update_data["email"]).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A faculty member with this email already exists."
            )

    for field, value in update_data.items():
        setattr(teacher, field, value)

    db.commit()
    db.refresh(teacher)
    return teacher

@router.delete(
    "/{teacher_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete teacher record (Admin only)"
)
def delete_teacher(
    teacher_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Faculty member with ID {teacher_id} not found."
        )
    name = teacher.name
    db.delete(teacher)
    db.commit()
    return {"success": True, "message": f"Faculty member '{name}' successfully removed."}
