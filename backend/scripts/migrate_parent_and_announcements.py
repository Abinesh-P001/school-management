import sys
import os
from datetime import datetime, date, timedelta
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.database import engine, SessionLocal, Base
from app.models.user import User, UserRole
from app.models.student import Student
from app.models.classroom import Classroom
from app.models.parent import Parent, ParentStudent, ParentCorrectionRequest
from app.models.announcement import Announcement, AnnouncementReadReceipt
from app.core.security import hash_password

def run_migration():
    print("Creating all tables in database...")
    Base.metadata.create_all(bind=engine)
    print("Tables created / verified successfully.")

    db = SessionLocal()
    try:
        # 1. Create or get Parent User & Profile
        parent_email = "parent.chen@oakridge.edu"
        user = db.query(User).filter(User.email == parent_email).first()
        if not user:
            print(f"Creating user {parent_email}...")
            user = User(
                email=parent_email,
                hashed_password=hash_password("ParentSecure123!"),
                full_name="Wei Chen",
                role=UserRole.PARENT,
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"Created user {user.email} (ID: {user.id})")
        else:
            user.role = UserRole.PARENT
            user.hashed_password = hash_password("ParentSecure123!")
            user.is_active = True
            db.commit()
            db.refresh(user)
            print(f"Updated user {user.email} (ID: {user.id})")

        parent = db.query(Parent).filter(Parent.user_id == user.id).first()
        if not parent:
            print(f"Creating parent profile for {user.full_name}...")
            parent = Parent(
                user_id=user.id,
                parent_code="PAR-1001",
                name="Wei Chen",
                email=parent_email,
                phone="+1 (555) 876-1209",
                alternate_phone="+1 (555) 876-9901",
                relationship_type="Father",
                address="742 Evergreen Terrace, Silicon Valley, CA",
                occupation="Senior Software Architect",
                status="Active"
            )
            db.add(parent)
            db.commit()
            db.refresh(parent)
            print(f"Created parent record (ID: {parent.id}, Code: {parent.parent_code})")

        # 2. Link Parent to Students
        # Let's see what students are available in DB
        students = db.query(Student).all()
        print(f"Found {len(students)} students in DB.")
        
        # We will link parent to 2 students: e.g. first 2 students or Sophia Chen / Aria Montgomery
        target_students = []
        sophia = db.query(Student).filter(Student.name.like("%Chen%")).first()
        if sophia:
            target_students.append(sophia)
        
        for st in students:
            if st not in target_students and len(target_students) < 2:
                target_students.append(st)

        for st in target_students:
            link = db.query(ParentStudent).filter(
                ParentStudent.parent_id == parent.id,
                ParentStudent.student_id == st.id
            ).first()
            if not link:
                print(f"Linking parent {parent.name} to student {st.name} ({st.student_id})...")
                link = ParentStudent(
                    parent_id=parent.id,
                    student_id=st.id,
                    relationship="Father",
                    is_primary_contact=True,
                    is_verified=True,
                    verified_at=datetime.utcnow()
                )
                db.add(link)
                db.commit()
                print(f"Successfully linked to {st.name}")

        # 3. Seed Announcements
        announcements_data = [
            {
                "title": "Annual Science Exhibition & Tech Showcase 2026",
                "content": "We are thrilled to announce the Oakridge Annual Science & Innovation Showcase scheduled for next Friday. Students across all grades will be presenting interactive STEM projects, robotics prototypes, and scientific research. Parents, guardians, and faculty are warmly invited to attend the opening ceremony in the main auditorium at 9:30 AM.",
                "category": "Event",
                "priority": "High",
                "target_audience": "ALL",
                "target_grade": None,
                "is_published": True,
                "status": "Published",
                "attachment_name": "Event_Schedule_and_Auditorium_Map.pdf",
                "attachment_url": "/assets/announcements/event_schedule.pdf"
            },
            {
                "title": "Term 2 Parent-Teacher Conference (PTC) Scheduling",
                "content": "Online slot booking for Term 2 Parent-Teacher Conferences is now officially open. Consultations will be conducted in 15-minute intervals either on campus or via video conference. Please review your child's recent grade book and attendance records in this portal prior to meeting with mentors.",
                "category": "Academic",
                "priority": "High",
                "target_audience": "PARENTS_ALL",
                "target_grade": None,
                "is_published": True,
                "status": "Published",
                "attachment_name": "PTC_Guidelines_2026.pdf",
                "attachment_url": "/assets/announcements/ptc_guidelines.pdf"
            },
            {
                "title": "Grade 10 Board Registration & Document Verification",
                "content": "All parents and guardians of Grade 10 students must submit verified birth certificates, transfer certificates, and passport-size photographs before the upcoming deadline. Discrepancies in name spelling or date of birth will affect final board diploma issuance.",
                "category": "Academic",
                "priority": "Urgent",
                "target_audience": "PARENTS_GRADE",
                "target_grade": "Grade 10",
                "is_published": True,
                "status": "Published",
                "attachment_name": "Grade10_Verification_Checklist.pdf",
                "attachment_url": "/assets/announcements/grade10_checklist.pdf"
            },
            {
                "title": "Faculty & Academic Staff Curriculum Alignment Meeting",
                "content": "Mandatory staff briefing for all full-time and adjunct instructors regarding mid-term grading submission windows, exam question moderation, and lab safety audit protocols.",
                "category": "General",
                "priority": "Normal",
                "target_audience": "TEACHERS_ALL",
                "target_grade": None,
                "is_published": True,
                "status": "Published",
                "attachment_name": "Curriculum_Alignment_Agenda.pdf",
                "attachment_url": "/assets/announcements/curriculum_agenda.pdf"
            }
        ]

        admin_user = db.query(User).filter(User.role == UserRole.ADMIN).first()
        admin_id = admin_user.id if admin_user else user.id

        for ann_data in announcements_data:
            existing = db.query(Announcement).filter(Announcement.title == ann_data["title"]).first()
            if not existing:
                print(f"Creating announcement: {ann_data['title']}")
                ann = Announcement(
                    title=ann_data["title"],
                    content=ann_data["content"],
                    category=ann_data["category"],
                    priority=ann_data["priority"],
                    target_audience=ann_data["target_audience"],
                    target_grade=ann_data.get("target_grade"),
                    is_published=ann_data["is_published"],
                    status=ann_data["status"],
                    publish_date=datetime.utcnow() - timedelta(days=1),
                    attachment_name=ann_data.get("attachment_name"),
                    attachment_url=ann_data.get("attachment_url"),
                    created_by=admin_id
                )
                db.add(ann)
                db.commit()

        print("Parent Portal and Announcements migration completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error during migration: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
