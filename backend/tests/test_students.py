def test_admin_create_student_success(client, admin_headers):
    payload = {
        "name": "Marcus Aurelius",
        "email": "m.aurelius@oakridge.edu",
        "gender": "Male",
        "guardian_name": "Antoninus Pius",
        "guardian_phone": "+1 (555) 321-9876",
        "status": "Active",
        "fees_status": "Pending"
    }
    response = client.post("/api/students/", headers=admin_headers, json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Marcus Aurelius"
    assert data["email"] == "m.aurelius@oakridge.edu"
    assert "student_id" in data
    assert "roll_number" in data

def test_student_cannot_create_student(client, student_headers):
    payload = {
        "name": "Unauthorized Attempt",
        "email": "unauth@oakridge.edu",
        "gender": "Female",
        "guardian_name": "Guardian",
        "guardian_phone": "+1 555-000-0000"
    }
    response = client.post("/api/students/", headers=student_headers, json=payload)
    assert response.status_code == 403

def test_student_creation_validation_error(client, admin_headers):
    payload = {
        "name": "A", # Too short (min_length=2)
        "email": "not-an-email",
        "gender": "InvalidGender",
        "guardian_name": "",
        "guardian_phone": "123"
    }
    response = client.post("/api/students/", headers=admin_headers, json=payload)
    assert response.status_code == 422
    assert response.json()["error_type"] == "ValidationError"

def test_list_and_search_students(client, admin_headers):
    # Create two students
    client.post("/api/students/", headers=admin_headers, json={
        "name": "Hermione Granger",
        "email": "h.granger@oakridge.edu",
        "gender": "Female",
        "guardian_name": "Mr. Granger",
        "guardian_phone": "+1 555-123-4567"
    })
    client.post("/api/students/", headers=admin_headers, json={
        "name": "Harry Potter",
        "email": "h.potter@oakridge.edu",
        "gender": "Male",
        "guardian_name": "Sirius Black",
        "guardian_phone": "+1 555-987-6543"
    })

    # Search for Granger
    response = client.get("/api/students/?search=Granger", headers=admin_headers)
    assert response.status_code == 200
    results = response.json()
    assert len(results) >= 1
    assert any(s["name"] == "Hermione Granger" for s in results)

    # Filter by gender
    male_resp = client.get("/api/students/?gender=Male", headers=admin_headers)
    assert male_resp.status_code == 200
    for s in male_resp.json():
        assert s["gender"] == "Male"

def test_update_student(client, admin_headers):
    create_resp = client.post("/api/students/", headers=admin_headers, json={
        "name": "Ron Weasley",
        "email": "r.weasley@oakridge.edu",
        "gender": "Male",
        "guardian_name": "Arthur Weasley",
        "guardian_phone": "+1 555-333-4444",
        "status": "Active"
    })
    student_id = create_resp.json()["id"]

    update_resp = client.put(f"/api/students/{student_id}", headers=admin_headers, json={
        "status": "Suspended",
        "fees_status": "Paid"
    })
    assert update_resp.status_code == 200
    data = update_resp.json()
    assert data["status"] == "Suspended"
    assert data["fees_status"] == "Paid"

def test_delete_student(client, admin_headers):
    create_resp = client.post("/api/students/", headers=admin_headers, json={
        "name": "Temporary Student",
        "email": "temp.student@oakridge.edu",
        "gender": "Female",
        "guardian_name": "Guardian",
        "guardian_phone": "+1 555-777-8888"
    })
    student_id = create_resp.json()["id"]

    del_resp = client.delete(f"/api/students/{student_id}", headers=admin_headers)
    assert del_resp.status_code == 200
    assert del_resp.json()["success"] is True

    # Verify not found after deletion
    get_resp = client.get(f"/api/students/{student_id}", headers=admin_headers)
    assert get_resp.status_code == 404
