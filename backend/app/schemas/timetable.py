from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator

VALID_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

class TimetableSlotBase(BaseModel):
    academic_year: str = Field("2026-2027", min_length=4, max_length=20, description="Academic Year, e.g., 2026-2027")
    class_id: int = Field(..., description="ID of the classroom")
    section: Optional[str] = Field(None, max_length=50, description="Section code, e.g., A, B")
    day_of_week: str = Field(..., description="Weekday, e.g. Monday, Tuesday")
    period_number: int = Field(..., ge=1, le=15, description="Period slot number (1-15)")
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="HH:MM (24-hour format)")
    end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="HH:MM (24-hour format)")
    subject: str = Field(..., min_length=1, max_length=150, description="Subject name or break title")
    teacher_id: Optional[int] = Field(None, description="Optional ID of assigned teacher")
    room: Optional[str] = Field(None, max_length=100, description="Classroom or lab location")
    is_break: bool = Field(False, description="Whether this slot is lunch/recess")

    @field_validator("day_of_week")
    @classmethod
    def validate_day(cls, v: str) -> str:
        capitalized = v.capitalize()
        if capitalized not in VALID_DAYS:
            raise ValueError(f"Invalid day_of_week '{v}'. Must be one of {VALID_DAYS}")
        return capitalized

    @field_validator("end_time")
    @classmethod
    def validate_time_order(cls, v: str, info) -> str:
        start_time = info.data.get("start_time")
        if start_time and v <= start_time:
            raise ValueError(f"end_time ({v}) must be strictly after start_time ({start_time}).")
        return v

class TimetableSlotCreate(TimetableSlotBase):
    pass

class TimetableSlotUpdate(BaseModel):
    academic_year: Optional[str] = Field(None, min_length=4, max_length=20)
    day_of_week: Optional[str] = None
    period_number: Optional[int] = Field(None, ge=1, le=15)
    start_time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    end_time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    subject: Optional[str] = Field(None, min_length=1, max_length=150)
    teacher_id: Optional[int] = None
    room: Optional[str] = None
    is_break: Optional[bool] = None

    @field_validator("day_of_week")
    @classmethod
    def validate_day(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        capitalized = v.capitalize()
        if capitalized not in VALID_DAYS:
            raise ValueError(f"Invalid day_of_week '{v}'. Must be one of {VALID_DAYS}")
        return capitalized

    @field_validator("end_time")
    @classmethod
    def validate_time_order(cls, v: Optional[str], info) -> Optional[str]:
        start_time = info.data.get("start_time")
        if start_time and v and v <= start_time:
            raise ValueError(f"end_time ({v}) must be strictly after start_time ({start_time}).")
        return v

class TimetableSlotResponse(BaseModel):
    id: int
    academic_year: str
    class_id: int
    class_name: str
    section: str
    day_of_week: str
    period_number: int
    start_time: str
    end_time: str
    subject: str
    teacher_id: Optional[int] = None
    teacher_name: Optional[str] = None
    teacher_email: Optional[str] = None
    room: Optional[str] = None
    is_break: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ClassTimetableResponse(BaseModel):
    academic_year: str
    class_id: int
    class_name: str
    section: str
    days: List[str]
    time_slots: List[Dict[str, Any]]
    grid: Dict[str, List[TimetableSlotResponse]]
    total_periods: int

class TeacherTimetableResponse(BaseModel):
    teacher_id: int
    teacher_name: str
    academic_year: str
    days: List[str]
    periods: List[TimetableSlotResponse]
    grid: Dict[str, List[TimetableSlotResponse]]
    total_assigned_periods: int
