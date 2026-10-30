import pytest
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.classroom import Classroom
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.attendance import Attendance
from app.models.examination import Examination
from app.models.timetable import TimetablePeriod
from app.models.announcement import Announcement
from app.models.fee import FeeInvoice
from app.models.user import User, UserRole
from app.core.security import create_access_token


@pytest.fixture
def rbac_setup(db: Session, create_test_user):
    # Admin
    admin_u = create_test_user("admin.rbac@oakridge.edu", "Admin123!", "Admin Principal", UserRole.ADMIN)
    admin_h = {"Authorization": f"Bearer {create_access_token(data={'sub': admin_u.email, 'user_id': admin_u.id, 'role': 'admin'})}"}

    # Teacher A (mentor of Class 10-A)
    t_a_u = create_test_user("teacher.a@oakridge.edu", "TeacherA123!", "Teacher Alpha", UserRole.TEACHER)
    t_a = Teacher(
        employee_id="TCH-ALPHA-01",
        name="Teacher Alpha",
        email=t_a_u.email,
        department="Science",
        subject="Physics",
        user_id=t_a_u.id,
        status="Active"
    )
    db.add(t_a)
    db.commit()
    db.refresh(t_a)
    t_a_h = {"Authorization": f"Bearer {create_access_token(data={'sub': t_a_u.email, 'user_id': t_a_u.id, 'role': 'teacher'})}"}

    # Teacher B (mentor of Class 10-B)
    t_b_u = create_test_user("teacher.b@oakridge.edu", "TeacherB123!", "Teacher Beta", UserRole.TEACHER)
    t_b = Teacher(
        employee_id="TCH-BETA-02",
        name="Teacher Beta",
        email=t_b_u.email,
        department="Math",
        subject="Calculus",
        user_id=t_b_u.id,
        status="Active"
    )
    db.add(t_b)
    db.commit()
    db.refresh(t_b)
    t_b_h = {"Authorization": f"Bearer {create_access_token(data={'sub': t_b_u.email, 'user_id': t_b_u.id, 'role': 'teacher'})}"}

    # Classroom A (Teacher A is mentor)
    class_a = Classroom(
        class_code="CLS-10A",
        name="Grade 10",
        section="A",
        room="Room 101",
        class_teacher_id=t_a.id
    )
    db.add(class_a)

    # Classroom B (Teacher B is mentor)
    class_b = Classroom(
        class_code="CLS-10B",
        name="Grade 10",
        section="B",
        room="Room 102",
        class_teacher_id=t_b.id
    )
    db.add(class_b)
    db.commit()
    db.refresh(class_a)
    db.refresh(class_b)

    # Student in Class A
    stu_a_u = create_test_user("alice.stu@oakridge.edu", "StudentA123!", "Alice Johnson", UserRole.STUDENT)
    stu_a = Student(
        student_id="STU-1001",
        admission_number="ADM-1001",
        roll_number="10A-01",
        name="Alice Johnson",
        email=stu_a_u.email,
        gender="Female",
        guardian_name="Bob Johnson",
        guardian_phone="+1 555-1001",
        class_id=class_a.id,
        admission_date=date(2026, 1, 10),
        status="Active",
        fees_status="Paid",
        user_id=stu_a_u.id
    )
    db.add(stu_a)

    # Student in Class B
    stu_b_u = create_test_user("charlie.stu@oakridge.edu", "StudentB123!", "Charlie Smith", UserRole.STUDENT)
    stu_b = Student(
        student_id="STU-1002",
        admission_number="ADM-1002",
        roll_number="10B-01",
        name="Charlie Smith",
        email=stu_b_u.email,
        gender="Male",
        guardian_name="David Smith",
        guardian_phone="+1 555-1002",
        class_id=class_b.id,
        admission_date=date(2026, 1, 10),
        status="Active",
        fees_status="Paid",
        user_id=stu_b_u.id
    )
    db.add(stu_b)
    db.commit()
    db.refresh(stu_a)
    db.refresh(stu_b)

    stu_a_h = {"Authorization": f"Bearer {create_access_token(data={'sub': stu_a_u.email, 'user_id': stu_a_u.id, 'role': 'student'})}"}

    return {
        "admin_u": admin_u, "admin_h": admin_h,
        "t_a": t_a, "t_a_u": t_a_u, "t_a_h": t_a_h,
        "t_b": t_b, "t_b_u": t_b_u, "t_b_h": t_b_h,
        "class_a": class_a, "class_b": class_b,
        "stu_a": stu_a, "stu_b": stu_b,
        "stu_a_h": stu_a_h
    }


