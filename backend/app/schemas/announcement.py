from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    content: str = Field(..., min_length=5)
    category: str = Field("General", max_length=50) # General, Academic, Exam, Sports, Event, Holiday, Emergency
    priority: str = Field("Normal", max_length=20) # Low, Normal, High, Urgent
    target_audience: str = Field("ALL", max_length=50) # ALL, PARENTS_ALL, PARENTS_GRADE, PARENTS_CLASS, TEACHERS_ALL, STUDENTS_ALL
    target_grade: Optional[str] = None
    target_class_id: Optional[int] = None
    target_section: Optional[str] = None
    is_published: bool = True
    status: str = Field("Published", max_length=30) # Draft, Scheduled, Published, Archived
    publish_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None

class AnnouncementUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    content: Optional[str] = Field(None, min_length=5)
    category: Optional[str] = None
    priority: Optional[str] = None
    target_audience: Optional[str] = None
    target_grade: Optional[str] = None
    target_class_id: Optional[int] = None
    target_section: Optional[str] = None
    is_published: Optional[bool] = None
    status: Optional[str] = None
    publish_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None

class AnnouncementResponse(BaseModel):
    id: int
    title: str
    content: str
    category: str
    priority: str
    target_audience: str
    target_grade: Optional[str] = None
    target_class_id: Optional[int] = None
    target_section: Optional[str] = None
    is_published: bool
    status: str
    publish_date: datetime
    expiration_date: Optional[datetime] = None
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    created_by: Optional[int] = None
    author_name: Optional[str] = None
    is_read: Optional[bool] = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class AnnouncementUnreadCount(BaseModel):
    unread_count: int

