import pytest
from datetime import datetime, date, timedelta
from app.models.user import User, UserRole
from app.models.classroom import Classroom
from app.models.student import Student
from app.models.parent import Parent, ParentStudent, ParentCorrectionRequest
from app.models.examination import Examination, Mark
from app.models.fee import FeeInvoice
from app.models.attendance import Attendance
from app.models.timetable import TimetablePeriod
from app.models.announcement import Announcement, AnnouncementReadReceipt
from app.core.security import hash_password, create_access_token

@pytest.fixture
def sample_classroom_10a(db):
    cls = Classroom(class_code="CLS-10A", name="Grade 10", section="A", room="Room 101", capacity=30)
    db.add(cls)
    db.commit()
    db.refresh(cls)
    return cls

@pytest.fixture
def sample_classroom_11b(db):
    cls = Classroom(class_code="CLS-11B", name="Grade 11", section="B", room="Room 202", capacity=30)
    db.add(cls)
    db.commit()
    db.refresh(cls)
    return cls

@pytest.fixture
def sample_student_1(db, sample_classroom_10a):
    st = Student(
        student_id="STU-T101",
        admission_number="ADM-T101",
        roll_number="10A-01",
        name="Alice Walker",
        email="alice.w@oakridge.edu",
        gender="Female",
        guardian_name="Robert Walker",
        guardian_phone="+1 (555) 111-2222",
        class_id=sample_classroom_10a.id,
        status="Active",
        fees_status="Paid"
    )
    db.add(st)
    db.commit()
    db.refresh(st)
    return st

@pytest.fixture
def sample_student_2(db, sample_classroom_11b):
    st = Student(
        student_id="STU-T102",
        admission_number="ADM-T102",
        roll_number="11B-05",
        name="Bob Martin",
        email="bob.m@oakridge.edu",
        gender="Male",
        guardian_name="David Martin",
        guardian_phone="+1 (555) 333-4444",
        class_id=sample_classroom_11b.id,
        status="Active",
        fees_status="Pending"
    )
    db.add(st)
    db.commit()
    db.refresh(st)
    return st

