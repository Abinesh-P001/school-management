import pytest
from app.models.classroom import Classroom
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.user import User, UserRole
from app.core.security import create_access_token

@pytest.fixture
def sample_faculty_and_classes(db, create_test_user):
    # Teacher 1
    u1 = create_test_user("t1@oakridge.edu", "Pass123!", "Alice Walker", UserRole.TEACHER)
    t1 = Teacher(
        employee_id="TCH-001",
        name="Alice Walker",
        email="t1@oakridge.edu",
        department="Mathematics",
        subject="Mathematics",
        qualification="M.Sc. Mathematics",
        user_id=u1.id
    )
    db.add(t1)

    # Teacher 2
    u2 = create_test_user("t2@oakridge.edu", "Pass123!", "Bob Vance", UserRole.TEACHER)
    t2 = Teacher(
        employee_id="TCH-002",
        name="Bob Vance",
        email="t2@oakridge.edu",
        department="Physics",
        subject="Physics",
        qualification="Ph.D. Physics",
        user_id=u2.id
    )
    db.add(t2)

    # Teacher 3 (unrelated)
    u3 = create_test_user("t3@oakridge.edu", "Pass123!", "Charlie Cox", UserRole.TEACHER)
    t3 = Teacher(
        employee_id="TCH-003",
        name="Charlie Cox",
        email="t3@oakridge.edu",
        department="History",
        subject="History",
        qualification="M.A. History",
        user_id=u3.id
    )
    db.add(t3)

    # Class 1: Grade 10-A
    c1 = Classroom(class_code="CLS-10A", name="Grade 10", section="A", room="Room 101", capacity=35)
    db.add(c1)

    # Class 2: Grade 10-B
    c2 = Classroom(class_code="CLS-10B", name="Grade 10", section="B", room="Room 102", capacity=35)
    db.add(c2)

    db.commit()
    db.refresh(t1)
    db.refresh(t2)
    db.refresh(t3)
    db.refresh(c1)
    db.refresh(c2)

    token_t1 = create_access_token(data={"sub": u1.email, "user_id": u1.id, "role": "teacher"})
    token_t2 = create_access_token(data={"sub": u2.email, "user_id": u2.id, "role": "teacher"})
    token_t3 = create_access_token(data={"sub": u3.email, "user_id": u3.id, "role": "teacher"})

    return {
        "t1": t1, "t2": t2, "t3": t3,
        "c1": c1, "c2": c2,
        "h1": {"Authorization": f"Bearer {token_t1}"},
        "h2": {"Authorization": f"Bearer {token_t2}"},
        "h3": {"Authorization": f"Bearer {token_t3}"}
    }

def test_admin_can_assign_mentor_and_enforces_single_mentorship(client, admin_headers, sample_faculty_and_classes):
    t1 = sample_faculty_and_classes["t1"]
    c1 = sample_faculty_and_classes["c1"]
    c2 = sample_faculty_and_classes["c2"]

    # 1. Assign T1 to Class 1
    res = client.post(
        f"/api/assignments/classes/{c1.id}/mentor",
        headers=admin_headers,
        json={"teacher_id": t1.id}
    )
    assert res.status_code == 200
    assert res.json()["mentor_id"] == t1.id

    # 2. Now assign T1 to Class 2; T1 must be automatically cleared from Class 1
    res2 = client.post(
        f"/api/assignments/classes/{c2.id}/mentor",
        headers=admin_headers,
        json={"teacher_id": t1.id}
    )
    assert res2.status_code == 200
    assert res2.json()["mentor_id"] == t1.id

    # Verify Class 1 mentor is now None
    mentors_list = client.get("/api/assignments/classes/mentors", headers=admin_headers).json()
    c1_record = next(c for c in mentors_list if c["class_id"] == c1.id)
    c2_record = next(c for c in mentors_list if c["class_id"] == c2.id)
    assert c1_record["mentor_id"] is None
    assert c2_record["mentor_id"] == t1.id

def test_non_admin_cannot_assign_mentor(client, sample_faculty_and_classes, student_headers):
    t1 = sample_faculty_and_classes["t1"]
    c1 = sample_faculty_and_classes["c1"]
    h1 = sample_faculty_and_classes["h1"]

    res_t = client.post(f"/api/assignments/classes/{c1.id}/mentor", headers=h1, json={"teacher_id": t1.id})
    assert res_t.status_code == 403

    res_s = client.post(f"/api/assignments/classes/{c1.id}/mentor", headers=student_headers, json={"teacher_id": t1.id})
    assert res_s.status_code == 403

def test_subject_teaching_assignments_and_duplicate_prevention(client, admin_headers, sample_faculty_and_classes):
    t1 = sample_faculty_and_classes["t1"]
    c1 = sample_faculty_and_classes["c1"]

    # Assign T1 to teach Calculus in Class 1 with can_add_students=True
    res = client.post(
        "/api/assignments/subjects",
        headers=admin_headers,
        json={
            "teacher_id": t1.id,
            "class_id": c1.id,
            "subject": "Calculus",
            "can_add_students": True
        }
    )
    assert res.status_code == 201
    assert res.json()["can_add_students"] is True
    assert res.json()["subject"] == "Calculus"

    # Try duplicate assignment of same subject to same teacher in same class
    res_dup = client.post(
        "/api/assignments/subjects",
        headers=admin_headers,
        json={
            "teacher_id": t1.id,
            "class_id": c1.id,
            "subject": "Calculus",
            "can_add_students": False
        }
    )
    assert res_dup.status_code == 400
    assert "already assigned" in res_dup.json()["detail"].lower()

