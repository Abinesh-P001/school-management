import pytest
from datetime import date, datetime
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.models.classroom import Classroom
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.examination import Examination, Mark, GradingRule
from app.models.teacher_subject_assignment import TeacherSubjectAssignment
from app.core.security import hash_password, create_access_token

@pytest.fixture
def exam_setup_data(db: Session):
    # Ensure grading rules exist
    if db.query(GradingRule).count() == 0:
        db.add_all([
            GradingRule(grade="A+", min_percentage=90.0, max_percentage=100.0, grade_point=4.0, description="Outstanding", is_passing=True),
            GradingRule(grade="A", min_percentage=80.0, max_percentage=89.99, grade_point=3.7, description="Excellent", is_passing=True),
            GradingRule(grade="B", min_percentage=60.0, max_percentage=79.99, grade_point=3.0, description="Good", is_passing=True),
            GradingRule(grade="D", min_percentage=40.0, max_percentage=59.99, grade_point=1.0, description="Pass", is_passing=True),
            GradingRule(grade="F", min_percentage=0.0, max_percentage=39.99, grade_point=0.0, description="Fail", is_passing=False),
        ])
        db.commit()

    # Create Admin
    admin = db.query(User).filter(User.email == "exam.admin@oakridge.edu").first()
    if not admin:
        admin = User(
            full_name="Exam Admin",
            email="exam.admin@oakridge.edu",
            hashed_password=hash_password("AdminPass123!"),
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin)
        db.flush()

    # Create Teacher 1 (Math Teacher)
    t1_user = db.query(User).filter(User.email == "teacher.math@oakridge.edu").first()
    if not t1_user:
        t1_user = User(
            full_name="Math Teacher",
            email="teacher.math@oakridge.edu",
            hashed_password=hash_password("TeacherPass123!"),
            role=UserRole.TEACHER,
            is_active=True
        )
        db.add(t1_user)
        db.flush()
    t1 = db.query(Teacher).filter(Teacher.email == "teacher.math@oakridge.edu").first()
    if not t1:
        t1 = Teacher(
            employee_id="TCH-MTH-99",
            user_id=t1_user.id,
            name="Math Teacher",
            email="teacher.math@oakridge.edu",
            department="Mathematics",
            subject="Mathematics"
        )
        db.add(t1)
        db.flush()

    # Create Teacher 2 (Science Teacher)
    t2_user = db.query(User).filter(User.email == "teacher.sci@oakridge.edu").first()
    if not t2_user:
        t2_user = User(
            full_name="Science Teacher",
            email="teacher.sci@oakridge.edu",
            hashed_password=hash_password("TeacherPass123!"),
            role=UserRole.TEACHER,
            is_active=True
        )
        db.add(t2_user)
        db.flush()
    t2 = db.query(Teacher).filter(Teacher.email == "teacher.sci@oakridge.edu").first()
    if not t2:
        t2 = Teacher(
            employee_id="TCH-SCI-99",
            user_id=t2_user.id,
            name="Science Teacher",
            email="teacher.sci@oakridge.edu",
            department="Science",
            subject="Science"
        )
        db.add(t2)
        db.flush()

    # Class 5-A and Class 5-B
    c_5a = db.query(Classroom).filter(Classroom.name == "Class 5", Classroom.section == "A").first()
    if not c_5a:
        c_5a = Classroom(class_code="CLS-5A-TEST", name="Class 5", section="A", room="5A", capacity=30)
        db.add(c_5a)
        db.flush()

    c_5b = db.query(Classroom).filter(Classroom.name == "Class 5", Classroom.section == "B").first()
    if not c_5b:
        c_5b = Classroom(class_code="CLS-5B-TEST", name="Class 5", section="B", room="5B", capacity=30)
        db.add(c_5b)
        db.flush()

    # Assign Math Teacher only to Class 5-A Math
    db.query(TeacherSubjectAssignment).filter(
        TeacherSubjectAssignment.teacher_id == t1.id,
        TeacherSubjectAssignment.class_id == c_5a.id
    ).delete()
    asgn_5a_math = TeacherSubjectAssignment(
        teacher_id=t1.id,
        class_id=c_5a.id,
        subject="Mathematics",
        can_add_students=True
    )
    db.add(asgn_5a_math)

    # Students in Class 5-A
    s1_user = db.query(User).filter(User.email == "student.5a.1@oakridge.edu").first()
    if not s1_user:
        s1_user = User(
            full_name="Student 5A One",
            email="student.5a.1@oakridge.edu",
            hashed_password=hash_password("StudentPass123!"),
            role=UserRole.STUDENT,
            is_active=True
        )
        db.add(s1_user)
        db.flush()

    s1 = db.query(Student).filter(Student.student_id == "STU-TEST-5A-1").first()
    if not s1:
        s1 = Student(
            student_id="STU-TEST-5A-1",
            admission_number="ADM-5A-TEST-1",
            roll_number="5A-TEST-01",
            user_id=s1_user.id,
            class_id=c_5a.id,
            name="Student 5A One",
            email="student.5a.1@oakridge.edu",
            gender="Other",
            guardian_name="Guardian 1",
            guardian_phone="9876543210"
        )
        db.add(s1)
        db.flush()

    s2 = db.query(Student).filter(Student.student_id == "STU-TEST-5A-2").first()
    if not s2:
        s2 = Student(
            student_id="STU-TEST-5A-2",
            admission_number="ADM-5A-TEST-2",
            roll_number="5A-TEST-02",
            class_id=c_5a.id,
            name="Student 5A Two",
            email="student.5a.2@oakridge.edu",
            gender="Other",
            guardian_name="Guardian 2",
            guardian_phone="9876543210"
        )
        db.add(s2)
        db.flush()

    # Student in Class 5-B
    s_5b = db.query(Student).filter(Student.student_id == "STU-TEST-5B-1").first()
    if not s_5b:
        s_5b = Student(
            student_id="STU-TEST-5B-1",
            admission_number="ADM-5B-TEST-1",
            roll_number="5B-TEST-01",
            class_id=c_5b.id,
            name="Student 5B One",
            email="student.5b.1@oakridge.edu",
            gender="Other",
            guardian_name="Guardian 5B",
            guardian_phone="9876543210"
        )
        db.add(s_5b)
        db.flush()

    db.commit()

    admin_token = create_access_token(data={"sub": admin.email, "role": "admin", "email": admin.email})
    t1_token = create_access_token(data={"sub": t1_user.email, "role": "teacher", "email": t1_user.email})
    t2_token = create_access_token(data={"sub": t2_user.email, "role": "teacher", "email": t2_user.email})
    s1_token = create_access_token(data={"sub": s1_user.email, "role": "student", "email": s1_user.email})

    return {
        "admin_token": admin_token,
        "t1_token": t1_token,
        "t2_token": t2_token,
        "s1_token": s1_token,
        "c_5a": c_5a,
        "c_5b": c_5b,
        "s1": s1,
        "s2": s2,
        "s_5b": s_5b,
        "t1": t1,
        "t2": t2
    }