@pytest.fixture
def parent_user_headers(db, sample_student_1):
    user = User(
        email="robert.w@parent.oakridge.edu",
        hashed_password=hash_password("ParentSecure123!"),
        full_name="Robert Walker",
        role=UserRole.PARENT,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    parent = Parent(
        user_id=user.id,
        parent_code="PAR-9001",
        name="Robert Walker",
        email="robert.w@parent.oakridge.edu",
        phone="+1 (555) 111-2222",
        relationship_type="Father",
        status="Active"
    )
    db.add(parent)
    db.commit()
    db.refresh(parent)

    link = ParentStudent(
        parent_id=parent.id,
        student_id=sample_student_1.id,
        relationship="Father",
        is_primary_contact=True,
        is_verified=True,
        verified_at=datetime.utcnow()
    )
    db.add(link)
    db.commit()

    token = create_access_token(data={"sub": user.email, "user_id": user.id, "role": "parent"})
    return {"Authorization": f"Bearer {token}"}, parent, user

# -------------------------------------------------------------
# Test Module 1: Parent Account & Admin Management
# -------------------------------------------------------------

def test_admin_create_parent_and_link_student(client, admin_headers, sample_student_1):
    payload = {
        "name": "Sarah Connor",
        "email": "sarah.connor@parent.oakridge.edu",
        "phone": "+1 (555) 999-0000",
        "relationship_type": "Mother",
        "password": "Password123!",
        "student_ids": [sample_student_1.id]
    }
    response = client.post("/api/admin/parents", json=payload, headers=admin_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Sarah Connor"
    assert data["email"] == "sarah.connor@parent.oakridge.edu"
    assert len(data["students"]) == 1
    assert data["students"][0]["id"] == sample_student_1.id

def test_parent_get_me_and_children(client, parent_user_headers, sample_student_1):
    headers, parent, user = parent_user_headers
    resp_me = client.get("/api/parent/me", headers=headers)
    assert resp_me.status_code == 200
    data_me = resp_me.json()
    assert data_me["name"] == "Robert Walker"
    assert len(data_me["children"]) == 1
    assert data_me["children"][0]["name"] == sample_student_1.name

    resp_children = client.get("/api/parent/children", headers=headers)
    assert resp_children.status_code == 200
    children = resp_children.json()
    assert len(children) == 1
    assert children[0]["student_id"] == sample_student_1.student_id

def test_parent_cannot_access_unlinked_student(client, parent_user_headers, sample_student_2):
    headers, parent, user = parent_user_headers
    # Student 2 is NOT linked to this parent -> Must return 403 Forbidden
    resp = client.get(f"/api/parent/children/{sample_student_2.id}", headers=headers)
    assert resp.status_code == 403
    assert "Access forbidden" in resp.json()["detail"]

    resp_att = client.get(f"/api/parent/children/{sample_student_2.id}/attendance", headers=headers)
    assert resp_att.status_code == 403

    resp_res = client.get(f"/api/parent/children/{sample_student_2.id}/results", headers=headers)
    assert resp_res.status_code == 403

def test_parent_published_exam_results_filter(client, db, parent_user_headers, sample_student_1, sample_classroom_10a):
    headers, parent, user = parent_user_headers

    # 1. Published examination
    exam_pub = Examination(
        exam_code="EXAM-PUB-01",
        name="Midterm Physics",
        academic_year="2026-2027",
        class_id=sample_classroom_10a.id,
        subject="Physics",
        exam_date=date.today() - timedelta(days=5),
        total_marks=100,
        passing_marks=40,
        status="Published"
    )
    db.add(exam_pub)
    db.commit()
    db.refresh(exam_pub)

    mark_pub = Mark(
        examination_id=exam_pub.id,
        student_id=sample_student_1.id,
        marks_obtained=88,
        grade="A",
        status="Passed"
    )
    db.add(mark_pub)

    # 2. Draft / Unpublished examination
    exam_draft = Examination(
        exam_code="EXAM-DRAFT-02",
        name="Pop Quiz Chemistry",
        academic_year="2026-2027",
        class_id=sample_classroom_10a.id,
        subject="Chemistry",
        exam_date=date.today(),
        total_marks=50,
        passing_marks=20,
        status="Draft"
    )
    db.add(exam_draft)
    db.commit()
    db.refresh(exam_draft)

    mark_draft = Mark(
        examination_id=exam_draft.id,
        student_id=sample_student_1.id,
        marks_obtained=42,
        grade="A",
        status="Passed"
    )
    db.add(mark_draft)
    db.commit()

    # Query parent child results
    resp = client.get(f"/api/parent/children/{sample_student_1.id}/results", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    results = data["results"]

    # Must only contain published exam (EXAM-PUB-01), draft must NOT be present
    assert len(results) == 1
    assert results[0]["exam_code"] == "EXAM-PUB-01"
    assert results[0]["marks_obtained"] == 88

def test_parent_profile_correction_request_flow(client, db, admin_headers, parent_user_headers, sample_student_1):
    headers, parent, user = parent_user_headers

    # Submit correction request
    corr_payload = {
        "student_id": sample_student_1.id,
        "requested_field": "Guardian Phone",
        "current_value": sample_student_1.guardian_phone,
        "proposed_value": "+1 (555) 777-8888",
        "reason": "Updated emergency mobile number"
    }
    submit_resp = client.post("/api/parent/profile-correction-requests", json=corr_payload, headers=headers)
    assert submit_resp.status_code == 201
    req_id = submit_resp.json()["request_id"]

    # Admin lists correction requests
    admin_list_resp = client.get("/api/admin/parents/correction-requests/all", headers=admin_headers)
    assert admin_list_resp.status_code == 200
    requests = admin_list_resp.json()
    assert any(r["id"] == req_id for r in requests)

    # Admin approves request
    review_resp = client.put(
        f"/api/admin/parents/correction-requests/{req_id}",
        json={"status": "Approved", "admin_notes": "Verified via phone call"},
        headers=admin_headers
    )
    assert review_resp.status_code == 200

    # Student record updated
    db.refresh(sample_student_1)
    assert sample_student_1.guardian_phone == "+1 (555) 777-8888"

# -------------------------------------------------------------
# Test Module 2: School Announcements & Audience Targeting
# -------------------------------------------------------------

def test_announcements_audience_and_read_receipts(client, db, admin_headers, teacher_headers, student_headers, parent_user_headers, sample_student_1):
    headers_parent, parent, user_parent = parent_user_headers

    # Create announcements with different audiences
    ann_all = Announcement(
        title="School Closed for Heavy Snow",
        content="Campus will be closed tomorrow due to weather conditions.",
        category="Emergency",
        priority="Urgent",
        target_audience="ALL",
        is_published=True,
        status="Published"
    )
    ann_parent = Announcement(
        title="Annual Tuition Ledger Guide",
        content="Guide for tax exemption documentation on school tuition fees.",
        category="General",
        priority="Normal",
        target_audience="PARENTS_ALL",
        is_published=True,
        status="Published"
    )
    ann_grade10 = Announcement(
        title="Grade 10 Lab Safety Rules",
        content="Grade 10 students and parents please sign the lab safety pledge.",
        category="Academic",
        priority="High",
        target_audience="PARENTS_GRADE",
        target_grade="Grade 10",
        is_published=True,
        status="Published"
    )
    ann_teacher = Announcement(
        title="Faculty Graders Meeting",
        content="All teachers must attend the grading standardization seminar.",
        category="General",
        priority="Normal",
        target_audience="TEACHERS_ALL",
        is_published=True,
        status="Published"
    )
    db.add_all([ann_all, ann_parent, ann_grade10, ann_teacher])
    db.commit()

    # 1. Parent should see: ALL, PARENTS_ALL, and PARENTS_GRADE (Grade 10 because student 1 is in Grade 10)
    # Parent should NOT see TEACHERS_ALL
    parent_resp = client.get("/api/announcements", headers=headers_parent)
    assert parent_resp.status_code == 200
    parent_titles = [a["title"] for a in parent_resp.json()]
    assert "School Closed for Heavy Snow" in parent_titles
    assert "Annual Tuition Ledger Guide" in parent_titles
    assert "Grade 10 Lab Safety Rules" in parent_titles
    assert "Faculty Graders Meeting" not in parent_titles

    # 2. Teacher should see: ALL and TEACHERS_ALL, but NOT PARENTS_ALL
    teacher_resp = client.get("/api/announcements", headers=teacher_headers)
    assert teacher_resp.status_code == 200
    teacher_titles = [a["title"] for a in teacher_resp.json()]
    assert "School Closed for Heavy Snow" in teacher_titles
    assert "Faculty Graders Meeting" in teacher_titles
    assert "Annual Tuition Ledger Guide" not in teacher_titles

    # 3. Read Receipts and Unread Count for Parent
    unread_resp = client.get("/api/announcements/unread-count", headers=headers_parent)
    assert unread_resp.status_code == 200
    initial_unread = unread_resp.json()["unread_count"]
    assert initial_unread >= 3

    # Mark one announcement as read
    read_resp = client.post(f"/api/announcements/{ann_all.id}/read", headers=headers_parent)
    assert read_resp.status_code == 200

    # Unread count should decrease by 1
    unread_resp_after = client.get("/api/announcements/unread-count", headers=headers_parent)
    assert unread_resp_after.json()["unread_count"] == initial_unread - 1
