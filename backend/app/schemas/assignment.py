from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class ClassMentorAssignRequest(BaseModel):
    teacher_id: Optional[int] = Field(None, description="Faculty member ID to designate as mentor, or null to unassign")

class ClassMentorResponse(BaseModel):
    class_id: int
    class_code: str
    name: str
    class_name: Optional[str] = None
    section: str
    mentor_id: Optional[int] = None
    mentor_name: Optional[str] = None
    mentor_email: Optional[str] = None

class SubjectAssignmentCreate(BaseModel):
    teacher_id: int = Field(..., description="Teacher ID")
    class_id: int = Field(..., description="Classroom ID")
    subject: str = Field(..., min_length=1, max_length=150, description="Teaching subject")
    can_add_students: bool = Field(False, description="Authorize teacher to add students to this class")

class SubjectAssignmentUpdate(BaseModel):
    subject: Optional[str] = Field(None, min_length=1, max_length=150)
    can_add_students: Optional[bool] = None

class SubjectAssignmentResponse(BaseModel):
    id: int
    teacher_id: int
    teacher_name: str
    teacher_email: str
    class_id: int
    class_name: str
    section: str
    subject: str
    can_add_students: bool
    created_at: datetime

    class Config:
        from_attributes = True

class TeacherAssignmentsOverview(BaseModel):
    teacher_id: int
    teacher_name: str
    teacher_email: str
    mentorship_class: Optional[ClassMentorResponse] = None
    teaching_assignments: List[SubjectAssignmentResponse] = []
    authorized_classes: List[dict] = []

