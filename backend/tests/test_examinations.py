from datetime import date

def test_schedule_exam_success(client, teacher_headers, admin_headers):
    # Setup class
    cls_resp = client.post("/api/classes/", headers=admin_headers, json={
        "name": "Grade 11",
        "section": "A"
    })
    class_id = cls_resp.json()["id"]

    exam_payload = {
        "name": "Mid-Term Examination 2026",
        "class_id": class_id,
        "subject": "Physics",
        "exam_date": str(date.today()),
        "time_slot": "09:00 AM - 12:00 PM",
        "total_marks": 100,
        "passing_marks": 40
    }
    response = client.post("/api/examinations/", headers=teacher_headers, json=exam_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["subject"] == "Physics"
    assert "exam_code" in data
    assert data["total_marks"] == 100

def test_record_mark_and_grade_calculation(client, teacher_headers, admin_headers):
    cls_resp = client.post("/api/classes/", headers=admin_headers, json={"name": "Grade 10", "section": "Science"})
    class_id = cls_resp.json()["id"]

    stu_resp = client.post("/api/students/", headers=admin_headers, json={
        "name": "Alan Turing",
        "email": "a.turing@oakridge.edu",
        "gender": "Male",
        "guardian_name": "Julius Turing",
        "guardian_phone": "+1 555-444-5555",
        "class_id": class_id
    })
    student_id = stu_resp.json()["id"]

    exam_resp = client.post("/api/examinations/", headers=teacher_headers, json={
        "name": "Cryptography & Math Test",
        "class_id": class_id,
        "subject": "Mathematics",
        "exam_date": str(date.today()),
        "total_marks": 100,
        "passing_marks": 40
    })
    exam_id = exam_resp.json()["id"]

    # Submit 95/100 -> should be A+ and Passed
    mark_payload = {
        "examination_id": exam_id,
        "student_id": student_id,
        "marks_obtained": 95.0,
        "remarks": "Outstanding analytical performance"
    }
    response = client.post("/api/examinations/marks", headers=teacher_headers, json=mark_payload)
    assert response.status_code == 201
    mark_data = response.json()
    assert mark_data["marks_obtained"] == 95.0
    assert mark_data["grade"] == "A+"
    assert mark_data["status"] == "Passed"

    # Query report card
    card_resp = client.get(f"/api/examinations/student/{student_id}/report-card", headers=teacher_headers)
    assert card_resp.status_code == 200
    cards = card_resp.json()
    assert len(cards) == 1
    assert cards[0]["grade"] == "A+"

def test_marks_exceeding_total_fails(client, teacher_headers, admin_headers):
    cls_resp = client.post("/api/classes/", headers=admin_headers, json={"name": "Grade 9", "section": "A"})
    class_id = cls_resp.json()["id"]
    stu_resp = client.post("/api/students/", headers=admin_headers, json={
        "name": "Test Student",
        "email": "test.stu@oakridge.edu",
        "gender": "Female",
        "guardian_name": "Guardian",
        "guardian_phone": "+1 555-999-0000"
    })
    student_id = stu_resp.json()["id"]
    exam_resp = client.post("/api/examinations/", headers=teacher_headers, json={
        "name": "Test Exam",
        "class_id": class_id,
        "subject": "Biology",
        "exam_date": str(date.today()),
        "total_marks": 50,
        "passing_marks": 20
    })
    exam_id = exam_resp.json()["id"]

    # Try recording 55 marks on a 50 mark exam
    response = client.post("/api/examinations/marks", headers=teacher_headers, json={
        "examination_id": exam_id,
        "student_id": student_id,
        "marks_obtained": 55.0
    })
    assert response.status_code == 400
    assert "cannot exceed maximum total marks" in response.json()["detail"]