def test_my_assignments_returns_mentorship_and_teaching(client, admin_headers, sample_faculty_and_classes):
    t1 = sample_faculty_and_classes["t1"]
    c1 = sample_faculty_and_classes["c1"]
    c2 = sample_faculty_and_classes["c2"]
    h1 = sample_faculty_and_classes["h1"]

    # Assign T1 as mentor of Class 1
    client.post(f"/api/assignments/classes/{c1.id}/mentor", headers=admin_headers, json={"teacher_id": t1.id})

    # Assign T1 as subject teacher for Class 2 with can_add_students=True
    client.post(
        "/api/assignments/subjects",
        headers=admin_headers,
        json={"teacher_id": t1.id, "class_id": c2.id, "subject": "Algebra", "can_add_students": True}
    )

    res = client.get("/api/assignments/my-assignments", headers=h1)
    assert res.status_code == 200
    data = res.json()
    assert data["mentorship_class"] is not None
    assert data["mentorship_class"]["class_id"] == c1.id
    assert len(data["teaching_assignments"]) == 1
    assert data["teaching_assignments"][0]["class_id"] == c2.id
    assert len(data["authorized_classes"]) == 2  # c1 (mentor) + c2 (authorized subject teacher)

def test_class_mentor_can_add_student(client, admin_headers, sample_faculty_and_classes):
    t1 = sample_faculty_and_classes["t1"]
    c1 = sample_faculty_and_classes["c1"]
    h1 = sample_faculty_and_classes["h1"]

    # Make T1 mentor of Class 1
    client.post(f"/api/assignments/classes/{c1.id}/mentor", headers=admin_headers, json={"teacher_id": t1.id})

    res = client.post(
        "/api/students/",
        headers=h1,
        json={
            "name": "David Miller",
            "admission_number": "ADM-2026-101",
            "class_id": c1.id,
            "guardian_name": "Sarah Miller",
            "guardian_phone": "+1 (555) 123-4567"
        }
    )
    assert res.status_code == 201
    stu = res.json()
    assert stu["name"] == "David Miller"
    assert stu["admission_number"] == "ADM-2026-101"
    assert "invitation_link" in stu
    assert "setup_token=" in stu["invitation_link"]

def test_subject_teacher_with_permission_can_add_student(client, admin_headers, sample_faculty_and_classes):
    t2 = sample_faculty_and_classes["t2"]
    c1 = sample_faculty_and_classes["c1"]
    h2 = sample_faculty_and_classes["h2"]

    # Give T2 subject assignment on c1 with can_add_students=True
    client.post(
        "/api/assignments/subjects",
        headers=admin_headers,
        json={"teacher_id": t2.id, "class_id": c1.id, "subject": "Physics I", "can_add_students": True}
    )

    res = client.post(
        "/api/students/",
        headers=h2,
        json={
            "name": "Emma Watson",
            "admission_number": "ADM-2026-102",
            "class_id": c1.id,
            "guardian_name": "John Watson",
            "guardian_phone": "+1 (555) 987-6543"
        }
    )
    assert res.status_code == 201
    assert res.json()["name"] == "Emma Watson"

def test_subject_teacher_without_permission_is_forbidden(client, admin_headers, sample_faculty_and_classes):
    t2 = sample_faculty_and_classes["t2"]
    c2 = sample_faculty_and_classes["c2"]
    h2 = sample_faculty_and_classes["h2"]

    # Assign T2 to teach Physics in c2 with can_add_students=False
    client.post(
        "/api/assignments/subjects",
        headers=admin_headers,
        json={"teacher_id": t2.id, "class_id": c2.id, "subject": "Physics II", "can_add_students": False}
    )

    res = client.post(
        "/api/students/",
        headers=h2,
        json={
            "name": "Denied Student",
            "admission_number": "ADM-2026-103",
            "class_id": c2.id,
            "guardian_name": "Guardian",
            "guardian_phone": "+1 555-0000"
        }
    )
    assert res.status_code == 403
    assert "not authorized to add students" in res.json()["detail"].lower()

def test_unrelated_teacher_is_forbidden(client, sample_faculty_and_classes):
    c1 = sample_faculty_and_classes["c1"]
    h3 = sample_faculty_and_classes["h3"]

    res = client.post(
        "/api/students/",
        headers=h3,
        json={
            "name": "Unauthorized Test",
            "admission_number": "ADM-2026-104",
            "class_id": c1.id,
            "guardian_name": "Guardian",
            "guardian_phone": "+1 555-0000"
        }
    )
    assert res.status_code == 403
    assert "not authorized to add students" in res.json()["detail"].lower()

def test_duplicate_admission_number_rejected(client, admin_headers, sample_faculty_and_classes):
    c1 = sample_faculty_and_classes["c1"]

    res1 = client.post(
        "/api/students/",
        headers=admin_headers,
        json={
            "name": "First Student",
            "admission_number": "ADM-UNIQUE-999",
            "class_id": c1.id,
            "guardian_name": "Guardian 1",
            "guardian_phone": "+1 555-1111"
        }
    )
    assert res1.status_code == 201

    # Attempt to enroll another student with the exact same admission number
    res2 = client.post(
        "/api/students/",
        headers=admin_headers,
        json={
            "name": "Second Student",
            "admission_number": "ADM-UNIQUE-999",
            "class_id": c1.id,
            "guardian_name": "Guardian 2",
            "guardian_phone": "+1 555-2222"
        }
    )
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"].lower()