# ==============================================================================
# 1. STUDENTS RBAC TESTS
# ==============================================================================

def test_teacher_a_can_update_own_class_student(client: TestClient, rbac_setup):
    stu_a = rbac_setup["stu_a"]
    headers = rbac_setup["t_a_h"]

    payload = {"guardian_phone": "+1 555-999-8888"}
    res = client.put(f"/api/students/{stu_a.id}", json=payload, headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["guardian_phone"] == "+1 555-999-8888"


def test_teacher_a_forbidden_from_updating_other_class_student(client: TestClient, rbac_setup):
    stu_b = rbac_setup["stu_b"]
    headers = rbac_setup["t_a_h"]

    payload = {"guardian_phone": "+1 555-000-0000"}
    res = client.put(f"/api/students/{stu_b.id}", json=payload, headers=headers)
    assert res.status_code == 403
    assert "not authorized to edit students outside your assigned classes" in res.json()["detail"]


def test_teacher_cannot_alter_student_fees_status(client: TestClient, rbac_setup):
    stu_a = rbac_setup["stu_a"]
    headers = rbac_setup["t_a_h"]

    payload = {"fees_status": "Overdue"}
    res = client.put(f"/api/students/{stu_a.id}", json=payload, headers=headers)
    assert res.status_code == 403
    assert "Faculty members are not authorized to modify student fee statuses" in res.json()["detail"]


def test_admin_can_update_any_student(client: TestClient, rbac_setup):
    stu_b = rbac_setup["stu_b"]
    headers = rbac_setup["admin_h"]

    payload = {"guardian_phone": "+1 555-777-6666"}
    res = client.put(f"/api/students/{stu_b.id}", json=payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["guardian_phone"] == "+1 555-777-6666"


# ==============================================================================
# 2. ATTENDANCE RBAC TESTS
# ==============================================================================

def test_teacher_a_can_mark_attendance_for_own_class(client: TestClient, rbac_setup):
    class_a = rbac_setup["class_a"]
    stu_a = rbac_setup["stu_a"]
    headers = rbac_setup["t_a_h"]

    payload = {
        "class_id": class_a.id,
        "date": "2026-10-29",
        "records": [
            {"student_id": stu_a.id, "status": "Present", "remarks": "On time"}
        ]
    }
    res = client.post("/api/attendance/bulk", json=payload, headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["success"] is True


def test_teacher_a_forbidden_from_marking_other_class_attendance(client: TestClient, rbac_setup):
    class_b = rbac_setup["class_b"]
    stu_b = rbac_setup["stu_b"]
    headers = rbac_setup["t_a_h"]

    payload = {
        "class_id": class_b.id,
        "date": "2026-10-29",
        "records": [
            {"student_id": stu_b.id, "status": "Present", "remarks": "Unauthorized test"}
        ]
    }
    res = client.post("/api/attendance/bulk", json=payload, headers=headers)
    assert res.status_code == 403
    assert "not authorized to mark attendance for class" in res.json()["detail"]


def test_teacher_a_forbidden_from_updating_other_class_attendance_record(client: TestClient, db: Session, rbac_setup):
    class_b = rbac_setup["class_b"]
    stu_b = rbac_setup["stu_b"]
    headers = rbac_setup["t_a_h"]

    att_record = Attendance(
        student_id=stu_b.id,
        class_id=class_b.id,
        date=date(2026, 10, 29),
        status="Present",
        remarks="Initial"
    )
    db.add(att_record)
    db.commit()
    db.refresh(att_record)

    res = client.put(f"/api/attendance/{att_record.id}", json={"status": "Absent", "remarks": "Tampered"}, headers=headers)
    assert res.status_code == 403
    assert "not authorized to update attendance for this class" in res.json()["detail"]


# ==============================================================================
# 3. EXAMINATIONS & MARKS RBAC TESTS
# ==============================================================================

def test_teacher_a_can_create_exam_for_assigned_class(client: TestClient, rbac_setup):
    class_a = rbac_setup["class_a"]
    headers = rbac_setup["t_a_h"]

    payload = {
        "name": "Mid-Term Physics",
        "academic_year": "2026-2027",
        "class_id": class_a.id,
        "section": "A",
        "exam_type": "Mid-Term",
        "subject": "Physics",
        "exam_date": "2026-11-15",
        "total_marks": 100,
        "passing_marks": 40
    }
    res = client.post("/api/examinations/", json=payload, headers=headers)
    assert res.status_code == 201, res.text
    assert res.json()["name"] == "Mid-Term Physics"


def test_teacher_a_forbidden_from_creating_exam_for_unassigned_class(client: TestClient, rbac_setup):
    class_b = rbac_setup["class_b"]
    headers = rbac_setup["t_a_h"]

    payload = {
        "name": "Mid-Term Physics",
        "academic_year": "2026-2027",
        "class_id": class_b.id,
        "section": "B",
        "exam_type": "Mid-Term",
        "subject": "Physics",
        "exam_date": "2026-11-15",
        "total_marks": 100,
        "passing_marks": 40
    }
    res = client.post("/api/examinations/", json=payload, headers=headers)
    assert res.status_code == 403
    assert "not assigned to teach" in res.json()["detail"]


# ==============================================================================
# 4. TIMETABLE RBAC TESTS
# ==============================================================================

def test_teacher_a_can_manage_timetable_for_own_class(client: TestClient, rbac_setup):
    class_a = rbac_setup["class_a"]
    t_a = rbac_setup["t_a"]
    headers = rbac_setup["t_a_h"]

    payload = {
        "academic_year": "2026-2027",
        "class_id": class_a.id,
        "section": "A",
        "day_of_week": "Monday",
        "period_number": 1,
        "start_time": "08:30",
        "end_time": "09:15",
        "subject": "Physics",
        "teacher_id": t_a.id,
        "room": "Room 101",
        "is_break": False
    }
    res = client.post("/api/timetable/", json=payload, headers=headers)
    assert res.status_code == 201, res.text
    slot_id = res.json()["id"]

    # Teacher A updates it
    up_res = client.put(f"/api/timetable/{slot_id}", json={"room": "Lab 1"}, headers=headers)
    assert up_res.status_code == 200
    assert up_res.json()["room"] == "Lab 1"


def test_teacher_a_forbidden_from_managing_timetable_for_unassigned_class(client: TestClient, rbac_setup):
    class_b = rbac_setup["class_b"]
    t_b = rbac_setup["t_b"]
    headers = rbac_setup["t_a_h"]

    payload = {
        "academic_year": "2026-2027",
        "class_id": class_b.id,
        "section": "B",
        "day_of_week": "Monday",
        "period_number": 1,
        "start_time": "08:30",
        "end_time": "09:15",
        "subject": "Calculus",
        "teacher_id": t_b.id,
        "room": "Room 102",
        "is_break": False
    }
    res = client.post("/api/timetable/", json=payload, headers=headers)
    assert res.status_code == 403
    assert "not have permission to manage the timetable" in res.json()["detail"]


# ==============================================================================
# 5. ANNOUNCEMENTS RBAC TESTS
# ==============================================================================

def test_teacher_forbidden_from_creating_global_announcement(client: TestClient, rbac_setup):
    headers = rbac_setup["t_a_h"]
    payload = {
        "title": "School Closure Notice",
        "content": "School will be closed tomorrow.",
        "category": "General",
        "priority": "High",
        "target_audience": "ALL"
    }
    res = client.post("/api/announcements", json=payload, headers=headers)
    assert res.status_code == 403
    assert "only permitted to post announcements targeted to their assigned classes" in res.json()["detail"]


def test_teacher_can_create_announcement_for_assigned_class(client: TestClient, rbac_setup):
    class_a = rbac_setup["class_a"]
    headers = rbac_setup["t_a_h"]

    payload = {
        "title": "Physics Quiz Notice",
        "content": "Physics Quiz on Chapter 4 next Monday.",
        "category": "Academic",
        "priority": "Medium",
        "target_audience": "PARENTS_CLASS",
        "target_class_id": class_a.id,
        "target_section": "A"
    }
    res = client.post("/api/announcements", json=payload, headers=headers)
    assert res.status_code == 201, res.text
    ann_id = res.json()["id"]

    # Teacher A can update own announcement
    up_res = client.put(f"/api/announcements/{ann_id}", json={"title": "Updated Physics Quiz"}, headers=headers)
    assert up_res.status_code == 200

    # Teacher B cannot update Teacher A's announcement
    b_res = client.put(f"/api/announcements/{ann_id}", json={"title": "Hacked Notice"}, headers=rbac_setup["t_b_h"])
    assert b_res.status_code == 403
    assert "only modify announcements created by yourself" in b_res.json()["detail"]


# ==============================================================================
# 6. CONFIDENTIAL FINANCIAL & ADMINISTRATIVE RESTRICTIONS FOR TEACHERS
# ==============================================================================

def test_teacher_forbidden_from_viewing_confidential_fees_ledger(client: TestClient, db: Session, rbac_setup):
    stu_a = rbac_setup["stu_a"]
    headers = rbac_setup["t_a_h"]

    fee_inv = FeeInvoice(
        invoice_number="INV-2026-TEST",
        student_id=stu_a.id,
        fee_type="Tuition",
        amount=1500.0,
        due_date=date(2026, 11, 1),
        status="Pending"
    )
    db.add(fee_inv)
    db.commit()

    # Teacher attempts to read /fees/
    res = client.get("/api/fees/", headers=headers)
    assert res.status_code == 403
    assert "Faculty members are not authorized to access confidential school financial records" in res.json()["detail"]

    # Teacher attempts to read /fees/summary
    res_summary = client.get("/api/fees/summary", headers=headers)
    assert res_summary.status_code == 403


def test_teacher_forbidden_from_accessing_admin_routes(client: TestClient, rbac_setup):
    headers = rbac_setup["t_a_h"]
    res = client.get("/api/admin/users", headers=headers)
    assert res.status_code == 403


def test_student_forbidden_from_teacher_and_admin_actions(client: TestClient, rbac_setup):
    stu_headers = rbac_setup["stu_a_h"]
    class_a = rbac_setup["class_a"]
    stu_a = rbac_setup["stu_a"]

    # Student attempts to edit student
    res = client.put(f"/api/students/{stu_a.id}", json={"guardian_phone": "+1 999"}, headers=stu_headers)
    assert res.status_code == 403

    # Student attempts to post attendance
    res = client.post("/api/attendance/bulk", json={"class_id": class_a.id, "date": "2026-10-29", "records": []}, headers=stu_headers)
    assert res.status_code == 403

    # Student attempts to create exam
    res = client.post("/api/examinations/", json={"name": "Fake Exam", "class_id": class_a.id, "total_marks": 100, "passing_marks": 40}, headers=stu_headers)
    assert res.status_code == 403

