from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Classroom(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    class_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False, index=True) # e.g. "Grade 10"
    section = Column(String(50), nullable=False)            # e.g. "A"
    room = Column(String(100), nullable=True)               # e.g. "Room 204"
    capacity = Column(Integer, default=35, nullable=False)
    class_teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)
    schedule = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    class_teacher = relationship("Teacher", back_populates="classes", lazy="joined")
    subject_assignments = relationship("TeacherSubjectAssignment", back_populates="classroom", cascade="all, delete-orphan")
    students = relationship("Student", back_populates="classroom")
    attendances = relationship("Attendance", back_populates="classroom")
    examinations = relationship("Examination", back_populates="classroom")
