
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class TeacherSubjectAssignment(Base):
    __tablename__ = "teacher_subject_assignments"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False, index=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    subject = Column(String(150), nullable=False)
    can_add_students = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("teacher_id", "class_id", "subject", name="uq_teacher_class_subject"),
    )

    # Relationships
    teacher = relationship("Teacher", back_populates="subject_assignments", lazy="joined")
    classroom = relationship("Classroom", back_populates="subject_assignments", lazy="joined")
