from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import Column, Integer, String, Date, DateTime, Numeric, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class Examination(Base):
    __tablename__ = "examinations"

    id = Column(Integer, primary_key=True, index=True)
    exam_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False) # e.g. "Unit Test 1", "Half-Yearly Exam", "Annual Exam"
    academic_year = Column(String(30), default="2026-2027", nullable=False, index=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    section = Column(String(20), nullable=True, index=True) # Specific section e.g. "A" or None for class-wide
    exam_type = Column(String(50), default="Term Exam", nullable=False) # "Unit Test", "Half-Yearly", "Annual", "Quiz", "Practical"
    subject = Column(String(150), nullable=False)
    exam_date = Column(Date, nullable=False, index=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    time_slot = Column(String(100), nullable=True)
    total_marks = Column(Integer, default=100, nullable=False)
    passing_marks = Column(Integer, default=40, nullable=False)
    status = Column(String(50), default="Draft", nullable=False) # "Draft", "Upcoming", "Ongoing", "Completed", "Published"
    is_locked = Column(Boolean, default=False, nullable=False)
    published_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    classroom = relationship("Classroom", back_populates="examinations", lazy="joined")
    marks = relationship("Mark", back_populates="examination", cascade="all, delete-orphan")
    audit_logs = relationship("MarkAuditLog", back_populates="examination", cascade="all, delete-orphan")


class Mark(Base):
    __tablename__ = "marks"

    id = Column(Integer, primary_key=True, index=True)
    examination_id = Column(Integer, ForeignKey("examinations.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    marks_obtained = Column(Numeric(5, 2), nullable=True) # None or 0 when absent
    is_absent = Column(Boolean, default=False, nullable=False)
    grade = Column(String(10), nullable=False) # e.g. A+, A, B, F, AB
    status = Column(String(30), nullable=False) # Passed, Failed, Absent
    remarks = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    __table_args__ = (
        UniqueConstraint("examination_id", "student_id", name="uk_exam_student"),
    )

    # Relationships
    examination = relationship("Examination", back_populates="marks", lazy="joined")
    student = relationship("Student", back_populates="marks", lazy="joined")


class GradingRule(Base):
    __tablename__ = "grading_rules"

    id = Column(Integer, primary_key=True, index=True)
    grade = Column(String(10), nullable=False, unique=True, index=True) # e.g. A+, A, B+, B, C, D, F
    min_percentage = Column(Numeric(5, 2), nullable=False)
    max_percentage = Column(Numeric(5, 2), nullable=False)
    grade_point = Column(Numeric(3, 2), default=0.0, nullable=False)
    description = Column(String(100), nullable=True) # "Outstanding", "Excellent", "Fail"
    is_passing = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MarkAuditLog(Base):
    __tablename__ = "marks_audit_log"

    id = Column(Integer, primary_key=True, index=True)
    mark_id = Column(Integer, nullable=True, index=True)
    examination_id = Column(Integer, ForeignKey("examinations.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    old_marks = Column(Numeric(5, 2), nullable=True)
    new_marks = Column(Numeric(5, 2), nullable=True)
    old_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=True)
    action = Column(String(50), nullable=False) # "CREATED", "UPDATED", "MARKED_ABSENT", "LOCKED", "PUBLISHED", "REOPENED"
    changed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    changed_by_email = Column(String(150), nullable=True)
    remarks = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    examination = relationship("Examination", back_populates="audit_logs")
    student = relationship("Student", lazy="joined")
