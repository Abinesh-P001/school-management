import json
import secrets
import urllib.request
import urllib.error
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models.user import User, UserRole
from app.models.teacher import Teacher
from app.models.student import Student
from app.schemas.admin_user import (
    AdminUserCreate,
    AdminUserResponse,
    AdminUserStatusUpdate,
    TeacherAccountCreate,
    StudentAccountCreate,
    AccountCreatedResponse
)
from app.core.security import hash_password
from app.core.dependencies import require_admin

router = APIRouter(prefix="/admin", tags=["Admin User Management"])

def _provision_supabase_account(email: str, full_name: str, role: str, initial_password: str | None = None):
    """
    Invokes Supabase Auth Admin API using the server-side service role key
    to invite or provision the user without modifying the admin's client session.
    """
    if not (settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY):
        return None

    api_key = settings.SUPABASE_SERVICE_ROLE_KEY
    headers = {
        "Authorization": f"Bearer {api_key}",
        "apikey": api_key,
        "Content-Type": "application/json"
    }

    # 1. Try sending official Supabase email invitation
    try:
        url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/invite"
        payload = json.dumps({
            "email": email,
            "data": {
                "full_name": full_name,
                "role": role
            }
        }).encode("utf-8")
        req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status in (200, 201):
                return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        # Fall back to creating confirmed user in Supabase Auth if invite email is not configured
        try:
            pwd = initial_password or f"Setup-{secrets.token_urlsafe(10)}!"
            url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/admin/users"
            payload = json.dumps({
                "email": email,
                "password": pwd,
                "email_confirm": True,
                "user_metadata": {
                    "full_name": full_name,
                    "role": role
                }
            }).encode("utf-8")
            req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status in (200, 201):
                    return json.loads(response.read().decode("utf-8"))
        except Exception as e2:
            print(f"[Supabase Admin API] Provisioning notice: {e2}")
    return None

@router.get(
    "/users",
    response_model=List[AdminUserResponse],
    summary="List all users (Admin only)",
    description="Retrieve all user accounts. Password hashes and internal secrets are strictly omitted."
)
def list_users(
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    users = db.query(User).order_by(User.id.desc()).all()
    return users

@router.post(
    "/teachers",
    response_model=AccountCreatedResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Admin: Add Teacher Account with Invitation",
    description="Create a teacher login account in Supabase Auth & database, and send/generate an invitation setup link."
)
def create_teacher_account(
    data: TeacherAccountCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    clean_email = data.email.strip().lower()

    # 1. Uniqueness Validations
    if db.query(User).filter(func.lower(User.email) == clean_email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email '{clean_email}' already exists."
        )

    if db.query(Teacher).filter(Teacher.employee_id == data.teacher_id.strip()).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A teacher with Teacher ID '{data.teacher_id}' is already registered."
        )

    # 2. Generate secure initial password / invite token
    setup_password = data.password or f"Teacher@{secrets.token_urlsafe(8)}!2026"
    invite_token = secrets.token_hex(20)

    # 3. Supabase Auth Provisioning (Server-Side Admin API)
    _provision_supabase_account(clean_email, data.full_name, "teacher", setup_password)

    # 4. Save User record in database
    hashed_pw = hash_password(setup_password)
    user = User(
        email=clean_email,
        hashed_password=hashed_pw,
        full_name=data.full_name.strip(),
        role=UserRole.TEACHER,
        is_active=True
    )
    db.add(user)
    db.flush()

    # 5. Save Teacher Profile
    assigned_classes_str = ", ".join(data.assigned_classes)
    teacher = Teacher(
        employee_id=data.teacher_id.strip(),
        user_id=user.id,
        name=data.full_name.strip(),
        email=clean_email,
        phone=data.phone or "",
        department=data.department or "Academics",
        subject=data.subject.strip(),
        classes_assigned=assigned_classes_str,
        status="Active"
    )
    db.add(teacher)
    db.commit()
    db.refresh(user)

    invitation_link = f"http://localhost:5173/?invited=teacher&email={clean_email}&setup_token={invite_token}"

    return AccountCreatedResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role="teacher",
        is_active=user.is_active,
        teacher_id=teacher.employee_id,
        assigned_classes=data.assigned_classes,
        invitation_link=invitation_link,
        message="Teacher account successfully created. Invitation and setup details generated.",
        created_at=user.created_at
    )

