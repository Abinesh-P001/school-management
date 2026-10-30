from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field

class ExamBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    academic_year: str = Field(default="2026-2027", max_length=30)
    class_id: int
    section: Optional[str] = Field(default=None, max_length=20)
    exam_type: str = Field(default="Term Exam", max_length=50) # "Unit Test", "Half-Yearly", "Annual", "Quiz", "Term Exam"
    subject: str = Field(..., min_length=1, max_length=150)
    exam_date: date
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    time_slot: Optional[str] = Field(default="09:00 AM - 12:00 PM", max_length=100)
    total_marks: int = Field(default=100, gt=0)
    passing_marks: int = Field(default=40, gt=0)
    status: str = Field(default="Draft") # "Draft", "Upcoming", "Ongoing", "Completed", "Published"
    is_locked: bool = Field(default=False)

class ExamCreate(ExamBase):
    exam_code: Optional[str] = None

class ExamUpdate(BaseModel):
    name: Optional[str] = None
    academic_year: Optional[str] = None
    class_id: Optional[int] = None
    section: Optional[str] = None
    exam_type: Optional[str] = None
    subject: Optional[str] = None
    exam_date: Optional[date] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    time_slot: Optional[str] = None
    total_marks: Optional[int] = None
    passing_marks: Optional[int] = None
    status: Optional[str] = None
    is_locked: Optional[bool] = None

class ExamResponse(ExamBase):
    id: int
    exam_code: str
    class_name: Optional[str] = None
    published_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class MarkCreate(BaseModel):
    examination_id: int
    student_id: int
    marks_obtained: Optional[Decimal] = Field(default=None, ge=0)
    is_absent: bool = Field(default=False)
    remarks: Optional[str] = None

class BulkMarkItem(BaseModel):
    student_id: int
    marks_obtained: Optional[Decimal] = None
    is_absent: bool = False
    remarks: Optional[str] = None

class BulkMarksSubmit(BaseModel):
    marks: List[BulkMarkItem]

class MarkResponse(BaseModel):
    id: int
    examination_id: int
    student_id: int
    marks_obtained: Optional[float] = None
    is_absent: bool = False
    percentage: Optional[float] = None
    grade: str
    status: str
    remarks: Optional[str] = None
    student_name: Optional[str] = None
    student_code: Optional[str] = None
    roll_number: Optional[str] = None
    admission_number: Optional[str] = None
    class_name: Optional[str] = None
    section: Optional[str] = None
    exam_name: Optional[str] = None
    subject: Optional[str] = None
    max_marks: Optional[int] = 100
    passing_marks: Optional[int] = 40
    is_locked: bool = False
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class GradingRuleBase(BaseModel):
    grade: str = Field(..., max_length=10)
    min_percentage: Decimal = Field(..., ge=0, le=100)
    max_percentage: Decimal = Field(..., ge=0, le=100)
    grade_point: Decimal = Field(default=Decimal("0.0"), ge=0, le=10)
    description: Optional[str] = None
    is_passing: bool = True

class GradingRuleResponse(GradingRuleBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ReportCardSubjectItem(BaseModel):
    subject: str
    max_marks: int
    passing_marks: int
    marks_obtained: Optional[float] = None
    is_absent: bool = False
    percentage: Optional[float] = None
    grade: str
    status: str
    remarks: Optional[str] = None

class StudentReportCardResponse(BaseModel):
    student_id: int
    student_name: str
    student_code: Optional[str] = None
    roll_number: Optional[str] = None
    admission_number: Optional[str] = None
    class_id: int
    class_name: str
    section: str
    academic_year: str
    examination_name: str
    exam_type: str
    exam_date: str
    subjects: List[ReportCardSubjectItem]
    total_max_marks: int
    total_marks_obtained: float
    overall_percentage: float
    overall_grade: str
    overall_status: str # "PASSED", "FAILED", "WITHHELD", "ABSENT"
    rank_in_class: Optional[int] = None
    total_students_in_class: int
    is_published: bool
    remarks: Optional[str] = None

class ClassStudentResult(BaseModel):
    student_id: int
    student_name: str
    student_code: Optional[str] = None
    admission_number: Optional[str] = None
    roll_number: Optional[str] = None
    total_max_marks: int
    total_marks_obtained: float
    overall_percentage: float
    overall_grade: str
    overall_status: str
    rank: Optional[int] = None
    is_absent_all: bool = False
    subjects_count: int
    passed_subjects_count: int

class ClassResultsSummary(BaseModel):
    class_id: int
    class_name: str
    section: str
    academic_year: str
    examination_name: str
    total_enrolled: int
    appeared_count: int
    absent_count: int
    passed_count: int
    failed_count: int
    pass_percentage: float
    class_average: float
    highest_score: float
    lowest_score: float
    results: List[ClassStudentResult]

class MarkAuditLogResponse(BaseModel):
    id: int
    mark_id: Optional[int] = None
    examination_id: int
    student_id: int
    student_name: Optional[str] = None
    old_marks: Optional[float] = None
    new_marks: Optional[float] = None
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    action: str
    changed_by_email: Optional[str] = None
    remarks: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
