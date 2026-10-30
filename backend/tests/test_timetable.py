import pytest
from app.models.teacher import Teacher
from app.models.classroom import Classroom
from app.models.student import Student
from app.models.timetable import TimetablePeriod
from app.models.user import UserRole
from app.core.security import create_access_token

@pytest.fixture
def timetable_setup_data(db, create_test_user):
    # Admin
    admin_user = create_test_user("tt.admin@oakridge.edu", "AdminPass123!", "Timetable Admin", UserRole.ADMIN)

    # Teachers
    u_math = create_test_user("tt.math@oakridge.edu", "MathPass123!", "Teacher Euler", UserRole.TEACHER)
    t_math = Teacher(
        employee_id="TCH-EULER",
        name="Teacher Euler",
        email="tt.math@oakridge.edu",
        department="Mathematics",
        subject="Mathematics",
        user_id=u_math.id
    )
    db.add(t_math)

    u_eng = create_test_user("tt.eng@oakridge.edu", "EngPass123!", "Teacher Austen", UserRole.TEACHER)
    t_eng = Teacher(
        employee_id="TCH-AUSTEN",
        name="Teacher Austen",
        email="tt.eng@oakridge.edu",
        department="English",
        subject="English",
        user_id=u_eng.id
    )
    db.add(t_eng)

    u_sci = create_test_user("tt.sci@oakridge.edu", "SciPass123!", "Teacher Curie", UserRole.TEACHER)
    t_sci = Teacher(
        employee_id="TCH-CURIE",
        name="Teacher Curie",
        email="tt.sci@oakridge.edu",
        department="Science",
        subject="Science",
        user_id=u_sci.id
    )
    db.add(t_sci)

    # Classrooms: Class 6-A, Class 6-B, Class 7-A
    c_6a = Classroom(class_code="TEST-CLS-6A", name="Class 6", section="A", room="Room 101", capacity=30)
    c_6b = Classroom(class_code="TEST-CLS-6B", name="Class 6", section="B", room="Room 102", capacity=30)
    c_7a = Classroom(class_code="TEST-CLS-7A", name="Class 7", section="A", room="Room 201", capacity=30)
    db.add_all([c_6a, c_6b, c_7a])

    db.commit()
    db.refresh(t_math)
    db.refresh(t_eng)
    db.refresh(t_sci)
    db.refresh(c_6a)
    db.refresh(c_6b)
    db.refresh(c_7a)

    # Student enrolled in Class 6-A
    u_student = create_test_user("tt.student@oakridge.edu", "StudentPass123!", "Alice Student", UserRole.STUDENT)
    s1 = Student(
        student_id="STU-TT-01",
        admission_number="ADM-TT-01",
        roll_number="6A-01",
        name="Alice Student",
        email="tt.student@oakridge.edu",
        gender="Female",
        guardian_name="Bob Student",
        guardian_phone="+1 555-9988",
        class_id=c_6a.id,
        user_id=u_student.id,
        status="Active"
    )
    db.add(s1)

    # Seed separate timetables:
    # Class 6-A: Mathematics in Period 1
    # Class 6-B: English in Period 1
    # Class 7-A: Science in Period 1
    p_6a = TimetablePeriod(
        academic_year="2026-2027",
        class_id=c_6a.id,
        section="A",
        day_of_week="Monday",
        period_number=1,
        start_time="08:30",
        end_time="09:20",
        subject="Mathematics",
        teacher_id=t_math.id,
        room="Room 101"
    )
    p_6b = TimetablePeriod(
        academic_year="2026-2027",
        class_id=c_6b.id,
        section="B",
        day_of_week="Monday",
        period_number=1,
        start_time="08:30",
        end_time="09:20",
        subject="English",
        teacher_id=t_eng.id,
        room="Room 102"
    )
    p_7a = TimetablePeriod(
        academic_year="2026-2027",
        class_id=c_7a.id,
        section="A",
        day_of_week="Monday",
        period_number=1,
        start_time="08:30",
        end_time="09:20",
        subject="Science",
        teacher_id=t_sci.id,
        room="Room 201"
    )
    db.add_all([p_6a, p_6b, p_7a])
    db.commit()

    return {
        "admin_token": create_access_token({"sub": admin_user.email, "role": "admin"}),
        "teacher_token": create_access_token({"sub": u_math.email, "role": "teacher"}),
        "student_token": create_access_token({"sub": u_student.email, "role": "student"}),
        "c_6a": c_6a,
        "c_6b": c_6b,
        "c_7a": c_7a,
        "t_math": t_math,
        "t_eng": t_eng,
        "t_sci": t_sci,
        "p_6a": p_6a,
        "p_6b": p_6b,
        "p_7a": p_7a,
    }

