import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.database import engine, Base, SessionLocal
from app.models.timetable import TimetablePeriod
from app.models.classroom import Classroom
from app.models.teacher import Teacher
from app.models.user import User, UserRole
from app.core.security import hash_password

print("Initializing metadata...")
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# 1. Ensure Teachers exist for the subjects
needed_teachers = [
    {"name": "Ms. Sarah Jenkins", "email": "s.jenkins@oakridge.edu", "dept": "Languages", "subject": "English", "emp": "TCH-ENG01"},
    {"name": "Mr. Alan Turing", "email": "a.turing@oakridge.edu", "dept": "Mathematics", "subject": "Mathematics", "emp": "TCH-MTH01"},
    {"name": "Dr. Marie Curie", "email": "m.curie@oakridge.edu", "dept": "Sciences", "subject": "Science", "emp": "TCH-SCI01"},
    {"name": "Prof. Rajesh Sharma", "email": "r.sharma@oakridge.edu", "dept": "Languages", "subject": "Hindi", "emp": "TCH-HIN01"},
    {"name": "Ms. Ada Lovelace", "email": "a.lovelace@oakridge.edu", "dept": "Technology", "subject": "Computer", "emp": "TCH-CS01"},
]

teacher_map = {}
for t_data in needed_teachers:
    t_obj = db.query(Teacher).filter(Teacher.email == t_data["email"]).first()
    if not t_obj:
        u_obj = db.query(User).filter(User.email == t_data["email"]).first()
        if not u_obj:
            u_obj = User(
                email=t_data["email"],
                full_name=t_data["name"],
                hashed_password=hash_password("TeacherSecure123!"),
                role=UserRole.TEACHER,
                is_active=True
            )
            db.add(u_obj)
            db.commit()
            db.refresh(u_obj)
        t_obj = Teacher(
            employee_id=t_data["emp"],
            name=t_data["name"],
            email=t_data["email"],
            department=t_data["dept"],
            subject=t_data["subject"],
            user_id=u_obj.id
        )
        db.add(t_obj)
        db.commit()
        db.refresh(t_obj)
        print(f"Created teacher: {t_obj.name} ({t_obj.subject})")
    teacher_map[t_data["subject"]] = t_obj

# 2. Ensure Classes exist: Class 1-A, Class 1-B, Class 2-A, Class 3-A
classes_config = [
    {"code": "CLS-1A", "name": "Class 1", "section": "A", "room": "Room 101"},
    {"code": "CLS-1B", "name": "Class 1", "section": "B", "room": "Room 102"},
    {"code": "CLS-2A", "name": "Class 2", "section": "A", "room": "Room 201"},
    {"code": "CLS-3A", "name": "Class 3", "section": "A", "room": "Room 301"},
]

class_map = {}
for c_conf in classes_config:
    cls = db.query(Classroom).filter(Classroom.name == c_conf["name"], Classroom.section == c_conf["section"]).first()
    if not cls:
        cls = Classroom(
            class_code=c_conf["code"],
            name=c_conf["name"],
            section=c_conf["section"],
            room=c_conf["room"],
            capacity=30
        )
        db.add(cls)
        db.commit()
        db.refresh(cls)
        print(f"Created class: {cls.name}-{cls.section}")
    class_map[f"{c_conf['name']}-{c_conf['section']}"] = cls

# 3. Seed exact test timetable periods (Monday - Friday)
academic_year = "2026-2027"
days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

# Plan from Requirement 9:
# Class 1-A: English, Mathematics, Science, Hindi
# Class 1-B: Mathematics, English, Hindi, Science
# Class 2-A: Science, English, Mathematics, Computer
# Class 3-A: Hindi, Mathematics, Computer, English
plans = {
    "Class 1-A": ["English", "Mathematics", "Science", "Hindi"],
    "Class 1-B": ["Mathematics", "English", "Hindi", "Science"],
    "Class 2-A": ["Science", "English", "Mathematics", "Computer"],
    "Class 3-A": ["Hindi", "Mathematics", "Computer", "English"]
}

for class_key, subjects in plans.items():
    cls = class_map.get(class_key)
    if not cls:
        continue

    # Clear previous slots for clean setup
    db.query(TimetablePeriod).filter(
        TimetablePeriod.class_id == cls.id,
        TimetablePeriod.academic_year == academic_year
    ).delete()
    db.commit()

    periods_to_add = []
    for day in days:
        # Period 1
        sub1 = subjects[0]
        periods_to_add.append(TimetablePeriod(
            academic_year=academic_year,
            class_id=cls.id,
            section=cls.section,
            day_of_week=day,
            period_number=1,
            start_time="08:30",
            end_time="09:20",
            subject=sub1,
            teacher_id=teacher_map.get(sub1).id if teacher_map.get(sub1) else None,
            room=cls.room,
            is_break=False
        ))

        # Period 2
        sub2 = subjects[1]
        periods_to_add.append(TimetablePeriod(
            academic_year=academic_year,
            class_id=cls.id,
            section=cls.section,
            day_of_week=day,
            period_number=2,
            start_time="09:25",
            end_time="10:15",
            subject=sub2,
            teacher_id=teacher_map.get(sub2).id if teacher_map.get(sub2) else None,
            room=cls.room,
            is_break=False
        ))

        # Period 3
        sub3 = subjects[2]
        periods_to_add.append(TimetablePeriod(
            academic_year=academic_year,
            class_id=cls.id,
            section=cls.section,
            day_of_week=day,
            period_number=3,
            start_time="10:20",
            end_time="11:10",
            subject=sub3,
            teacher_id=teacher_map.get(sub3).id if teacher_map.get(sub3) else None,
            room=cls.room,
            is_break=False
        ))

        # Period 4: Recess / Lunch
        periods_to_add.append(TimetablePeriod(
            academic_year=academic_year,
            class_id=cls.id,
            section=cls.section,
            day_of_week=day,
            period_number=4,
            start_time="11:10",
            end_time="11:45",
            subject="Lunch & Campus Recess",
            teacher_id=None,
            room="Cafeteria",
            is_break=True
        ))

        # Period 5
        sub4 = subjects[3]
        periods_to_add.append(TimetablePeriod(
            academic_year=academic_year,
            class_id=cls.id,
            section=cls.section,
            day_of_week=day,
            period_number=5,
            start_time="11:45",
            end_time="12:35",
            subject=sub4,
            teacher_id=teacher_map.get(sub4).id if teacher_map.get(sub4) else None,
            room=cls.room,
            is_break=False
        ))

    db.add_all(periods_to_add)
    db.commit()
    print(f"Seeded {len(periods_to_add)} periods for {class_key} (P1: {subjects[0]}, P2: {subjects[1]}, P3: {subjects[2]}, P5: {subjects[3]})")

db.close()
print("Seeding of Class 1-A, 1-B, 2-A, 3-A finished successfully!")
