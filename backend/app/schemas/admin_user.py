from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from app.models.user import UserRole

class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Initial secure password for the user")
    full_name: str = Field(..., min_length=2, max_length=150)
    role: UserRole = Field(..., description="Assigned role: admin, teacher, or student")
    
    # Optional school-specific details
    department: Optional[str] = None
    subject: Optional[str] = None
    qualification: Optional[str] = None
    phone: Optional[str] = None
    grade: Optional[str] = None
    section: Optional[str] = None
    roll_number: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None

class TeacherAccountCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150, description="Teacher full name")
    email: EmailStr = Field(..., description="Institutional email address")
    teacher_id: str = Field(..., min_length=2, max_length=50, description="Unique Teacher Employee ID")
    subject: str = Field(..., min_length=1, max_length=150, description="Primary teaching subject")
    assigned_classes: List[str] = Field(..., min_length=1, description="Assigned classes and sections")
    department: Optional[str] = Field("Academics", description="Department")
    phone: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8, description="Optional custom initial password")

class StudentAccountCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150, description="Student full name")
    admission_number: str = Field(..., min_length=2, max_length=50, description="Unique institutional admission number")
    email: EmailStr = Field(..., description="Student email address")
    student_id: str = Field(..., min_length=2, max_length=50, description="Unique Student ID")
    class_name: str = Field(..., min_length=1, max_length=50, description="Assigned class / grade, e.g. Grade 10")
    section: str = Field(..., min_length=1, max_length=20, description="Assigned section, e.g. A")
    guardian_name: str = Field(..., min_length=2, max_length=150, description="Parent or guardian full name")
    guardian_phone: str = Field(..., min_length=5, max_length=30, description="Parent or guardian phone number")
    gender: Optional[str] = Field("Other", description="Gender")
    password: Optional[str] = Field(None, min_length=8, description="Optional custom initial password")

class AdminUserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AccountCreatedResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    teacher_id: Optional[str] = None
    student_id: Optional[str] = None
    admission_number: Optional[str] = None
    assigned_classes: Optional[List[str]] = None
    invitation_link: Optional[str] = None
    message: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AdminUserStatusUpdate(BaseModel):
    is_active: bool
