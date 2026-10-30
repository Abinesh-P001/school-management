from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field

class ParentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    phone: str = Field(..., min_length=5, max_length=50)
    alternate_phone: Optional[str] = None
    relationship_type: str = Field("Parent", max_length=50)
    address: Optional[str] = None
    occupation: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8)
    student_ids: Optional[List[int]] = Field(default_factory=list, description="IDs of students to link immediately")

class ParentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    relationship_type: Optional[str] = None
    address: Optional[str] = None
    occupation: Optional[str] = None
    status: Optional[str] = None

class ParentLinkStudent(BaseModel):
    student_id: int
    relationship: str = Field("Parent", max_length=50)
    is_primary_contact: bool = True
    is_verified: bool = True

class ParentResetPassword(BaseModel):
    new_password: str = Field(..., min_length=8)

class LinkedStudentInfo(BaseModel):
    id: int
    student_id: str
    name: str
    admission_number: Optional[str] = None
    roll_number: Optional[str] = None
    class_id: Optional[int] = None
    grade: Optional[str] = None
    section: Optional[str] = None
    gender: Optional[str] = None
    fees_status: Optional[str] = None
    relationship: str
    is_primary_contact: bool
    is_verified: bool

class ParentResponse(BaseModel):
    id: int
    user_id: int
    parent_code: str
    name: str
    email: str
    phone: str
    alternate_phone: Optional[str] = None
    relationship_type: str
    address: Optional[str] = None
    occupation: Optional[str] = None
    status: str
    created_at: datetime
    students: List[LinkedStudentInfo] = []

    model_config = {"from_attributes": True}

class CorrectionRequestCreate(BaseModel):
    student_id: int
    requested_field: str = Field(..., min_length=2, max_length=100)
    current_value: Optional[str] = None
    proposed_value: str = Field(..., min_length=1, max_length=255)
    reason: Optional[str] = None

class CorrectionRequestStatusUpdate(BaseModel):
    status: str = Field(..., description="Approved or Rejected")
    admin_notes: Optional[str] = None

class CorrectionRequestResponse(BaseModel):
    id: int
    parent_id: int
    parent_name: Optional[str] = None
    student_id: int
    student_name: Optional[str] = None
    requested_field: str
    current_value: Optional[str] = None
    proposed_value: str
    reason: Optional[str] = None
    status: str
    admin_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}

