from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(50), default="General", nullable=False, index=True) # General, Academic, Exam, Sports, Event, Holiday, Emergency
    priority = Column(String(20), default="Normal", nullable=False, index=True) # Low, Normal, High, Urgent
    target_audience = Column(String(50), default="ALL", nullable=False, index=True) # ALL, PARENTS_ALL, PARENTS_GRADE, PARENTS_CLASS, TEACHERS_ALL, STUDENTS_ALL
    target_grade = Column(String(50), nullable=True) # e.g. "Grade 10" or "Class 10"
    target_class_id = Column(Integer, ForeignKey("classes.id", ondelete="SET NULL"), nullable=True, index=True)
    target_section = Column(String(20), nullable=True) # e.g. "A"
    is_published = Column(Boolean, default=True, nullable=False, index=True)
    status = Column(String(30), default="Published", nullable=False, index=True) # Draft, Scheduled, Published, Archived
    publish_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    expiration_date = Column(DateTime, nullable=True)
    attachment_url = Column(String(500), nullable=True)
    attachment_name = Column(String(150), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    author = relationship("User", foreign_keys=[created_by], lazy="joined")
    classroom = relationship("Classroom", foreign_keys=[target_class_id], lazy="joined")
    read_receipts = relationship("AnnouncementReadReceipt", back_populates="announcement", cascade="all, delete-orphan")


class AnnouncementReadReceipt(Base):
    __tablename__ = "announcement_read_receipts"

    id = Column(Integer, primary_key=True, index=True)
    announcement_id = Column(Integer, ForeignKey("announcements.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    read_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("announcement_id", "user_id", name="uk_announcement_user_read"),
    )

    # Relationships
    announcement = relationship("Announcement", back_populates="read_receipts")
    user = relationship("User", lazy="joined")

