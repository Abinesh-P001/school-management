from datetime import date, datetime
from pydantic import BaseModel, Field

class AttendanceRecord(BaseModel):
    student_id: int
    status: str = Field(..., pattern="^(Present|Absent|Late|Leave|Excused)$")
    remarks: str | None = None

class AttendanceBulkCreate(BaseModel):
    class_id: int
    date: date
    records: list[AttendanceRecord]

class AttendanceUpdate(BaseModel):
    status: str = Field(..., pattern="^(Present|Absent|Late|Leave|Excused)$")
    remarks: str | None = None

class AttendanceStudentInfo(BaseModel):
    id: int
    student_id: str
    roll_number: str
    name: str

    class Config:
        from_attributes = True

class AttendanceResponse(BaseModel):
    id: int
    student_id: int
    class_id: int
    date: date
    status: str
    remarks: str | None
    student: AttendanceStudentInfo | None = None
    created_at: datetime

    class Config:
        from_attributes = True

class AttendanceStatsResponse(BaseModel):
    class_id: int
    date: date
    total_students: int
    present: int
    absent: int
    late: int
    leave: int = 0
    excused: int = 0
    attendance_rate: float
