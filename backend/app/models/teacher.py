from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(50), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, unique=True)
    name = Column(String(150), nullable=False, index=True)
    email = Column(String(191), unique=True, nullable=False, index=True)
    phone = Column(String(30), nullable=True)
    department = Column(String(100), nullable=False, index=True)
    subject = Column(String(150), nullable=False)
    qualification = Column(String(200), nullable=True)
    experience = Column(String(50), nullable=True)
    classes_assigned = Column(String(255), nullable=True)
    status = Column(String(50), default="Active", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", backref="teacher_profile", lazy="joined")
    classes = relationship("Classroom", back_populates="class_teacher")
    subject_assignments = relationship("TeacherSubjectAssignment", back_populates="teacher", cascade="all, delete-orphan")
