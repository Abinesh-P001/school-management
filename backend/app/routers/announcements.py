from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc

from app.database import get_db
from app.core.dependencies import get_current_user, require_admin
from app.models.user import User, UserRole
from app.models.parent import Parent
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.classroom import Classroom
from app.models.teacher_subject_assignment import TeacherSubjectAssignment
from app.models.announcement import Announcement, AnnouncementReadReceipt
from app.schemas.announcement import (
    AnnouncementCreate, AnnouncementUpdate, AnnouncementResponse, AnnouncementUnreadCount
)

router = APIRouter(prefix="/announcements", tags=["School Announcements"])

def _is_user_read(announcement_id: int, user_id: int, db: Session) -> bool:
    receipt = db.query(AnnouncementReadReceipt).filter(
        AnnouncementReadReceipt.announcement_id == announcement_id,
        AnnouncementReadReceipt.user_id == user_id
    ).first()
    return receipt is not None

def _format_announcement(ann: Announcement, current_user: User, db: Session) -> dict:
    author_name = ann.author.full_name if ann.author else "School Administration"
    is_read = _is_user_read(ann.id, current_user.id, db)
    return {
        "id": ann.id,
        "title": ann.title,
        "content": ann.content,
        "category": ann.category,
        "priority": ann.priority,
        "target_audience": ann.target_audience,
        "target_grade": ann.target_grade,
        "target_class_id": ann.target_class_id,
        "target_section": ann.target_section,
        "is_published": ann.is_published,
        "status": ann.status,
        "publish_date": ann.publish_date,
        "expiration_date": ann.expiration_date,
        "attachment_url": ann.attachment_url,
        "attachment_name": ann.attachment_name,
        "created_by": ann.created_by,
        "author_name": author_name,
        "is_read": is_read,
        "created_at": ann.created_at,
        "updated_at": ann.updated_at
    }

@router.get("", response_model=List[AnnouncementResponse])
def get_announcements(
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = None,
    priority: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Announcement)

    # 1. Admin view: can see everything, or filter by status
    if current_user.role == UserRole.ADMIN:
        if status_filter:
            query = query.filter(Announcement.status == status_filter)
    else:
        # Non-admin users see only published announcements
        query = query.filter(
            Announcement.is_published == True,
            Announcement.status == "Published"
        )

        # 2. Audience Enforcement based on user role
        if current_user.role == UserRole.PARENT:
            parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
            child_grades = set()
            child_class_ids = set()
            if parent:
                for ps in parent.parent_students:
                    if ps.is_verified and ps.student:
                        if ps.student.classroom:
                            child_grades.add(ps.student.classroom.name)
                            child_class_ids.add(ps.student.class_id)

            # Conditions for Parent:
            # - target_audience is ALL or PARENTS_ALL
            # - target_audience is PARENTS_GRADE and target_grade in child_grades
            # - target_audience is PARENTS_CLASS and target_class_id in child_class_ids
            parent_audience_conditions = [
                Announcement.target_audience.in_(["ALL", "PARENTS_ALL"])
            ]
            if child_grades:
                parent_audience_conditions.append(
                    and_(
                        Announcement.target_audience == "PARENTS_GRADE",
                        Announcement.target_grade.in_(list(child_grades))
                    )
                )
            if child_class_ids:
                parent_audience_conditions.append(
                    and_(
                        Announcement.target_audience == "PARENTS_CLASS",
                        Announcement.target_class_id.in_(list(child_class_ids))
                    )
                )
            query = query.filter(or_(*parent_audience_conditions))

        elif current_user.role == UserRole.TEACHER:
            teacher = db.query(Teacher).filter(
                (Teacher.user_id == current_user.id) | (Teacher.email == current_user.email)
            ).first()
            teacher_class_ids = []
            if teacher:
                mentor_cls = [c.id for c in db.query(Classroom).filter(Classroom.class_teacher_id == teacher.id).all()]
                assigned_cls = [a.class_id for a in db.query(TeacherSubjectAssignment).filter(TeacherSubjectAssignment.teacher_id == teacher.id).all()]
                teacher_class_ids = list(set(mentor_cls + assigned_cls))

            teacher_conditions = [
                Announcement.target_audience.in_(["ALL", "TEACHERS_ALL"]),
                Announcement.created_by == current_user.id
            ]
            if teacher_class_ids:
                teacher_conditions.append(Announcement.target_class_id.in_(teacher_class_ids))
            query = query.filter(or_(*teacher_conditions))

        elif current_user.role == UserRole.STUDENT:
            student = db.query(Student).filter(
                (Student.user_id == current_user.id) | (Student.email == current_user.email)
            ).first()
            student_conds = [
                Announcement.target_audience.in_(["ALL", "STUDENTS_ALL"])
            ]
            if student and student.class_id:
                student_conds.append(
                    and_(
                        Announcement.target_audience.in_(["CLASS_ALL", "STUDENTS_CLASS", "PARENTS_CLASS"]),
                        Announcement.target_class_id == student.class_id
                    )
                )
            query = query.filter(or_(*student_conds))

    # Optional category / priority filters
    if category and category != "All":
        query = query.filter(Announcement.category == category)
    if priority and priority != "All":
        query = query.filter(Announcement.priority == priority)

    announcements = query.order_by(desc(Announcement.publish_date), desc(Announcement.id)).all()
    return [_format_announcement(a, current_user, db) for a in announcements]