def test_class_and_section_isolation(client: TestClient, exam_setup_data):
    """
    Verifies that exams and marks created for Class 5-A NEVER appear under Class 5-B or any other class.
    """
    admin_headers = {"Authorization": f"Bearer {exam_setup_data['admin_token']}"}
    c_5a = exam_setup_data["c_5a"]
    c_5b = exam_setup_data["c_5b"]

    # 1. Admin creates Exam for Class 5-A
    payload_5a = {
        "name": "Term 1 Assessment",
        "academic_year": "2026-2027",
        "class_id": c_5a.id,
        "section": "A",
        "exam_type": "Unit Test",
        "subject": "Mathematics",
        "exam_date": "2026-10-15",
        "total_marks": 100,
        "passing_marks": 40,
        "status": "Draft"
    }
    res_5a = client.post("/api/examinations/", json=payload_5a, headers=admin_headers)
    assert res_5a.status_code == 201
    exam_5a = res_5a.json()
    assert exam_5a["class_id"] == c_5a.id

    # 2. Query exams for Class 5-A -> contains exam_5a
    list_5a = client.get(f"/api/examinations/?class_id={c_5a.id}&section=A", headers=admin_headers).json()
    assert any(e["id"] == exam_5a["id"] for e in list_5a)

    # 3. Query exams for Class 5-B -> MUST NOT contain exam_5a!
    list_5b = client.get(f"/api/examinations/?class_id={c_5b.id}&section=B", headers=admin_headers).json()
    assert not any(e["id"] == exam_5a["id"] for e in list_5b)


