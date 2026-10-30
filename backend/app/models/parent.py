from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship as orm_relationship
from app.database import Base

class Parent(Base):
    __tablename__ = "parents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    parent_code = Column(String(50), unique=True, nullable=False, index=True) # e.g. PAR-1001
    name = Column(String(150), nullable=False, index=True)
    email = Column(String(191), unique=True, nullable=False, index=True)
    phone = Column(String(50), nullable=False)
    alternate_phone = Column(String(50), nullable=True)
    relationship_type = Column(String(50), default="Parent", nullable=False) # Father, Mother, Guardian
    address = Column(String(255), nullable=True)
    occupation = Column(String(100), nullable=True)
    status = Column(String(30), default="Active", nullable=False, index=True) # Active, Inactive
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = orm_relationship("User", backref="parent_profile", lazy="joined")
    parent_students = orm_relationship("ParentStudent", back_populates="parent", cascade="all, delete-orphan", lazy="joined")
    correction_requests = orm_relationship("ParentCorrectionRequest", back_populates="parent", cascade="all, delete-orphan")


class ParentStudent(Base):
    __tablename__ = "parent_students"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("parents.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    relationship = Column(String(50), default="Parent", nullable=False) # Father, Mother, Legal Guardian
    is_primary_contact = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=True, nullable=False)
    verified_at = Column(DateTime, default=datetime.utcnow, nullable=True)
    verified_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("parent_id", "student_id", name="uk_parent_student"),
    )

    # Relationships
    parent = orm_relationship("Parent", back_populates="parent_students")
    student = orm_relationship("Student", backref="student_parents", lazy="joined")


class ParentCorrectionRequest(Base):
    __tablename__ = "parent_correction_requests"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("parents.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    requested_field = Column(String(100), nullable=False) # e.g. Phone, Address, Emergency Contact
    current_value = Column(String(255), nullable=True)
    proposed_value = Column(String(255), nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(String(30), default="Pending", nullable=False, index=True) # Pending, Approved, Rejected
    admin_notes = Column(String(255), nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    parent = orm_relationship("Parent", back_populates="correction_requests", lazy="joined")
    student = orm_relationship("Student", lazy="joined")