@router.get("/unread-count", response_model=AnnouncementUnreadCount)
def get_unread_announcements_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Fetch visible announcements for this user
    all_visible = get_announcements(
        status_filter=None,
        category=None,
        priority=None,
        current_user=current_user,
        db=db
    )
    unread = sum(1 for a in all_visible if not a.get("is_read"))
    return {"unread_count": unread}

@router.post("/{announcement_id}/read")
def mark_announcement_as_read(
    announcement_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")

    existing = db.query(AnnouncementReadReceipt).filter(
        AnnouncementReadReceipt.announcement_id == announcement_id,
        AnnouncementReadReceipt.user_id == current_user.id
    ).first()

    if not existing:
        receipt = AnnouncementReadReceipt(
            announcement_id=announcement_id,
            user_id=current_user.id,
            read_at=datetime.utcnow()
        )
        db.add(receipt)
        db.commit()

    return {"message": "Announcement marked as read", "is_read": True}

@router.post("", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
def create_announcement(
    ann_in: AnnouncementCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role == UserRole.ADMIN.value:
        pass
    elif user_role == UserRole.TEACHER.value:
        # Teachers can only post class announcements for classes they teach
        if ann_in.target_audience in ["ALL", "PARENTS_ALL", "TEACHERS_ALL"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Teachers are only permitted to post announcements targeted to their assigned classes."
            )
        if not ann_in.target_class_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A valid assigned target class must be selected for the announcement."
            )
        teacher = db.query(Teacher).filter(
            (Teacher.user_id == current_user.id) | (Teacher.email == current_user.email)
        ).first()
        if not teacher:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No teacher profile associated.")

        cls = db.query(Classroom).filter(Classroom.id == ann_in.target_class_id).first()
        is_mentor = cls and cls.class_teacher_id == teacher.id
        is_assigned = db.query(TeacherSubjectAssignment).filter(
            TeacherSubjectAssignment.teacher_id == teacher.id,
            TeacherSubjectAssignment.class_id == ann_in.target_class_id
        ).first() is not None

        if not (is_mentor or is_assigned):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only publish announcements for your assigned classes."
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to publish school announcements."
        )

    pub_date = ann_in.publish_date or datetime.utcnow()
    t_grade = ann_in.target_grade
    t_sec = ann_in.target_section
    if ann_in.target_class_id:
        c_obj = db.query(Classroom).filter(Classroom.id == ann_in.target_class_id).first()
        if c_obj:
            t_grade = t_grade or c_obj.name
            t_sec = t_sec or c_obj.section

    new_ann = Announcement(
        title=ann_in.title,
        content=ann_in.content,
        category=ann_in.category,
        priority=ann_in.priority,
        target_audience=ann_in.target_audience,
        target_grade=t_grade,
        target_class_id=ann_in.target_class_id,
        target_section=t_sec,
        is_published=ann_in.is_published,
        status=ann_in.status,
        publish_date=pub_date,
        expiration_date=ann_in.expiration_date,
        attachment_url=ann_in.attachment_url,
        attachment_name=ann_in.attachment_name,
        created_by=current_user.id
    )
    db.add(new_ann)
    db.commit()
    db.refresh(new_ann)
    return _format_announcement(new_ann, current_user, db)

@router.put("/{announcement_id}", response_model=AnnouncementResponse)
def update_announcement(
    announcement_id: int,
    ann_in: AnnouncementUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ann = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")

    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role == UserRole.ADMIN.value:
        pass
    elif user_role == UserRole.TEACHER.value:
        if ann.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only modify announcements created by yourself."
            )
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied.")

    update_dict = ann_in.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(ann, field, val)

    db.commit()
    db.refresh(ann)
    return _format_announcement(ann, current_user, db)

@router.delete("/{announcement_id}")
def delete_announcement(
    announcement_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ann = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")

    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role == UserRole.ADMIN.value:
        pass
    elif user_role == UserRole.TEACHER.value:
        if ann.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete announcements created by yourself."
            )
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied.")

    db.delete(ann)
    db.commit()
    return {"message": "Announcement removed successfully"}

@router.put("/{announcement_id}/toggle-status")
def toggle_announcement_status(
    announcement_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ann = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")

    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role == UserRole.ADMIN.value:
        pass
    elif user_role == UserRole.TEACHER.value:
        if ann.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only toggle status for announcements created by yourself."
            )
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied.")

    if ann.status == "Published":
        ann.status = "Archived"
        ann.is_published = False
    else:
        ann.status = "Published"
        ann.is_published = True

    db.commit()
    return {"message": f"Announcement status updated to {ann.status}", "status": ann.status}

    db.commit()
    return {"message": f"Announcement status updated to {ann.status}", "status": ann.status}
