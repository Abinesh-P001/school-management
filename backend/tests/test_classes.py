def test_admin_create_class_success(client, admin_headers):
    payload = {
        "name": "Grade 10",
        "section": "A",
        "room": "Building B - Room 204",
        "capacity": 35,
        "schedule": "Mon - Fri, 8:00 AM - 3:00 PM"
    }
    response = client.post("/api/classes/", headers=admin_headers, json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Grade 10"
    assert data["section"] == "A"
    assert "class_code" in data
    assert data["class_code"].startswith("CLS-")

def test_student_cannot_create_class(client, student_headers):
    response = client.post("/api/classes/", headers=student_headers, json={
        "name": "Grade 9",
        "section": "B"
    })
    assert response.status_code == 403

def test_list_classes_and_roster(client, admin_headers):
    # Create class
    cls_resp = client.post("/api/classes/", headers=admin_headers, json={
        "name": "Grade 11",
        "section": "Science",
        "room": "Lab 3",
        "capacity": 30
    })
    class_id = cls_resp.json()["id"]

    # Enroll student in this class
    client.post("/api/students/", headers=admin_headers, json={
        "name": "Albert Einstein",
        "email": "a.einstein@oakridge.edu",
        "gender": "Male",
        "guardian_name": "Hermann Einstein",
        "guardian_phone": "+1 555-111-2222",
        "class_id": class_id
    })

    # List classes and verify student count
    list_resp = client.get("/api/classes/", headers=admin_headers)
    assert list_resp.status_code == 200
    classes = list_resp.json()
    target_class = next(c for c in classes if c["id"] == class_id)
    assert target_class["student_count"] == 1

    # Get class roster
    roster_resp = client.get(f"/api/classes/{class_id}/students", headers=admin_headers)
    assert roster_resp.status_code == 200
    roster = roster_resp.json()
    assert len(roster) == 1
    assert roster[0]["name"] == "Albert Einstein"

def test_update_and_delete_class(client, admin_headers):
    create_resp = client.post("/api/classes/", headers=admin_headers, json={
        "name": "Grade 8",
        "section": "Junior",
        "capacity": 25
    })
    class_id = create_resp.json()["id"]

    # Update
    update_resp = client.put(f"/api/classes/{class_id}", headers=admin_headers, json={
        "room": "Junior Wing - Room 10",
        "capacity": 32
    })
    assert update_resp.status_code == 200
    assert update_resp.json()["capacity"] == 32
    assert update_resp.json()["room"] == "Junior Wing - Room 10"

    # Delete
    del_resp = client.delete(f"/api/classes/{class_id}", headers=admin_headers)
    assert del_resp.status_code == 200
    assert del_resp.json()["success"] is True

def test_teacher_only_views_assigned_classes(client, admin_headers, teacher_user, teacher_headers):
    # Register teacher profile in teachers table
    t_resp = client.post("/api/teachers/", headers=admin_headers, json={
        "name": teacher_user.full_name,
        "email": teacher_user.email,
        "department": "Science",
        "subject": "Physics",
        "user_id": teacher_user.id
    })
    assert t_resp.status_code == 201
    teacher_id = t_resp.json()["id"]

    # Create class assigned to this teacher
    cls1_resp = client.post("/api/classes/", headers=admin_headers, json={
        "name": "Grade 10",
        "section": "A",
        "class_teacher_id": teacher_id
    })
    assert cls1_resp.status_code == 201
    assigned_class_id = cls1_resp.json()["id"]

    # Create another class assigned to another teacher / unassigned
    cls2_resp = client.post("/api/classes/", headers=admin_headers, json={
        "name": "Grade 12",
        "section": "B"
    })
    assert cls2_resp.status_code == 201
    unassigned_class_id = cls2_resp.json()["id"]

    # Teacher listing classes should only return assigned class
    list_resp = client.get("/api/classes/", headers=teacher_headers)
    assert list_resp.status_code == 200
    classes = list_resp.json()
    returned_ids = [c["id"] for c in classes]
    assert assigned_class_id in returned_ids
    assert unassigned_class_id not in returned_ids

    # Direct access to unassigned class should return 403 Forbidden
    forbidden_resp = client.get(f"/api/classes/{unassigned_class_id}", headers=teacher_headers)
    assert forbidden_resp.status_code == 403

