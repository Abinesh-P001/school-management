from datetime import date, datetime
from pydantic import BaseModel, Field

class TeacherAttendanceRecordItem(BaseModel):
    teacher_id: int
    status: str = Field(..., pattern="^(Present|Absent|Late|Leave)$")
    remarks: str | None = None

class TeacherAttendanceCreate(BaseModel):
    teacher_id: int
    attendance_date: date
    status: str = Field(..., pattern="^(Present|Absent|Late|Leave)$")
    remarks: str | None = None

class TeacherAttendanceBulkCreate(BaseModel):
    attendance_date: date
    records: list[TeacherAttendanceRecordItem]

class TeacherAttendanceUpdate(BaseModel):
    status: str = Field(..., pattern="^(Present|Absent|Late|Leave)$")
    remarks: str | None = None

class TeacherAttendanceTeacherInfo(BaseModel):
    id: int
    employee_id: str
    name: str
    department: str | None = None
    email: str | None = None

    class Config:
        from_attributes = True

class TeacherAttendanceResponse(BaseModel):
    id: int
    teacher_id: int
    attendance_date: date
    status: str
    remarks: str | None = None
    teacher: TeacherAttendanceTeacherInfo | None = None
    teacher_name: str | None = None
    teacher_employee_id: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True

class TeacherAttendanceStatsResponse(BaseModel):
    attendance_date: date
    total_teachers: int
    present: int
    absent: int
    late: int
    leave: int
    attendance_rate: float

