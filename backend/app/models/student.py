from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(50), unique=True, nullable=False, index=True) # e.g. STU-1001
    admission_number = Column(String(50), unique=True, nullable=True, index=True) # e.g. ADM-1001
    roll_number = Column(String(50), unique=True, nullable=False, index=True) # e.g. 10A-01
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, unique=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    email = Column(String(191), unique=True, nullable=False, index=True)
    gender = Column(String(20), nullable=False)
    date_of_birth = Column(Date, nullable=True)
    guardian_name = Column(String(150), nullable=False)
    guardian_phone = Column(String(30), nullable=False)
    admission_date = Column(Date, default=date.today, nullable=False)
    status = Column(String(50), default="Active", nullable=False, index=True)
    fees_status = Column(String(50), default="Pending", nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", backref="student_profile", lazy="joined")
    classroom = relationship("Classroom", back_populates="students", lazy="joined")
    attendances = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")
    marks = relationship("Mark", back_populates="student", cascade="all, delete-orphan")
    fee_invoices = relationship("FeeInvoice", back_populates="student", cascade="all, delete-orphan")
