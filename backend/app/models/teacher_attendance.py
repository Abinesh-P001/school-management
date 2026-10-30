from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class TeacherAttendance(Base):
    __tablename__ = "teacher_attendance"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False, index=True)
    attendance_date = Column(Date, default=date.today, nullable=False, index=True)
    status = Column(String(30), default="Present", nullable=False) # Present, Absent, Late, Leave
    remarks = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("teacher_id", "attendance_date", name="uk_teacher_attendance_date"),
    )

    # Relationships
    teacher = relationship("Teacher", backref="attendances", lazy="joined")

