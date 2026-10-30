from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class TimetablePeriod(Base):
    __tablename__ = "timetables"

    id = Column(Integer, primary_key=True, index=True)
    academic_year = Column(String(20), nullable=False, default="2026-2027", index=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    section = Column(String(50), nullable=True, index=True)
    day_of_week = Column(String(20), nullable=False, index=True)  # "Monday", "Tuesday", etc.
    period_number = Column(Integer, nullable=False)               # 1, 2, 3, etc.
    start_time = Column(String(10), nullable=False)               # "08:30"
    end_time = Column(String(10), nullable=False)                 # "09:20"
    subject = Column(String(150), nullable=False)                 # "Mathematics", "Cafeteria Lunch", etc.
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True, index=True)
    room = Column(String(100), nullable=True)                     # "Room 101", "Lab 2"
    is_break = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    classroom = relationship("Classroom", backref="timetables", lazy="joined")
    teacher = relationship("Teacher", backref="timetables", lazy="joined")

    __table_args__ = (
        UniqueConstraint(
            "academic_year", "class_id", "day_of_week", "period_number",
            name="uk_class_timetable_period"
        ),
    )
