from datetime import date

def test_record_bulk_attendance_success(client, teacher_headers, admin_headers):
    # Setup class & students
    cls_resp = client.post("/api/classes/", headers=admin_headers, json={
        "name": "Grade 10",
        "section": "A"
    })
    class_id = cls_resp.json()["id"]

    stu1 = client.post("/api/students/", headers=admin_headers, json={
        "name": "Student One",
        "email": "stu1@oakridge.edu",
        "gender": "Female",
        "guardian_name": "Guardian",
        "guardian_phone": "+1 555-111-0001",
        "class_id": class_id
    }).json()["id"]

    stu2 = client.post("/api/students/", headers=admin_headers, json={
        "name": "Student Two",
        "email": "stu2@oakridge.edu",
        "gender": "Male",
        "guardian_name": "Guardian",
        "guardian_phone": "+1 555-111-0002",
        "class_id": class_id
    }).json()["id"]

    today = str(date.today())
    payload = {
        "class_id": class_id,
        "date": today,
        "records": [
            {"student_id": stu1, "status": "Present", "remarks": "On time"},
            {"student_id": stu2, "status": "Absent", "remarks": "Sick leave"}
        ]
    }
    response = client.post("/api/attendance/bulk", headers=teacher_headers, json=payload)
    assert response.status_code == 200
    assert response.json()["records_processed"] == 2

    # Query attendance stats
    stats_resp = client.get(f"/api/attendance/stats?class_id={class_id}&date={today}", headers=teacher_headers)
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert stats["total_students"] == 2
    assert stats["present"] == 1
    assert stats["absent"] == 1
    assert stats["attendance_rate"] == 50.0

def test_student_cannot_record_attendance(client, student_headers):
    response = client.post("/api/attendance/bulk", headers=student_headers, json={
        "class_id": 1,
        "date": str(date.today()),
        "records": []
    })
    assert response.status_code == 403

def test_update_single_attendance_entry(client, teacher_headers, admin_headers):
    cls_resp = client.post("/api/classes/", headers=admin_headers, json={"name": "Grade 12", "section": "B"})
    class_id = cls_resp.json()["id"]

    stu = client.post("/api/students/", headers=admin_headers, json={
        "name": "Late Student",
        "email": "late.student@oakridge.edu",
        "gender": "Male",
        "guardian_name": "Guardian",
        "guardian_phone": "+1 555-222-3333",
        "class_id": class_id
    }).json()["id"]

    today = str(date.today())
    client.post("/api/attendance/bulk", headers=teacher_headers, json={
        "class_id": class_id,
        "date": today,
        "records": [{"student_id": stu, "status": "Absent"}]
    })

    # Retrieve record ID
    records = client.get(f"/api/attendance/?class_id={class_id}&date={today}", headers=teacher_headers).json()
    assert len(records) == 1
    record_id = records[0]["id"]

    # Update to Excused
    update_resp = client.put(f"/api/attendance/{record_id}", headers=teacher_headers, json={
        "status": "Excused",
        "remarks": "Medical note received"
    })
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "Excused"
    assert update_resp.json()["remarks"] == "Medical note received"
