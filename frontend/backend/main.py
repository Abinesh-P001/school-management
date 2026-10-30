import os
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Header, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
import uvicorn

# Load environment variables from the .env file
load_dotenv()

# Read Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

print("Supabase URL configured:", bool(SUPABASE_URL))
print("Supabase Key configured:", bool(SUPABASE_KEY))

# Initialize Supabase Python Client
supabase: Optional[Client] = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("[OK] Supabase Python client connected successfully!")
    except Exception as e:
        print("[ERROR] Failed to initialize Supabase client:", e)

# Initialize FastAPI App
app = FastAPI(
    title="Oakridge School Management API",
    description="FastAPI Backend powered by Supabase PostgreSQL Database with Role-Based Access Control and Student Privacy",
    version="1.0.0"
)

# Enable CORS for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------------------
# Security & RBAC Authentication Dependency
# ------------------------------------------------------------------------------
def get_current_user_and_role(
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> Dict[str, Any]:
    """
    Extracts authenticated user identity and role from Supabase JWT or request headers.
    Enforces strict role normalization: 'admin', 'teacher', or 'student'.
    """
    user_id = None
    email = x_user_email
    role = x_user_role

    # If Supabase Bearer token is provided, verify it directly with Supabase Auth
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        if supabase:
            try:
                user_res = supabase.auth.get_user(token)
                if user_res and user_res.user:
                    u = user_res.user
                    user_id = u.id
                    email = u.email or email
                    metadata = u.user_metadata or {}
                    role = metadata.get("role") or role
            except Exception as e:
                print(f"[Auth] JWT verification fallback: {e}")

    # Normalize role string
    r = (role or "student").strip().lower()
    if r in ("admin", "principal"):
        normalized_role = "admin"
    elif r == "teacher":
        normalized_role = "teacher"
    else:
        normalized_role = "student"

    return {
        "role": normalized_role,
        "email": email,
        "user_id": user_id
    }


def require_admin(auth: Dict[str, Any] = Depends(get_current_user_and_role)):
    """Enforces that the caller must have Admin / Principal role."""
    if auth["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin / Principal role required for this action"
        )
    return auth


def require_admin_or_teacher(auth: Dict[str, Any] = Depends(get_current_user_and_role)):
    """Enforces that the caller must have Admin or Teacher role."""
    if auth["role"] not in ("admin", "teacher"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Faculty or Administrative privileges required"
        )
    return auth


# ------------------------------------------------------------------------------
# Pydantic Request Models
# ------------------------------------------------------------------------------
class StudentCreate(BaseModel):
    name: str
    email: Optional[str] = None
    grade: str = "Grade 10"
    section: str = "A"
    gender: str = "Female"
    guardian_name: str
    guardian_phone: str
    roll_number: Optional[str] = None
    status: str = "Active"
    fees_status: str = "Pending"
    attendance_pct: Optional[str] = "95%"
    gpa: Optional[str] = "3.80"


class TeacherCreate(BaseModel):
    name: str
    email: str
    department: str
    subject: str
    qualification: Optional[str] = None
    experience: Optional[str] = None
    phone: Optional[str] = None
    status: str = "Active"


class ClassCreate(BaseModel):
    class_code: Optional[str] = None
    name: str
    section: str
    room: Optional[str] = None
    capacity: int = 35
    class_teacher: Optional[str] = None
    schedule: Optional[str] = "Mon - Fri, 8:00 AM - 3:00 PM"


class FeePaymentCreate(BaseModel):
    student_id: Optional[int] = None
    student_name: str
    fee_type: str
    amount: float
    due_date: str
    paid_date: Optional[str] = None
    payment_method: Optional[str] = "Credit Card"
    status: str = "Paid"


class MarkCreate(BaseModel):
    examination_id: int
    exam_name: str
    student_id: int
    student_name: str
    subject: str
    score: float
    max_score: float = 100.0
    grade: str
    status: str


# ------------------------------------------------------------------------------
# API Endpoints
# ------------------------------------------------------------------------------
@app.get("/")
def read_root():
    return {
        "project": "Oakridge School Management API",
        "status": "online",
        "database": "Supabase PostgreSQL",
        "rbac_enabled": True,
        "docs_url": "http://127.0.0.1:8000/docs",
        "frontend_url": "http://localhost:5173"
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "supabase_connected": supabase is not None
    }


# ------------------------------------------------------------------------------
# 1. Students Endpoints
# ------------------------------------------------------------------------------
@app.get("/api/students")
def get_students(auth: Dict[str, Any] = Depends(get_current_user_and_role)):
    """
    Get student directory.
    - Admin: reads full student list.
    - Teacher: reads student list.
    - Student: reads ONLY their own student record (privacy protection).
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        query = supabase.table("students").select("*")

        # STUDENT PRIVACY GUARD: A student can only see their own profile
        if auth["role"] == "student":
            if auth.get("email"):
                query = query.eq("email", auth["email"])
            elif auth.get("user_id"):
                query = query.eq("user_id", auth["user_id"])
            else:
                # If unidentifiable student, return empty
                return {"data": [], "count": 0}

        res = query.order("id", desc=True).execute()
        return {"data": res.data or [], "count": len(res.data or [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/students", status_code=status.HTTP_201_CREATED)
def create_student(
    student: StudentCreate,
    auth: Dict[str, Any] = Depends(require_admin)
):
    """Admin-only: Create a new student record."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        payload = student.dict()
        if not payload.get("email"):
            payload["email"] = f"{payload['name'].lower().replace(' ', '.')}@oakridge.edu"
        if not payload.get("student_id"):
            payload["student_id"] = f"STU-{os.urandom(2).hex()}"
        if not payload.get("roll_number"):
            payload["roll_number"] = f"{payload['grade'].split(' ')[-1]}{payload['section']}-{os.urandom(1).hex()}"

        res = supabase.table("students").insert(payload).execute()
        return {"data": res.data[0] if res.data else None, "message": "Student created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/students/{student_id}")
def delete_student(
    student_id: int,
    auth: Dict[str, Any] = Depends(require_admin)
):
    """Admin-only: Delete a student record."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        res = supabase.table("students").delete().eq("id", student_id).execute()
        return {"message": f"Student {student_id} deleted successfully", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------------------------------------------------
# 2. Teachers Endpoints
# ------------------------------------------------------------------------------
@app.get("/api/teachers")
def get_teachers(auth: Dict[str, Any] = Depends(get_current_user_and_role)):
    """Read faculty directory."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        res = supabase.table("teachers").select("*").order("id", desc=True).execute()
        return {"data": res.data or [], "count": len(res.data or [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/teachers", status_code=status.HTTP_201_CREATED)
def create_teacher(
    teacher: TeacherCreate,
    auth: Dict[str, Any] = Depends(require_admin)
):
    """Admin-only: Create a new faculty member."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        payload = teacher.dict()
        if not payload.get("employee_id"):
            payload["employee_id"] = f"TCH-{os.urandom(2).hex()}"
        res = supabase.table("teachers").insert(payload).execute()
        return {"data": res.data[0] if res.data else None, "message": "Teacher registered successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/teachers/{teacher_id}")
def delete_teacher(
    teacher_id: int,
    auth: Dict[str, Any] = Depends(require_admin)
):
    """Admin-only: Delete a faculty member."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        res = supabase.table("teachers").delete().eq("id", teacher_id).execute()
        return {"message": f"Teacher {teacher_id} deleted successfully", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------------------------------------------------
# 3. Classes Endpoints
# ------------------------------------------------------------------------------
@app.get("/api/classes")
def get_classes(auth: Dict[str, Any] = Depends(get_current_user_and_role)):
    """Read class rosters."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        res = supabase.table("classes").select("*").order("id", desc=False).execute()
        return {"data": res.data or [], "count": len(res.data or [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/classes", status_code=status.HTTP_201_CREATED)
def create_class(
    class_data: ClassCreate,
    auth: Dict[str, Any] = Depends(require_admin)
):
    """Admin-only: Create a new class section."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        payload = class_data.dict()
        if not payload.get("class_code"):
            payload["class_code"] = f"CLS-{os.urandom(2).hex()}"
        res = supabase.table("classes").insert(payload).execute()
        return {"data": res.data[0] if res.data else None, "message": "Class created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------------------------------------------------
# 4. Marks & Examinations Endpoints (Student Privacy Protected)
# ------------------------------------------------------------------------------
@app.get("/api/marks")
def get_marks(auth: Dict[str, Any] = Depends(get_current_user_and_role)):
    """
    Get marks ledger.
    - Admin & Teacher: full marks access.
    - Student: strictly filtered to own student record.
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        query = supabase.table("marks").select("*")

        if auth["role"] == "student":
            # Identify the student record ID first
            student_id = None
            if auth.get("email"):
                s_res = supabase.table("students").select("id").eq("email", auth["email"]).execute()
                if s_res.data:
                    student_id = s_res.data[0]["id"]
            if not student_id and auth.get("user_id"):
                s_res = supabase.table("students").select("id").eq("user_id", auth["user_id"]).execute()
                if s_res.data:
                    student_id = s_res.data[0]["id"]

            if not student_id:
                # Student record not linked: return empty to protect privacy
                return {"data": [], "count": 0}

            query = query.eq("student_id", student_id)

        res = query.order("id", desc=True).execute()
        return {"data": res.data or [], "count": len(res.data or [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/marks", status_code=status.HTTP_201_CREATED)
def create_mark(
    mark: MarkCreate,
    auth: Dict[str, Any] = Depends(require_admin_or_teacher)
):
    """Faculty/Admin only: Record student examination marks."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        res = supabase.table("marks").insert(mark.dict()).execute()
        return {"data": res.data[0] if res.data else None, "message": "Marks recorded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------------------------------------------------
# 5. Fee Management Endpoints
# ------------------------------------------------------------------------------
@app.get("/api/fees")
def get_fees(auth: Dict[str, Any] = Depends(get_current_user_and_role)):
    """
    Get fee invoices.
    - Admin: full institutional ledger.
    - Teacher: forbidden (403).
    - Student: only their own invoices.
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    if auth["role"] == "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Faculty accounts do not have access to institutional finance ledgers"
        )

    try:
        query = supabase.table("fee_invoices").select("*")

        if auth["role"] == "student":
            student_id = None
            if auth.get("email"):
                s_res = supabase.table("students").select("id").eq("email", auth["email"]).execute()
                if s_res.data:
                    student_id = s_res.data[0]["id"]
            if not student_id and auth.get("user_id"):
                s_res = supabase.table("students").select("id").eq("user_id", auth["user_id"]).execute()
                if s_res.data:
                    student_id = s_res.data[0]["id"]

            if not student_id:
                return {"data": [], "count": 0}

            query = query.eq("student_id", student_id)

        res = query.order("id", desc=True).execute()
        return {"data": res.data or [], "count": len(res.data or [])}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/fees", status_code=status.HTTP_201_CREATED)
def create_fee_payment(
    fee: FeePaymentCreate,
    auth: Dict[str, Any] = Depends(require_admin)
):
    """Admin-only: Record fee collection payment."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    try:
        payload = fee.dict()
        if not payload.get("invoice_number"):
            payload["invoice_number"] = f"INV-2026-{os.urandom(2).hex().upper()}"
        res = supabase.table("fee_invoices").insert(payload).execute()
        return {"data": res.data[0] if res.data else None, "message": "Payment recorded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)