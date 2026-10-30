import os
import sys
from datetime import date, datetime
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.classroom import Classroom
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User, UserRole
from app.models.examination import Examination, Mark, GradingRule
from app.models.teacher_subject_assignment import TeacherSubjectAssignment
from app.routers.examinations import calculate_grade_and_status

def seed_comprehensive_exams():
    db = SessionLocal()
    try:
        print("[SEED] Starting comprehensive exams and marks seeding...")

        # 1. Teachers
        t_vance = db.query(Teacher).filter(Teacher.email == "e.vance@oakridge.edu").first()
        t_watson = db.query(Teacher).filter(Teacher.email == "j.watson@oakridge.edu").first()
        t_robert = db.query(Teacher).filter(Teacher.email == "dr.robert@oakridge.edu").first()

        # 2. Ensure Classrooms exist
        class_specs = [
            ("Grade 10", "A", "Room 101"),
            ("Grade 10", "B", "Room 102"),
            ("Class 1", "A", "Room 1A"),
            ("Class 1", "B", "Room 1B"),
            ("Class 2", "A", "Room 2A"),
            ("Class 3", "A", "Room 3A"),
            ("Class 5", "A", "Room 5A"),
            ("Class 5", "B", "Room 5B"),
            ("Class 6", "A", "Room 6A"),
            ("Class 6", "B", "Room 6B"),
        ]

        class_map = {}
        for name, sec, room in class_specs:
            cls = db.query(Classroom).filter(Classroom.name == name, Classroom.section == sec).first()
            if not cls:
                cls_code = f"CLS-{name.replace(' ', '').upper()}-{sec}"
                cls = Classroom(
                    class_code=cls_code,
                    name=name,
                    section=sec,
                    room=room,
                    capacity=35,
                    class_teacher_id=t_vance.id if t_vance else None
                )
                db.add(cls)
                db.flush()
            class_map[f"{name}-{sec}"] = cls

        db.commit()

        # 3. Seed Students in Class 1-A, 1-B, 5-A, 5-B, 10-A
        student_specs = [
            # Class 1-A
            ("Aarav Sharma", "STU-1A-01", "ADM-2026-101", "1A-01", "Class 1-A", "aarav.s@oakridge.edu"),
            ("Ananya Verma", "STU-1A-02", "ADM-2026-102", "1A-02", "Class 1-A", "ananya.v@oakridge.edu"),
            ("Rohan Das", "STU-1A-03", "ADM-2026-103", "1A-03", "Class 1-A", "rohan.d@oakridge.edu"),
            ("Pooja Nair", "STU-1A-04", "ADM-2026-104", "1A-04", "Class 1-A", "pooja.n@oakridge.edu"),

            # Class 1-B
            ("Kabir Mehta", "STU-1B-01", "ADM-2026-105", "1B-01", "Class 1-B", "kabir.m@oakridge.edu"),
            ("Isha Patel", "STU-1B-02", "ADM-2026-106", "1B-02", "Class 1-B", "isha.p@oakridge.edu"),
            ("Dev Kulkarni", "STU-1B-03", "ADM-2026-107", "1B-03", "Class 1-B", "dev.k@oakridge.edu"),

            # Class 5-A
            ("Arjun Reddy", "STU-5A-01", "ADM-2026-501", "5A-01", "Class 5-A", "arjun.r@oakridge.edu"),
            ("Diya Sen", "STU-5A-02", "ADM-2026-502", "5A-02", "Class 5-A", "diya.s@oakridge.edu"),
            ("Kavya Pillai", "STU-5A-03", "ADM-2026-503", "5A-03", "Class 5-A", "kavya.p@oakridge.edu"),
            ("Aditya Joshi", "STU-5A-04", "ADM-2026-504", "5A-04", "Class 5-A", "aditya.j@oakridge.edu"),

            # Class 5-B
            ("Manish Rao", "STU-5B-01", "ADM-2026-505", "5B-01", "Class 5-B", "manish.r@oakridge.edu"),
            ("Sneha Roy", "STU-5B-02", "ADM-2026-506", "5B-02", "Class 5-B", "sneha.r@oakridge.edu"),
            ("Farhan Khan", "STU-5B-03", "ADM-2026-507", "5B-03", "Class 5-B", "farhan.k@oakridge.edu"),

            # Grade 10-A
            ("Maya Lin", "STU-9021", "ADM-2026-901", "10A-01", "Grade 10-A", "maya.lin@oakridge.edu"),
            ("Lucas Scott", "STU-1004", "ADM-2026-902", "10A-02", "Grade 10-A", "lucas.scott@oakridge.edu"),
            ("Zara Al-Mansoor", "STU-1005", "ADM-2026-903", "10A-03", "Grade 10-A", "zara.m@oakridge.edu"),
        ]

        student_map = {}
        for name, scode, adm, roll, cls_key, email in student_specs:
            st = db.query(Student).filter(Student.student_id == scode).first()
            cls = class_map[cls_key]
            if not st:
                st = Student(
                    student_id=scode,
                    admission_number=adm,
                    roll_number=roll,
                    name=name,
                    email=email,
                    class_id=cls.id,
                    status="Active",
                    date_of_birth=date(2012, 5, 15),
                    gender="Other",
                    guardian_name=f"Parent of {name}",
                    guardian_phone="9876543210"
                )
                db.add(st)
                db.flush()
            else:
                st.class_id = cls.id
                st.admission_number = adm
                st.roll_number = roll
            student_map[scode] = st

        db.commit()

        # 4. Teacher Subject Assignments
        # Vance: English in Class 1-A, Class 5-A, Grade 10-A
        # Watson: Mathematics in Class 1-A, Class 1-B, Class 5-A, Class 5-B, Grade 10-A
        # Robert: Science in Class 1-A, Class 5-A, Chemistry in Grade 10-A
        assignments_data = [
            (t_vance, "Class 1-A", "English"),
            (t_watson, "Class 1-A", "Mathematics"),
            (t_robert, "Class 1-A", "Science"),

            (t_watson, "Class 1-B", "Mathematics"),
            (t_vance, "Class 1-B", "English"),

            (t_watson, "Class 5-A", "Mathematics"),
            (t_robert, "Class 5-A", "Science"),
            (t_vance, "Class 5-A", "English"),

            (t_watson, "Class 5-B", "Mathematics"),
            (t_vance, "Class 5-B", "English"),

            (t_watson, "Grade 10-A", "Mathematics"),
            (t_robert, "Grade 10-A", "Chemistry"),
            (t_vance, "Grade 10-A", "English"),
        ]

        for teacher, cls_key, subj in assignments_data:
            if not teacher:
                continue
            cls = class_map[cls_key]
            exist_as = db.query(TeacherSubjectAssignment).filter(
                TeacherSubjectAssignment.teacher_id == teacher.id,
                TeacherSubjectAssignment.class_id == cls.id,
                TeacherSubjectAssignment.subject == subj
            ).first()
            if not exist_as:
                asgn = TeacherSubjectAssignment(
                    teacher_id=teacher.id,
                    class_id=cls.id,
                    subject=subj,
                    can_add_students=True
                )
                db.add(asgn)

        db.commit()

        # 5. Distinct Examinations for Class 1-A, 1-B, 5-A, 5-B, 10-A
        exams_specs = [
            # Class 1-A: Unit Test 1
            {
                "code": "EXM-1A-ENG", "name": "Unit Test 1", "cls": "Class 1-A", "sec": "A",
                "type": "Unit Test", "subj": "English", "date": date(2026, 9, 10),
                "total": 50, "pass": 20, "status": "Published", "locked": True
            },
            {
                "code": "EXM-1A-MATH", "name": "Unit Test 1", "cls": "Class 1-A", "sec": "A",
                "type": "Unit Test", "subj": "Mathematics", "date": date(2026, 9, 11),
                "total": 50, "pass": 20, "status": "Published", "locked": True
            },
            {
                "code": "EXM-1A-SCI", "name": "Unit Test 1", "cls": "Class 1-A", "sec": "A",
                "type": "Unit Test", "subj": "Science", "date": date(2026, 9, 12),
                "total": 50, "pass": 20, "status": "Published", "locked": True
            },

            # Class 1-B: Unit Test 1
            {
                "code": "EXM-1B-MATH", "name": "Unit Test 1", "cls": "Class 1-B", "sec": "B",
                "type": "Unit Test", "subj": "Mathematics", "date": date(2026, 9, 11),
                "total": 50, "pass": 20, "status": "Published", "locked": True
            },
            {
                "code": "EXM-1B-ENG", "name": "Unit Test 1", "cls": "Class 1-B", "sec": "B",
                "type": "Unit Test", "subj": "English", "date": date(2026, 9, 12),
                "total": 50, "pass": 20, "status": "Published", "locked": True
            },

            # Class 5-A: Mid-Term Examination
            {
                "code": "EXM-5A-MATH", "name": "Mid-Term Examination", "cls": "Class 5-A", "sec": "A",
                "type": "Mid-Term", "subj": "Mathematics", "date": date(2026, 10, 5),
                "total": 100, "pass": 40, "status": "Published", "locked": True
            },
            {
                "code": "EXM-5A-SCI", "name": "Mid-Term Examination", "cls": "Class 5-A", "sec": "A",
                "type": "Mid-Term", "subj": "Science", "date": date(2026, 10, 7),
                "total": 100, "pass": 40, "status": "Published", "locked": True
            },
            {
                "code": "EXM-5A-ENG", "name": "Mid-Term Examination", "cls": "Class 5-A", "sec": "A",
                "type": "Mid-Term", "subj": "English", "date": date(2026, 10, 9),
                "total": 80, "pass": 32, "status": "Published", "locked": True
            },

            # Class 5-B: Mid-Term Examination (Completely separate!)
            {
                "code": "EXM-5B-MATH", "name": "Mid-Term Examination", "cls": "Class 5-B", "sec": "B",
                "type": "Mid-Term", "subj": "Mathematics", "date": date(2026, 10, 5),
                "total": 100, "pass": 40, "status": "Published", "locked": True
            },
            {
                "code": "EXM-5B-ENG", "name": "Mid-Term Examination", "cls": "Class 5-B", "sec": "B",
                "type": "Mid-Term", "subj": "English", "date": date(2026, 10, 8),
                "total": 80, "pass": 32, "status": "Published", "locked": True
            },

            # Grade 10-A: Mid-Term Examination 2026
            {
                "code": "EXM-10A-CHEM", "name": "Mid-Term Examination 2026", "cls": "Grade 10-A", "sec": "A",
                "type": "Mid-Term", "subj": "Chemistry", "date": date(2026, 11, 12),
                "total": 100, "pass": 40, "status": "Published", "locked": True
            },
            {
                "code": "EXM-10A-MATH", "name": "Mid-Term Examination 2026", "cls": "Grade 10-A", "sec": "A",
                "type": "Mid-Term", "subj": "Mathematics", "date": date(2026, 11, 14),
                "total": 100, "pass": 40, "status": "Published", "locked": True
            },
        ]

        exam_map = {}
        for sp in exams_specs:
            cls = class_map[sp["cls"]]
            ex = db.query(Examination).filter(Examination.exam_code == sp["code"]).first()
            if not ex:
                ex = Examination(
                    exam_code=sp["code"],
                    name=sp["name"],
                    academic_year="2026-2027",
                    class_id=cls.id,
                    section=sp["sec"],
                    exam_type=sp["type"],
                    subject=sp["subj"],
                    exam_date=sp["date"],
                    start_date=sp["date"],
                    end_date=sp["date"],
                    time_slot="09:00 AM - 12:00 PM",
                    total_marks=sp["total"],
                    passing_marks=sp["pass"],
                    status=sp["status"],
                    is_locked=sp["locked"],
                    published_at=datetime.utcnow()
                )
                db.add(ex)
                db.flush()
            exam_map[sp["code"]] = ex

        db.commit()

        # 6. Seed Detailed Marks per Student (Isolated per Class and Section)
        # Class 1-A Marks
        # Aarav (High): Eng 46/50, Math 48/50, Sci 44/50
        # Ananya (Good): Eng 42/50, Math 40/50, Sci 38/50
        # Rohan (Average): Eng 32/50, Math 28/50, Sci 26/50
        # Pooja (Failed/Absent): Eng 18/50 (Fail), Math None (Absent), Sci 22/50
        marks_data = [
            # 1-A English
            ("EXM-1A-ENG", "STU-1A-01", Decimal("46"), False, "Distinction"),
            ("EXM-1A-ENG", "STU-1A-02", Decimal("42"), False, "Very Good"),
            ("EXM-1A-ENG", "STU-1A-03", Decimal("32"), False, "Passed"),
            ("EXM-1A-ENG", "STU-1A-04", Decimal("18"), False, "Failed - Needs practice in reading"),

            # 1-A Mathematics
            ("EXM-1A-MATH", "STU-1A-01", Decimal("48"), False, "Outstanding problem solving"),
            ("EXM-1A-MATH", "STU-1A-02", Decimal("40"), False, "Good effort"),
            ("EXM-1A-MATH", "STU-1A-03", Decimal("28"), False, "Passed"),
            ("EXM-1A-MATH", "STU-1A-04", Decimal("0"), True, "Medical leave on exam day"),

            # 1-A Science
            ("EXM-1A-SCI", "STU-1A-01", Decimal("44"), False, "Excellent practical grasp"),
            ("EXM-1A-SCI", "STU-1A-02", Decimal("38"), False, "Very good"),
            ("EXM-1A-SCI", "STU-1A-03", Decimal("26"), False, "Average"),
            ("EXM-1A-SCI", "STU-1A-04", Decimal("22"), False, "Passed boundary"),

            # 1-B Mathematics
            ("EXM-1B-MATH", "STU-1B-01", Decimal("45"), False, "Excellent"),
            ("EXM-1B-MATH", "STU-1B-02", Decimal("35"), False, "Good"),
            ("EXM-1B-MATH", "STU-1B-03", Decimal("15"), False, "Failed - retake needed"),

            # 1-B English
            ("EXM-1B-ENG", "STU-1B-01", Decimal("44"), False, "Fluent"),
            ("EXM-1B-ENG", "STU-1B-02", Decimal("38"), False, "Good"),
            ("EXM-1B-ENG", "STU-1B-03", Decimal("24"), False, "Passed"),

            # 5-A Mathematics (Total 100, Pass 40)
            ("EXM-5A-MATH", "STU-5A-01", Decimal("94"), False, "Exceptional arithmetic"),
            ("EXM-5A-MATH", "STU-5A-02", Decimal("86"), False, "Strong logical reasoning"),
            ("EXM-5A-MATH", "STU-5A-03", Decimal("68"), False, "Satisfactory"),
            ("EXM-5A-MATH", "STU-5A-04", Decimal("34"), False, "Failed - below 40% cutoff"),

            # 5-A Science (Total 100, Pass 40)
            ("EXM-5A-SCI", "STU-5A-01", Decimal("91"), False, "Outstanding in lab & theory"),
            ("EXM-5A-SCI", "STU-5A-02", Decimal("82"), False, "Very solid"),
            ("EXM-5A-SCI", "STU-5A-03", Decimal("72"), False, "Good concept clarity"),
            ("EXM-5A-SCI", "STU-5A-04", Decimal("0"), True, "Absent due to illness"),

            # 5-A English (Total 80, Pass 32)
            ("EXM-5A-ENG", "STU-5A-01", Decimal("74"), False, "Outstanding essay writing"),
            ("EXM-5A-ENG", "STU-5A-02", Decimal("68"), False, "Good vocabulary"),
            ("EXM-5A-ENG", "STU-5A-03", Decimal("54"), False, "Average grammar"),
            ("EXM-5A-ENG", "STU-5A-04", Decimal("38"), False, "Passed"),

            # 5-B Mathematics (Total 100, Pass 40) - DIFFERENT STUDENTS & SCORES FROM 5-A!
            ("EXM-5B-MATH", "STU-5B-01", Decimal("88"), False, "Great performance"),
            ("EXM-5B-MATH", "STU-5B-02", Decimal("76"), False, "Good"),
            ("EXM-5B-MATH", "STU-5B-03", Decimal("28"), False, "Failed in algebra"),

            # 5-B English (Total 80, Pass 32)
            ("EXM-5B-ENG", "STU-5B-01", Decimal("70"), False, "Very good"),
            ("EXM-5B-ENG", "STU-5B-02", Decimal("62"), False, "Good comprehension"),
            ("EXM-5B-ENG", "STU-5B-03", Decimal("45"), False, "Passed"),

            # Grade 10-A Chemistry
            ("EXM-10A-CHEM", "STU-9021", Decimal("92"), False, "Exemplary organic chemistry"),
            ("EXM-10A-CHEM", "STU-1004", Decimal("78"), False, "Good lab work"),
            ("EXM-10A-CHEM", "STU-1005", Decimal("85"), False, "Strong analytical skills"),

            # Grade 10-A Mathematics
            ("EXM-10A-MATH", "STU-9021", Decimal("95"), False, "Top ranker in calculus"),
            ("EXM-10A-MATH", "STU-1004", Decimal("81"), False, "Consistent effort"),
            ("EXM-10A-MATH", "STU-1005", Decimal("89"), False, "Excellent"),
        ]

        for ex_code, st_code, score, is_ab, rem in marks_data:
            ex = exam_map[ex_code]
            st = student_map[st_code]

            grade, pass_status, _ = calculate_grade_and_status(
                score=score,
                total=ex.total_marks,
                pass_mark=ex.passing_marks,
                is_absent=is_ab,
                db=db
            )

            existing = db.query(Mark).filter(
                Mark.examination_id == ex.id,
                Mark.student_id == st.id
            ).first()

            if not existing:
                mk = Mark(
                    examination_id=ex.id,
                    student_id=st.id,
                    marks_obtained=score,
                    is_absent=is_ab,
                    grade=grade,
                    status=pass_status,
                    remarks=rem,
                    updated_at=datetime.utcnow()
                )
                db.add(mk)
            else:
                existing.marks_obtained = score
                existing.is_absent = is_ab
                existing.grade = grade
                existing.status = pass_status
                existing.remarks = rem

        db.commit()
        print("[SUCCESS] All comprehensive sample exams, students, and marks seeded successfully!")

    finally:
        db.close()

if __name__ == "__main__":
    seed_comprehensive_exams()