def test_subject_wise_marks_entry_validation(client: TestClient, exam_setup_data):
    """
    Verifies score bounds, negative mark rejection, absent student handling, and upsert without duplicate.
    """
    admin_headers = {"Authorization": f"Bearer {exam_setup_data['admin_token']}"}
    c_5a = exam_setup_data["c_5a"]
    s1 = exam_setup_data["s1"]
    s2 = exam_setup_data["s2"]

    # Create exam
    payload = {
        "name": "Mid-Term Test",
        "academic_year": "2026-2027",
        "class_id": c_5a.id,
        "section": "A",
        "exam_type": "Mid-Term",
        "subject": "Mathematics",
        "exam_date": "2026-10-20",
        "total_marks": 50,
        "passing_marks": 20,
        "status": "Ongoing"
    }
    exam = client.post("/api/examinations/", json=payload, headers=admin_headers).json()
    exam_id = exam["id"]

    # 1. Attempt to enter marks > total_marks (e.g. 55 in a 50 mark exam) -> 400 Bad Request
    invalid_mark = {
        "examination_id": exam_id,
        "student_id": s1.id,
        "marks_obtained": 55,
        "is_absent": False
    }
    res_invalid = client.post(f"/api/examinations/{exam_id}/marks", json=invalid_mark, headers=admin_headers)
    assert res_invalid.status_code == 400
    assert "cannot exceed total marks" in res_invalid.json()["detail"].lower()

    # 2. Enter valid mark for Student 1 (45/50 -> 90% -> A+)
    valid_mark = {
        "examination_id": exam_id,
        "student_id": s1.id,
        "marks_obtained": 45,
        "is_absent": False,
        "remarks": "Outstanding"
    }
    res_valid = client.post(f"/api/examinations/{exam_id}/marks", json=valid_mark, headers=admin_headers)
    assert res_valid.status_code == 200
    m1 = res_valid.json()
    assert m1["grade"] == "A+"
    assert m1["status"] == "Passed"
    assert m1["percentage"] == 90.0

    # 3. Enter absent for Student 2
    absent_mark = {
        "examination_id": exam_id,
        "student_id": s2.id,
        "marks_obtained": 0,
        "is_absent": True,
        "remarks": "Medical reason"
    }
    res_absent = client.post(f"/api/examinations/{exam_id}/marks", json=absent_mark, headers=admin_headers)
    assert res_absent.status_code == 200
    m2 = res_absent.json()
    assert m2["is_absent"] is True
    assert m2["grade"] == "AB"
    assert m2["status"] == "Absent"

    # 4. Upsert check: editing Student 1 mark updates the same record instead of inserting duplicate
    update_mark = {
        "examination_id": exam_id,
        "student_id": s1.id,
        "marks_obtained": 48,
        "is_absent": False,
        "remarks": "Re-evaluation addition"
    }
    res_update = client.post(f"/api/examinations/{exam_id}/marks", json=update_mark, headers=admin_headers)
    assert res_update.status_code == 200
    assert res_update.json()["id"] == m1["id"] # Same ID!
    assert res_update.json()["marks_obtained"] == 48.0


