from datetime import date
import pytest
from app.models.teacher import Teacher
from app.models.classroom import Classroom
from app.models.student import Student
from app.models.user import UserRole
from app.core.security import create_access_token

@pytest.fixture
def faculty_data(db, create_test_user):
    u1 = create_test_user("prof.smith@oakridge.edu", "SmithPass123!", "Prof. John Smith", UserRole.TEACHER)
    t1 = Teacher(
        employee_id="TCH-301",
        name="Prof. John Smith",
        email="prof.smith@oakridge.edu",
        department="Mathematics",
        subject="Algebra",
        qualification="M.Sc. Math",
        user_id=u1.id
    )
    db.add(t1)

    u2 = create_test_user("prof.jones@oakridge.edu", "JonesPass123!", "Prof. Sarah Jones", UserRole.TEACHER)
    t2 = Teacher(
        employee_id="TCH-302",
        name="Prof. Sarah Jones",
        email="prof.jones@oakridge.edu",
        department="Science",
        subject="Biology",
        qualification="Ph.D. Biology",
        user_id=u2.id
    )
    db.add(t2)

    c1 = Classroom(class_code="CLS-8A", name="Grade 8", section="A", room="Room 201", capacity=30)
    db.add(c1)

    s1 = Student(
        student_id="STU-801",
        admission_number="ADM-801",
        roll_number="8A-01",
        name="Tommy Green",
        email="tommy.g@oakridge.edu",
        gender="Male",
        guardian_name="Mary Green",
        guardian_phone="+1 555-1111",
        class_id=None,
        status="Active"
    )
    db.add(s1)

    db.commit()
    db.refresh(t1)
    db.refresh(t2)
    db.refresh(c1)
    db.refresh(s1)

    s1.class_id = c1.id
    db.commit()

    token_t1 = create_access_token(data={"sub": u1.email, "user_id": u1.id, "role": "teacher"})

    return {
        "t1": t1,
        "t2": t2,
        "c1": c1,
        "s1": s1,
        "teacher_headers": {"Authorization": f"Bearer {token_t1}"}
    }

def test_admin_record_and_upsert_teacher_attendance(client, admin_headers, faculty_data):
    t1 = faculty_data["t1"]
    test_date = str(date.today())

    # 1. Record Present
    res1 = client.post(
        "/api/teacher-attendance/",
        headers=admin_headers,
        json={
            "teacher_id": t1.id,
            "attendance_date": test_date,
            "status": "Present",
            "remarks": "On time"
        }
    )
    assert res1.status_code == 200
    rec1 = res1.json()
    assert rec1["status"] == "Present"
    assert rec1["teacher_id"] == t1.id

    # 2. Upsert (Save again on same date with Late status)
    res2 = client.post(
        "/api/teacher-attendance/",
        headers=admin_headers,
        json={
            "teacher_id": t1.id,
            "attendance_date": test_date,
            "status": "Late",
            "remarks": "Delayed by traffic"
        }
    )
    assert res2.status_code == 200
    rec2 = res2.json()
    assert rec2["id"] == rec1["id"]  # Same record ID updated!
    assert rec2["status"] == "Late"
    assert rec2["remarks"] == "Delayed by traffic"

    # Query list
    list_res = client.get(f"/api/teacher-attendance/?date={test_date}&teacher_id={t1.id}", headers=admin_headers)
    assert list_res.status_code == 200
    records = list_res.json()
    assert len(records) == 1
    assert records[0]["status"] == "Late"

def test_teacher_cannot_record_teacher_attendance(client, faculty_data):
    t1 = faculty_data["t1"]
    h = faculty_data["teacher_headers"]

    res = client.post(
        "/api/teacher-attendance/",
        headers=h,
        json={
            "teacher_id": t1.id,
            "attendance_date": str(date.today()),
            "status": "Present"
        }
    )
    assert res.status_code == 403

def test_student_cannot_access_teacher_attendance(client, student_headers):
    res = client.get("/api/teacher-attendance/", headers=student_headers)
    assert res.status_code == 403

def test_teacher_attendance_stats(client, admin_headers, faculty_data):
    t1 = faculty_data["t1"]
    t2 = faculty_data["t2"]
    test_date = "2026-11-01"

    # t1: Present, t2: Leave
    client.post(
        "/api/teacher-attendance/",
        headers=admin_headers,
        json={"teacher_id": t1.id, "attendance_date": test_date, "status": "Present"}
    )
    client.post(
        "/api/teacher-attendance/",
        headers=admin_headers,
        json={"teacher_id": t2.id, "attendance_date": test_date, "status": "Leave", "remarks": "Medical leave"}
    )

    res = client.get(f"/api/teacher-attendance/stats?date={test_date}", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["present"] == 1
    assert data["leave"] == 1
    assert data["attendance_rate"] == 50.0

def test_class_student_attendance_roster_and_leave_status(client, admin_headers, faculty_data):
    c1 = faculty_data["c1"]
    s1 = faculty_data["s1"]
    test_date = "2026-11-02"

    # Query dynamic roster before marking
    roster_res = client.get(f"/api/attendance/class-roster?class_id={c1.id}&date={test_date}", headers=admin_headers)
    assert roster_res.status_code == 200
    data = roster_res.json()
    assert data["class_id"] == c1.id
    assert data["total_enrolled"] == 1
    assert len(data["students"]) == 1
    assert data["students"][0]["student_id"] == s1.id
    assert data["students"][0]["admission_number"] == "ADM-801"

    # Mark attendance with Leave status
    bulk_res = client.post(
        "/api/attendance/bulk",
        headers=admin_headers,
        json={
            "class_id": c1.id,
            "date": test_date,
            "records": [{"student_id": s1.id, "status": "Leave", "remarks": "Authorized leave"}]
        }
    )
    assert bulk_res.status_code == 200
    assert bulk_res.json()["records_processed"] == 1

    # Query roster again to verify dynamic update
    roster_res2 = client.get(f"/api/attendance/class-roster?class_id={c1.id}&date={test_date}", headers=admin_headers)
    data2 = roster_res2.json()
    assert data2["students"][0]["status"] == "Leave"
    assert data2["summary"]["leave"] == 1

def test_mentor_reassignment_and_removal_preserves_records(client, admin_headers, faculty_data, db):
    t1 = faculty_data["t1"]
    t2 = faculty_data["t2"]
    c1 = faculty_data["c1"]

    # 1. Assign T1 to C1
    res1 = client.post(f"/api/assignments/classes/{c1.id}/mentor", headers=admin_headers, json={"teacher_id": t1.id})
    assert res1.status_code == 200
    assert res1.json()["mentor_id"] == t1.id

    # 2. Update/Replace with T2
    res2 = client.post(f"/api/assignments/classes/{c1.id}/mentor", headers=admin_headers, json={"teacher_id": t2.id})
    assert res2.status_code == 200
    assert res2.json()["mentor_id"] == t2.id

    # 3. Remove mentor
    res3 = client.delete(f"/api/assignments/classes/{c1.id}/mentor", headers=admin_headers)
    assert res3.status_code == 200
    assert res3.json()["mentor_id"] is None

    # 4. Verify teacher and student records still exist
    teacher_still_exists = db.query(Teacher).filter(Teacher.id == t1.id).first() is not None
    assert teacher_still_exists is True
    student_still_exists = db.query(Student).filter(Student.id == faculty_data["s1"].id).first() is not None
    assert student_still_exists is True

