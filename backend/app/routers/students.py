from datetime import date
import re
import secrets
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.database import get_db
from app.models.student import Student
from app.models.classroom import Classroom
from app.models.teacher import Teacher
from app.models.teacher_subject_assignment import TeacherSubjectAssignment
from app.models.user import User, UserRole
from app.schemas.student import StudentCreate, StudentUpdate, StudentResponse
from app.core.dependencies import get_current_user, require_admin
from app.core.security import hash_password
from app.routers.admin_users import _provision_supabase_account

from app.core.teacher_auth import (
    get_teacher_for_user,
    get_teacher_assigned_class_ids,
    is_teacher_assigned_to_class,
    can_teacher_add_students_to_class
)

router = APIRouter(prefix="/students", tags=["Students"])

def generate_student_code(db: Session) -> str:
    count = db.query(Student).count() + 1
    return f"STU-{1000 + count}"

def generate_roll_number(db: Session, class_id: int | None) -> str:
    count = db.query(Student).count() + 1
    prefix = "STU"
    if class_id:
        cls = db.query(Classroom).filter(Classroom.id == class_id).first()
        if cls:
            grade_num = "".join(filter(str.isdigit, cls.name)) or "00"
            prefix = f"{grade_num}{cls.section}"
    return f"{prefix}-{count:02d}"

@router.post(
    "",
    response_model=StudentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Enroll new student (Admin, Mentor, or Authorized Subject Teacher)",
    description="Create a student record. Mentors and authorized subject teachers can register students for their assigned classes."
)
@router.post(
    "/",
    response_model=StudentResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False
)
def create_student(
    student_in: StudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Authorization check based on role
    if current_user.role == UserRole.ADMIN:
        # Admins can enroll into any class
        pass
    elif current_user.role == UserRole.TEACHER:
        # Teachers can enroll students if assigned to the class (mentor or subject teacher)
        if not student_in.class_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A valid class must be selected for student registration."
            )

        teacher = get_teacher_for_user(current_user, db)
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No teacher profile associated with your user account."
            )

        if not is_teacher_assigned_to_class(teacher.id, student_in.class_id, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to add students to this class. Teachers can only register students for their assigned classes."
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to enroll students."
        )

    # 2. Validate class if provided
    if student_in.class_id:
        cls = db.query(Classroom).filter(Classroom.id == student_in.class_id).first()
        if not cls:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Class with ID {student_in.class_id} not found."
            )

    # 3. Check duplicate admission_number
    if student_in.admission_number:
        adm_trimmed = student_in.admission_number.strip()
        if db.query(Student).filter(Student.admission_number == adm_trimmed).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A student with admission number '{adm_trimmed}' already exists."
            )
    else:
        adm_trimmed = None

    # 4. Generate identifiers
    student_id = student_in.student_id or generate_student_code(db)
    if db.query(Student).filter(Student.student_id == student_id).first():
        student_id = f"{student_id}-{db.query(Student).count() + 1}"

    roll_number = student_in.roll_number or generate_roll_number(db, student_in.class_id)
    if db.query(Student).filter(Student.roll_number == roll_number).first():
        roll_number = f"{roll_number}-{db.query(Student).count() + 1}"

    admission_date = student_in.admission_date or date.today()

    # 5. Handle student email (if not provided, generate institutional default)
    if student_in.email:
        email = student_in.email.strip().lower()
    else:
        clean_name = re.sub(r'[^a-z0-9]', '', student_in.name.lower())
        clean_code = re.sub(r'[^a-z0-9]', '', student_id.lower())
        email = f"{clean_name}.{clean_code}@oakridge.edu"

    # Check duplicate email
    if db.query(Student).filter(Student.email == email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A student with email '{email}' already exists."
        )

    student = Student(
        student_id=student_id,
        admission_number=adm_trimmed or student_in.admission_number,
        roll_number=roll_number,
        name=student_in.name.strip(),
        email=email,
        gender=student_in.gender or "Other",
        date_of_birth=student_in.date_of_birth,
        guardian_name=student_in.guardian_name.strip(),
        guardian_phone=student_in.guardian_phone.strip(),
        class_id=student_in.class_id,
        admission_date=admission_date,
        status=student_in.status,
        fees_status=student_in.fees_status
    )

    # Provision User account for portal login and generate setup invitation
    user = db.query(User).filter(func.lower(User.email) == email).first()
    invite_token = secrets.token_hex(20)
    if not user:
        temp_pw = f"Student@{secrets.token_urlsafe(8)}!2026"
        user = User(
            email=email,
            hashed_password=hash_password(temp_pw),
            full_name=student_in.name.strip(),
            role=UserRole.STUDENT,
            is_active=True
        )
        db.add(user)
        db.flush()
        _provision_supabase_account(email, student_in.name.strip(), "student", temp_pw)

    student.user_id = user.id
    db.add(student)
    db.commit()
    db.refresh(student)

    # Attach dynamic invitation link
    invitation_link = f"http://localhost:5173/?invited=student&email={email}&setup_token={invite_token}"
    setattr(student, "invitation_link", invitation_link)
    return student