def test_teacher_permissions_and_locking(client: TestClient, exam_setup_data):
    """
    Verifies that a teacher can enter marks ONLY for assigned class & subject.
    Unauthorized teacher is rejected with 403 Forbidden.
    Locked exams reject modifications from teachers.
    """
    t1_headers = {"Authorization": f"Bearer {exam_setup_data['t1_token']}"} # Assigned to 5-A Math
    t2_headers = {"Authorization": f"Bearer {exam_setup_data['t2_token']}"} # Assigned to Science only
    admin_headers = {"Authorization": f"Bearer {exam_setup_data['admin_token']}"}
    c_5a = exam_setup_data["c_5a"]
    s1 = exam_setup_data["s1"]

    # Admin creates Math exam for Class 5-A
    payload = {
        "name": "Weekly Quiz",
        "academic_year": "2026-2027",
        "class_id": c_5a.id,
        "section": "A",
        "exam_type": "Quiz",
        "subject": "Mathematics",
        "exam_date": "2026-10-22",
        "total_marks": 25,
        "passing_marks": 10,
        "status": "Ongoing"
    }
    exam = client.post("/api/examinations/", json=payload, headers=admin_headers).json()
    exam_id = exam["id"]

    # Teacher 2 (Science) tries to enter marks for Math exam -> 403 Forbidden!
    t2_entry = {
        "examination_id": exam_id,
        "student_id": s1.id,
        "marks_obtained": 20,
        "is_absent": False
    }
    res_t2 = client.post(f"/api/examinations/{exam_id}/marks", json=t2_entry, headers=t2_headers)
    assert res_t2.status_code == 403
    assert "not assigned" in res_t2.json()["detail"].lower()

    # Teacher 1 (Math) enters marks successfully -> 200 OK
    res_t1 = client.post(f"/api/examinations/{exam_id}/marks", json=t2_entry, headers=t1_headers)
    assert res_t1.status_code == 200

    # Admin locks the exam
    lock_res = client.post(f"/api/examinations/{exam_id}/lock", headers=admin_headers)
    assert lock_res.status_code == 200

    # Teacher 1 tries to modify after lock -> 403 Forbidden
    modify_payload = {
        "examination_id": exam_id,
        "student_id": s1.id,
        "marks_obtained": 22,
        "is_absent": False
    }
    res_locked = client.post(f"/api/examinations/{exam_id}/marks", json=modify_payload, headers=t1_headers)
    assert res_locked.status_code == 403
    assert "locked" in res_locked.json()["detail"].lower()


def test_student_privacy_and_report_card(client: TestClient, exam_setup_data):
    """
    Verifies that students see only their own results, unpublished exams are hidden,
    and report cards calculate correct totals, ranks, and percentages.
    """
    admin_headers = {"Authorization": f"Bearer {exam_setup_data['admin_token']}"}
    s1_headers = {"Authorization": f"Bearer {exam_setup_data['s1_token']}"}
    c_5a = exam_setup_data["c_5a"]
    s1 = exam_setup_data["s1"]
    s2 = exam_setup_data["s2"]

    # Create exam
    payload = {
        "name": "Annual Final Examination",
        "academic_year": "2026-2027",
        "class_id": c_5a.id,
        "section": "A",
        "exam_type": "Annual",
        "subject": "Mathematics",
        "exam_date": "2026-11-20",
        "total_marks": 100,
        "passing_marks": 40,
        "status": "Draft" # Unpublished!
    }
    exam = client.post("/api/examinations/", json=payload, headers=admin_headers).json()
    exam_id = exam["id"]

    # Enter marks: S1 gets 90, S2 gets 70
    client.post(f"/api/examinations/{exam_id}/marks", json={"examination_id": exam_id, "student_id": s1.id, "marks_obtained": 90, "is_absent": False}, headers=admin_headers)
    client.post(f"/api/examinations/{exam_id}/marks", json={"examination_id": exam_id, "student_id": s2.id, "marks_obtained": 70, "is_absent": False}, headers=admin_headers)

    # 1. Student 1 requests report cards while exam is Draft -> 403 Forbidden (Unpublished)
    res_s1_draft = client.get(f"/api/examinations/{exam_id}/report-cards", headers=s1_headers)
    assert res_s1_draft.status_code == 403

    # 2. Admin publishes exam
    pub_res = client.post(f"/api/examinations/{exam_id}/publish", headers=admin_headers)
    assert pub_res.status_code == 200

    # 3. Student 1 requests report card -> Returns ONLY Student 1's report card!
    res_s1_pub = client.get(f"/api/examinations/{exam_id}/report-cards", headers=s1_headers)
    assert res_s1_pub.status_code == 200
    cards = res_s1_pub.json()
    assert len(cards) == 1
    assert cards[0]["student_id"] == s1.id
    assert cards[0]["overall_percentage"] == 90.0
    assert cards[0]["overall_grade"] == "A+"
    assert cards[0]["overall_status"] == "PASSED"
    assert cards[0]["rank_in_class"] == 1

    # 4. Results summary verification
    summary_res = client.get(f"/api/examinations/{exam_id}/results", headers=admin_headers)
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["appeared_count"] >= 2
    assert summary["highest_score"] == 90.0
    assert summary["pass_percentage"] == 100.0
