import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.database import engine, Base, SessionLocal
from app.models.timetable import TimetablePeriod
from app.models.classroom import Classroom
from app.models.teacher import Teacher
from app.models.user import User

print("1. Creating timetables table via SQLAlchemy metadata...")
Base.metadata.create_all(bind=engine)
print("   Timetables table verified or created.")

db = SessionLocal()

print("2. Ensuring classes exist (Class 6-A, Class 6-B, Class 7-A, Class 8-A, Grade 10-A, etc.)...")
sample_classes = [
    {"class_code": "CLS-6A", "name": "Class 6", "section": "A", "room": "Room 101", "capacity": 30},
    {"class_code": "CLS-6B", "name": "Class 6", "section": "B", "room": "Room 102", "capacity": 30},
    {"class_code": "CLS-7A", "name": "Class 7", "section": "A", "room": "Room 201", "capacity": 30},
    {"class_code": "CLS-8A", "name": "Class 8", "section": "A", "room": "Room 202", "capacity": 30},
    {"class_code": "CLS-10A", "name": "Grade 10", "section": "A", "room": "Room 301", "capacity": 35},
    {"class_code": "CLS-10B", "name": "Grade 10", "section": "B", "room": "Room 302", "capacity": 35},
    {"class_code": "CLS-11A", "name": "Grade 11", "section": "A", "room": "Room 401", "capacity": 30},
    {"class_code": "CLS-12S", "name": "Grade 12", "section": "Science", "room": "Lab 3", "capacity": 30},
]

for sc in sample_classes:
    existing = db.query(Classroom).filter(Classroom.class_code == sc["class_code"]).first()
    if not existing:
        # Also check by name and section
        existing_ns = db.query(Classroom).filter(Classroom.name == sc["name"], Classroom.section == sc["section"]).first()
        if not existing_ns:
            new_cls = Classroom(
                class_code=sc["class_code"],
                name=sc["name"],
                section=sc["section"],
                room=sc["room"],
                capacity=sc["capacity"]
            )
            db.add(new_cls)
            print(f"   Created class: {sc['name']} - Section {sc['section']} ({sc['class_code']})")

db.commit()

# Get teacher references for assignments
teachers = db.query(Teacher).all()
t_math = teachers[0] if len(teachers) > 0 else None
t_eng = teachers[1] if len(teachers) > 1 else t_math
t_sci = teachers[2] if len(teachers) > 2 else t_math

print("3. Seeding separate, distinct timetables for Class 6-A, Class 6-B, Class 7-A...")
cls_6a = db.query(Classroom).filter(Classroom.name == "Class 6", Classroom.section == "A").first()
cls_6b = db.query(Classroom).filter(Classroom.name == "Class 6", Classroom.section == "B").first()
cls_7a = db.query(Classroom).filter(Classroom.name == "Class 7", Classroom.section == "A").first()
cls_10a = db.query(Classroom).filter(Classroom.name == "Grade 10", Classroom.section == "A").first()

academic_year = "2026-2027"

def seed_class_timetable(classroom, period_1_subject, period_1_teacher, period_2_subject, period_2_teacher, period_3_subject):
    if not classroom:
        return
    
    # Check if timetable already seeded for this class
    existing_count = db.query(TimetablePeriod).filter(
        TimetablePeriod.class_id == classroom.id,
        TimetablePeriod.academic_year == academic_year
    ).count()

    if existing_count > 0:
        print(f"   Class {classroom.name}-{classroom.section} already has {existing_count} timetable periods.")
        return

    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    periods = []
    for day in days:
        # Period 1
        periods.append(TimetablePeriod(
            academic_year=academic_year,
            class_id=classroom.id,
            section=classroom.section,
            day_of_week=day,
            period_number=1,
            start_time="08:30",
            end_time="09:20",
            subject=period_1_subject,
            teacher_id=period_1_teacher.id if period_1_teacher else None,
            room=classroom.room or "Room 101",
            is_break=False
        ))
        # Period 2
        periods.append(TimetablePeriod(
            academic_year=academic_year,
            class_id=classroom.id,
            section=classroom.section,
            day_of_week=day,
            period_number=2,
            start_time="09:25",
            end_time="10:15",
            subject=period_2_subject,
            teacher_id=period_2_teacher.id if period_2_teacher else None,
            room=classroom.room or "Room 101",
            is_break=False
        ))
        # Period 3
        periods.append(TimetablePeriod(
            academic_year=academic_year,
            class_id=classroom.id,
            section=classroom.section,
            day_of_week=day,
            period_number=3,
            start_time="10:20",
            end_time="11:10",
            subject=period_3_subject,
            teacher_id=None,
            room=classroom.room or "Room 101",
            is_break=False
        ))
        # Period 4: Lunch & Recess Break
        periods.append(TimetablePeriod(
            academic_year=academic_year,
            class_id=classroom.id,
            section=classroom.section,
            day_of_week=day,
            period_number=4,
            start_time="11:10",
            end_time="11:45",
            subject="Lunch & Campus Recess",
            teacher_id=None,
            room="Cafeteria & Courtyard",
            is_break=True
        ))
        # Period 5
        periods.append(TimetablePeriod(
            academic_year=academic_year,
            class_id=classroom.id,
            section=classroom.section,
            day_of_week=day,
            period_number=5,
            start_time="11:45",
            end_time="12:35",
            subject="Social Studies & History",
            teacher_id=None,
            room=classroom.room or "Room 101",
            is_break=False
        ))
        # Period 6
        periods.append(TimetablePeriod(
            academic_year=academic_year,
            class_id=classroom.id,
            section=classroom.section,
            day_of_week=day,
            period_number=6,
            start_time="12:40",
            end_time="13:30",
            subject="Physical Education & Sports",
            teacher_id=None,
            room="Gymnasium",
            is_break=False
        ))

    db.add_all(periods)
    db.commit()
    print(f"   Successfully seeded timetable for {classroom.name}-{classroom.section} with {len(periods)} periods. Period 1: {period_1_subject}")

# Seed Class 6-A: Mathematics in Period 1
seed_class_timetable(cls_6a, "Mathematics", t_math, "General Science", t_sci, "English Literature")

# Seed Class 6-B: English in Period 1
seed_class_timetable(cls_6b, "English", t_eng, "Mathematics", t_math, "Art & Music")

# Seed Class 7-A: Science in Period 1
seed_class_timetable(cls_7a, "Science", t_sci, "World History", t_eng, "Mathematics")

# Seed Grade 10-A: Advanced Physics in Period 1
seed_class_timetable(cls_10a, "Advanced Physics", t_sci, "Calculus & Geometry", t_math, "Computer Science")

db.close()
print("\nTIMETABLE MIGRATION AND SEEDING COMPLETED!")