def test_separate_timetables_by_class_and_section(client, timetable_setup_data):
    """
    Verifies requirement 1:
    - Every class/grade and section has its own independent timetable.
    - Class 6-A Period 1 is Mathematics.
    - Class 6-B Period 1 is English.
    - Class 7-A Period 1 is Science.
    """
    token = timetable_setup_data["admin_token"]
    headers = {"Authorization": f"Bearer {token}"}
    c_6a = timetable_setup_data["c_6a"]
    c_6b = timetable_setup_data["c_6b"]
    c_7a = timetable_setup_data["c_7a"]

    # 1. Class 6-A
    res_6a = client.get(f"/api/timetable?academic_year=2026-2027&class_id={c_6a.id}", headers=headers)
    assert res_6a.status_code == 200
    data_6a = res_6a.json()
    assert data_6a["class_name"] == "Class 6"
    assert data_6a["section"] == "A"
    monday_6a = data_6a["grid"]["Monday"]
    assert len(monday_6a) == 1
    assert monday_6a[0]["subject"] == "Mathematics"
    assert monday_6a[0]["teacher_name"] == "Teacher Euler"

    # 2. Class 6-B
    res_6b = client.get(f"/api/timetable?academic_year=2026-2027&class_id={c_6b.id}", headers=headers)
    assert res_6b.status_code == 200
    data_6b = res_6b.json()
    assert data_6b["class_name"] == "Class 6"
    assert data_6b["section"] == "B"
    monday_6b = data_6b["grid"]["Monday"]
    assert len(monday_6b) == 1
    assert monday_6b[0]["subject"] == "English"
    assert monday_6b[0]["teacher_name"] == "Teacher Austen"

    # 3. Class 7-A
    res_7a = client.get(f"/api/timetable?academic_year=2026-2027&class_id={c_7a.id}", headers=headers)
    assert res_7a.status_code == 200
    data_7a = res_7a.json()
    assert data_7a["class_name"] == "Class 7"
    assert data_7a["section"] == "A"
    monday_7a = data_7a["grid"]["Monday"]
    assert len(monday_7a) == 1
    assert monday_7a[0]["subject"] == "Science"
    assert monday_7a[0]["teacher_name"] == "Teacher Curie"