@router.get(
    "",
    response_model=list[StudentResponse],
    summary="List and filter students",
    description="Retrieve student directory with search and filter options. Students only see their own profile."
)
@router.get(
    "/",
    response_model=list[StudentResponse],
    include_in_schema=False
)
def list_students(
    search: str | None = Query(None, description="Search by name, roll number, student ID, or email"),
    class_id: int | None = Query(None, description="Filter by class ID"),
    gender: str | None = Query(None, description="Filter by gender (Male/Female/Other)"),
    status_filter: str | None = Query(None, alias="status", description="Filter by status (Active/Suspended/Graduated)"),
    fees_status: str | None = Query(None, description="Filter by fee status (Paid/Pending/Overdue)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Student)

    # Privacy & Scope Protection
    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role == UserRole.STUDENT.value:
        query = query.filter(or_(Student.user_id == current_user.id, Student.email == current_user.email))
        return query.all()
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
            query = query.filter(Student.class_id == class_id)
        else:
            query = query.filter(Student.class_id.in_(list(assigned_ids)))
    elif class_id:
        query = query.filter(Student.class_id == class_id)
    if gender:
        query = query.filter(Student.gender == gender)
    if status_filter:
        query = query.filter(Student.status == status_filter)
    if fees_status:
        query = query.filter(Student.fees_status == fees_status)

    return query.order_by(Student.id.desc()).offset(skip).limit(limit).all()

@router.get(
    "/{student_id}",
    response_model=StudentResponse,
    summary="Get student by ID",
    description="Retrieve complete dossier of a single student."
)
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID {student_id} not found."
        )

    # Privacy & Scope Protection
    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role == UserRole.STUDENT.value:
        if student.user_id != current_user.id and student.email != current_user.email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Students can only access their own educational records."
            )
    elif user_role == UserRole.TEACHER.value:
        teacher = get_teacher_for_user(current_user, db)
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No teacher profile associated with your user account."
            )
        assigned_ids = get_teacher_assigned_class_ids(teacher.id, db)
        if not student.class_id or student.class_id not in assigned_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not authorized to access student records outside your assigned classes."
            )
    return student

@router.put(
    "/{student_id}",
    response_model=StudentResponse,
    summary="Update student record",
    description="Update academic, personal, or contact details of a student. Admins, class mentors, and authorized faculty can edit student records."
)
def update_student(
    student_id: int,
    student_in: StudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID {student_id} not found."
        )

    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role == UserRole.ADMIN.value:
        pass
    elif user_role == UserRole.TEACHER.value:
        teacher = get_teacher_for_user(current_user, db)
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No teacher profile associated with your user account."
            )

        # Verify teacher is class mentor or assigned subject teacher for this student's class
        if not student.class_id or not is_teacher_assigned_to_class(teacher.id, student.class_id, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to edit students outside your assigned classes."
            )

        update_dict = student_in.model_dump(exclude_unset=True)

        # Teachers cannot alter student fee status
        if "fees_status" in update_dict and update_dict["fees_status"] != student.fees_status:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Faculty members are not authorized to modify student fee statuses."
            )

        # If changing class_id, verify teacher is mentor or assigned to target class as well
        if "class_id" in update_dict and update_dict["class_id"] != student.class_id:
            target_class_id = update_dict["class_id"]
            if target_class_id is not None:
                new_cls = db.query(Classroom).filter(Classroom.id == target_class_id).first()
                if not new_cls:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Class with ID {target_class_id} not found.")
                target_mentor = new_cls.class_teacher_id == teacher.id
                target_assigned = db.query(TeacherSubjectAssignment).filter(
                    TeacherSubjectAssignment.teacher_id == teacher.id,
                    TeacherSubjectAssignment.class_id == target_class_id
                ).first() is not None
                if not (target_mentor or target_assigned):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Teachers cannot transfer students to classes they do not teach."
                    )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to edit student records."
        )

    update_data = student_in.model_dump(exclude_unset=True)

    # If updating email, check for uniqueness
    if "email" in update_data and update_data["email"] != student.email:
        if db.query(Student).filter(Student.email == update_data["email"]).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A student with this updated email already exists."
            )

    # If updating class_id, verify existence
    if "class_id" in update_data and update_data["class_id"] is not None:
        if not db.query(Classroom).filter(Classroom.id == update_data["class_id"]).first():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Class with ID {update_data['class_id']} not found."
            )

    for field, value in update_data.items():
        setattr(student, field, value)

    # Sync User account full_name or email if user account is attached
    if student.user_id:
        user_account = db.query(User).filter(User.id == student.user_id).first()
        if user_account:
            if "name" in update_data:
                user_account.full_name = student.name
            if "email" in update_data:
                user_account.email = student.email

    db.commit()
    db.refresh(student)
    return student

@router.delete(
    "/{student_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete student record (Admin only)",
    description="Remove a student record from the directory."
)
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID {student_id} not found."
        )
    student_name = student.name
    db.delete(student)
    db.commit()
    return {"success": True, "message": f"Student '{student_name}' successfully removed."}
