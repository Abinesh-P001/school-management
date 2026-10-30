import sys
import os
from datetime import date
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import SessionLocal
from app.models.examination import Examination, Mark
from app.models.parent import Parent, ParentStudent
from app.models.user import User, UserRole
from app.models.student import Student
from app.core.security import hash_password

db = SessionLocal()

# 1. Ensure User for Nausheen
u14 = db.query(User).filter(User.id == 14).first()
if u14:
    u14.hashed_password = hash_password("StudentSecure123!")
    u14.is_active = True

# 2. Add Exams for Class 2 if not present
e_math = db.query(Examination).filter(Examination.class_id == 2, Examination.name == "Final Board Exams 2026", Examination.subject == "Mathematics").first()
if not e_math:
    e_math = Examination(
        exam_code="EXAM-2026-C2-MATH",
        name="Final Board Exams 2026",
        academic_year="2025-2026",
        class_id=2,
        subject="Mathematics",
        exam_type="Final Exam",
        exam_date=date(2026, 3, 10),
        time_slot="09:00 - 12:00",
        total_marks=100,
        passing_marks=35,
        status="Published",
        is_locked=True
    )
    db.add(e_math)
    db.flush()

e_eng = db.query(Examination).filter(Examination.class_id == 2, Examination.name == "Final Board Exams 2026", Examination.subject == "English Language").first()
if not e_eng:
    e_eng = Examination(
        exam_code="EXAM-2026-C2-ENG",
        name="Final Board Exams 2026",
        academic_year="2025-2026",
        class_id=2,
        subject="English Language",
        exam_type="Final Exam",
        exam_date=date(2026, 3, 12),
        time_slot="09:00 - 12:00",
        total_marks=100,
        passing_marks=35,
        status="Published",
        is_locked=True
    )
    db.add(e_eng)
    db.flush()

e_draft = db.query(Examination).filter(Examination.class_id == 2, Examination.name == "Final Board Exams 2026", Examination.subject == "Advanced Robotics (Draft)").first()
if not e_draft:
    e_draft = Examination(
        exam_code="EXAM-2026-C2-ROBO",
        name="Final Board Exams 2026",
        academic_year="2025-2026",
        class_id=2,
        subject="Advanced Robotics (Draft)",
        exam_type="Final Exam",
        exam_date=date(2026, 3, 15),
        time_slot="09:00 - 12:00",
        total_marks=50,
        passing_marks=20,
        status="Draft",
        is_locked=False
    )
    db.add(e_draft)
    db.flush()

# 3. Add Marks for Student 18
m_math = db.query(Mark).filter(Mark.examination_id == e_math.id, Mark.student_id == 18).first()
if not m_math:
    m_math = Mark(
        examination_id=e_math.id,
        student_id=18,
        marks_obtained=95.0,
        is_absent=False,
        grade="A+",
        status="Passed",
        remarks="Outstanding performance in Mathematics."
    )
    db.add(m_math)

m_eng = db.query(Mark).filter(Mark.examination_id == e_eng.id, Mark.student_id == 18).first()
if not m_eng:
    m_eng = Mark(
        examination_id=e_eng.id,
        student_id=18,
        marks_obtained=88.0,
        is_absent=False,
        grade="A",
        status="Passed",
        remarks="Excellent grasp of literature."
    )
    db.add(m_eng)

m_draft = db.query(Mark).filter(Mark.examination_id == e_draft.id, Mark.student_id == 18).first()
if not m_draft:
    m_draft = Mark(
        examination_id=e_draft.id,
        student_id=18,
        marks_obtained=45.0,
        is_absent=False,
        grade="A+",
        status="Passed",
        remarks="Preliminary evaluation pending admin publication."
    )
    db.add(m_draft)

# 4. Create verified Parent for Student 18
parent_user = db.query(User).filter(User.email == "parent.nausheen@oakridge.edu").first()
if not parent_user:
    parent_user = User(
        email="parent.nausheen@oakridge.edu",
        hashed_password=hash_password("ParentSecure123!"),
        full_name="Dr. Tariq Nausheen",
        role=UserRole.PARENT,
        is_active=True
    )
    db.add(parent_user)
    db.flush()

parent_prof = db.query(Parent).filter(Parent.email == "parent.nausheen@oakridge.edu").first()
if not parent_prof:
    parent_prof = Parent(
        user_id=parent_user.id,
        parent_code="PAR-2026-0002",
        name="Dr. Tariq Nausheen",
        email="parent.nausheen@oakridge.edu",
        phone="+1 555-019-9898",
        status="Active"
    )
    db.add(parent_prof)
    db.flush()

# Link verified parent to student 18
link = db.query(ParentStudent).filter(ParentStudent.parent_id == parent_prof.id, ParentStudent.student_id == 18).first()
if not link:
    link = ParentStudent(
        parent_id=parent_prof.id,
        student_id=18,
        relationship="Father",
        is_verified=True
    )
    db.add(link)

db.commit()
print("Seeded exams, marks, and verified parent for Student 18 successfully!")
db.close()
