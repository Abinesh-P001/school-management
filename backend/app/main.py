from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError
from app.config import settings
from app.database import engine, Base
import app.models
from app.core.exceptions import validation_exception_handler, integrity_error_handler
from app.routers import auth, students, teachers, classes, attendance, examinations, fees, admin_users, assignments, teacher_attendance, timetable, admin_parents, parent, announcements

# Initialize Database tables if not already created
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="""
## Oakridge School Management System API

Secure, scalable institutional management backend built with **FastAPI**, **SQLAlchemy**, **Pydantic**, and **MySQL**.

### Key Architectural Modules:
- **Authentication & RBAC**: Secure bcrypt password hashing, signed JWT Bearer authorization, role permissions (`admin`, `teacher`, `student`).
- **Student Admissions & Directory**: Complete CRUD, search, and enrollment registry.
- **Faculty & Academic Staff**: Teacher profiles, department allocations, and workloads.
- **Classroom & Section Allocations**: Capacity monitoring and room assignment.
- **Attendance Register**: Daily attendance tracking with bulk submissions and status metrics.
- **Examinations & Grading Ledger**: Assessment schedules, grade calculations, and student mark records.
- **Fee Management**: Tuition invoicing, payment ledger, and receipts.
    """,
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
    docs_url=f"{settings.API_PREFIX}/docs",
    redoc_url=f"{settings.API_PREFIX}/redoc"
)

# CORS Configuration - Explicit origin, method, and header support
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        *settings.cors_origin_list
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "*"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With", "apikey", "*"],
    expose_headers=["*"],
)

# Exception Handlers
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(IntegrityError, integrity_error_handler)

# Include Routers
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(students.router, prefix=settings.API_PREFIX)
app.include_router(teachers.router, prefix=settings.API_PREFIX)
app.include_router(classes.router, prefix=settings.API_PREFIX)
app.include_router(attendance.router, prefix=settings.API_PREFIX)
app.include_router(examinations.router, prefix=settings.API_PREFIX)
app.include_router(fees.router, prefix=settings.API_PREFIX)
app.include_router(admin_users.router, prefix=settings.API_PREFIX)
app.include_router(assignments.router, prefix=settings.API_PREFIX)
app.include_router(teacher_attendance.router, prefix=settings.API_PREFIX)
app.include_router(timetable.router, prefix=settings.API_PREFIX)
app.include_router(timetable.teacher_router, prefix=settings.API_PREFIX)
app.include_router(admin_parents.router, prefix=settings.API_PREFIX)
app.include_router(parent.router, prefix=settings.API_PREFIX)
app.include_router(announcements.router, prefix=settings.API_PREFIX)

@app.get("/", tags=["Health"])
@app.get(f"{settings.API_PREFIX}", tags=["Health"])
def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "documentation": f"{settings.API_PREFIX}/docs"
    }

@app.get("/health", tags=["Health"])
@app.get(f"{settings.API_PREFIX}/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "database": "connected"}