@router.post(
    "/students",
    response_model=AccountCreatedResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Admin: Add Student Account with Invitation",
    description="Create a student login account in Supabase Auth & database, and send/generate an invitation setup link."
)
def create_student_account(
    data: StudentAccountCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    clean_email = data.email.strip().lower()

    # 1. Uniqueness Validations
    if db.query(User).filter(func.lower(User.email) == clean_email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email '{clean_email}' already exists."
        )

    if db.query(Student).filter(Student.student_id == data.student_id.strip()).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A student with Student ID '{data.student_id}' is already registered."
        )

    if db.query(Student).filter(Student.admission_number == data.admission_number.strip()).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A student with Admission Number '{data.admission_number}' is already registered."
        )

    # 2. Generate secure initial password / invite token
    setup_password = data.password or f"Student@{secrets.token_urlsafe(8)}!2026"
    invite_token = secrets.token_hex(20)

    # 3. Supabase Auth Provisioning (Server-Side Admin API)
    _provision_supabase_account(clean_email, data.full_name, "student", setup_password)

    # 4. Save User record in database
    hashed_pw = hash_password(setup_password)
    user = User(
        email=clean_email,
        hashed_password=hashed_pw,
        full_name=data.full_name.strip(),
        role=UserRole.STUDENT,
        is_active=True
    )
    db.add(user)
    db.flush()

    # 5. Save Student Profile
    student = Student(
        student_id=data.student_id.strip(),
        admission_number=data.admission_number.strip(),
        roll_number=f"{data.section.strip()}-{data.student_id.strip()}",
        user_id=user.id,
        name=data.full_name.strip(),
        email=clean_email,
        gender=data.gender or "Other",
        guardian_name=data.guardian_name.strip(),
        guardian_phone=data.guardian_phone.strip(),
        status="Active",
        fees_status="Pending"
    )
    db.add(student)
    db.commit()
    db.refresh(user)

    invitation_link = f"http://localhost:5173/?invited=student&email={clean_email}&setup_token={invite_token}"

    return AccountCreatedResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role="student",
        is_active=user.is_active,
        student_id=student.student_id,
        admission_number=student.admission_number,
        assigned_classes=[f"{data.class_name}-{data.section}"],
        invitation_link=invitation_link,
        message="Student account successfully created. Invitation and setup details generated.",
        created_at=user.created_at
    )

@router.post(
    "/users",
    response_model=AdminUserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create generic user account (Admin only)"
)
def create_generic_user(
    data: AdminUserCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    clean_email = data.email.strip().lower()
    if db.query(User).filter(func.lower(User.email) == clean_email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    if len(data.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters long."
        )

    role_str = data.role.value if hasattr(data.role, "value") else str(data.role)
    _provision_supabase_account(clean_email, data.full_name, role_str, data.password)

    hashed_pw = hash_password(data.password)
    user = User(
        email=clean_email,
        hashed_password=hashed_pw,
        full_name=data.full_name.strip(),
        role=data.role,
        is_active=True
    )
    db.add(user)
    db.flush()

    if data.role == UserRole.TEACHER:
        teacher = Teacher(
            employee_id=f"TCH-{1000 + user.id}",
            user_id=user.id,
            name=data.full_name.strip(),
            email=clean_email,
            phone=data.phone or "",
            department=data.department or "General Academics",
            subject=data.subject or "General",
            status="Active"
        )
        db.add(teacher)
    elif data.role == UserRole.STUDENT:
        student = Student(
            student_id=f"STU-{1000 + user.id}",
            admission_number=f"ADM-{1000 + user.id}",
            roll_number=data.roll_number or f"{data.section or 'A'}-{user.id}",
            user_id=user.id,
            name=data.full_name.strip(),
            email=clean_email,
            gender="Other",
            guardian_name=data.guardian_name or "Parent / Guardian",
            guardian_phone=data.guardian_phone or data.phone or "+1 (555) 000-0000",
            status="Active",
            fees_status="Pending"
        )
        db.add(student)

    db.commit()
    db.refresh(user)
    return user

@router.patch(
    "/users/{user_id}/status",
    response_model=AdminUserResponse,
    summary="Update user active status (Admin only)"
)
def update_user_status(
    user_id: int,
    status_in: AdminUserStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if current_admin.id == user.id and not status_in.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot deactivate their own account."
        )

    user.is_active = status_in.is_active
    db.commit()
    db.refresh(user)
    return user

@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete user (Admin only)"
)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if current_admin.id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot delete their own account."
        )

    db.delete(user)
    db.commit()
    return None