def test_admin_add_edit_delete_period_and_isolation(client, timetable_setup_data):
    """
    Verifies admin can add, edit, and delete periods, and edits affect ONLY the selected class.
    """
    token = timetable_setup_data["admin_token"]
    headers = {"Authorization": f"Bearer {token}"}
    c_6a = timetable_setup_data["c_6a"]
    c_6b = timetable_setup_data["c_6b"]
    t_math = timetable_setup_data["t_math"]

    # 1. Admin adds Period 2 to Class 6-A
    add_payload = {
        "academic_year": "2026-2027",
        "class_id": c_6a.id,
        "day_of_week": "Monday",
        "period_number": 2,
        "start_time": "09:25",
        "end_time": "10:15",
        "subject": "Algebra Workshop",
        "teacher_id": t_math.id,
        "room": "Room 101",
        "is_break": False
    }
    create_res = client.post("/api/timetable", json=add_payload, headers=headers)
    assert create_res.status_code == 201
    created_slot = create_res.json()
    assert created_slot["subject"] == "Algebra Workshop"
    slot_id = created_slot["id"]

    # Verify Class 6-A now has 2 periods on Monday
    res_6a = client.get(f"/api/timetable?academic_year=2026-2027&class_id={c_6a.id}", headers=headers)
    assert len(res_6a.json()["grid"]["Monday"]) == 2

    # Verify Class 6-B is completely unchanged (still only 1 period: English)
    res_6b = client.get(f"/api/timetable?academic_year=2026-2027&class_id={c_6b.id}", headers=headers)
    assert len(res_6b.json()["grid"]["Monday"]) == 1
    assert res_6b.json()["grid"]["Monday"][0]["subject"] == "English"

    # 2. Admin edits the period
    update_payload = {
        "subject": "Advanced Geometry",
        "room": "Room 105"
    }
    update_res = client.put(f"/api/timetable/{slot_id}", json=update_payload, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["subject"] == "Advanced Geometry"
    assert update_res.json()["room"] == "Room 105"

    # 3. Admin deletes the period
    del_res = client.delete(f"/api/timetable/{slot_id}", headers=headers)
    assert del_res.status_code == 200

    # Verify period was removed from Class 6-A
    res_6a_after = client.get(f"/api/timetable?academic_year=2026-2027&class_id={c_6a.id}", headers=headers)
    assert len(res_6a_after.json()["grid"]["Monday"]) == 1

def test_duplicate_period_and_time_validation(client, timetable_setup_data):
    """
    Verifies duplicate period prevention and end_time > start_time validation.
    """
    token = timetable_setup_data["admin_token"]
    headers = {"Authorization": f"Bearer {token}"}
    c_6a = timetable_setup_data["c_6a"]

    # Duplicate period 1 for Class 6-A on Monday
    dup_payload = {
        "academic_year": "2026-2027",
        "class_id": c_6a.id,
        "day_of_week": "Monday",
        "period_number": 1,
        "start_time": "08:30",
        "end_time": "09:20",
        "subject": "Physics"
    }
    dup_res = client.post("/api/timetable", json=dup_payload, headers=headers)
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["detail"]

    # Invalid time order: end_time before start_time
    inv_payload = {
        "academic_year": "2026-2027",
        "class_id": c_6a.id,
        "day_of_week": "Tuesday",
        "period_number": 2,
        "start_time": "10:30",
        "end_time": "09:30",
        "subject": "Art"
    }
    inv_res = client.post("/api/timetable", json=inv_payload, headers=headers)
    assert inv_res.status_code in [400, 422]

def test_teacher_and_student_role_views(client, timetable_setup_data):
    """
    Verifies:
    - Teacher view returns their assigned teaching periods.
    - Student view returns only their enrolled class timetable.
    - Student/Teacher cannot add periods (403 Forbidden).
    """
    teacher_token = timetable_setup_data["teacher_token"]
    student_token = timetable_setup_data["student_token"]
    c_6a = timetable_setup_data["c_6a"]

    # Teacher view
    t_res = client.get("/api/timetable/teacher?academic_year=2026-2027", headers={"Authorization": f"Bearer {teacher_token}"})
    assert t_res.status_code == 200
    t_data = t_res.json()
    assert t_data["teacher_name"] == "Teacher Euler"
    assert t_data["total_assigned_periods"] >= 1

    # Student view
    s_res = client.get("/api/timetable/student?academic_year=2026-2027", headers={"Authorization": f"Bearer {student_token}"})
    assert s_res.status_code == 200
    s_data = s_res.json()
    assert s_data["class_name"] == "Class 6"
    assert s_data["section"] == "A"
    assert s_data["grid"]["Monday"][0]["subject"] == "Mathematics"

    # Teacher or Student cannot create periods
    forbidden_payload = {
        "academic_year": "2026-2027",
        "class_id": c_6a.id,
        "day_of_week": "Friday",
        "period_number": 3,
        "start_time": "10:20",
        "end_time": "11:10",
        "subject": "Unauthorized"
    }
    res_teacher_post = client.post("/api/timetable", json=forbidden_payload, headers={"Authorization": f"Bearer {teacher_token}"})
    assert res_teacher_post.status_code == 403

    res_student_post = client.post("/api/timetable", json=forbidden_payload, headers={"Authorization": f"Bearer {student_token}"})
    assert res_student_post.status_code == 403
