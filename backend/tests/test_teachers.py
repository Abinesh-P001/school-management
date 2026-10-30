def test_admin_create_teacher_success(client, admin_headers):
    payload = {
        "name": "Dr. Isaac Newton",
        "email": "i.newton@oakridge.edu",
        "department": "Science",
        "subject": "Classical Mechanics & Calculus",
        "qualification": "Ph.D. Natural Philosophy, Cambridge",
        "experience": "15 Years",
        "status": "Active"
    }
    response = client.post("/api/teachers/", headers=admin_headers, json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Dr. Isaac Newton"
    assert data["email"] == "i.newton@oakridge.edu"
    assert "employee_id" in data
    assert data["employee_id"].startswith("TCH-")

def test_student_cannot_create_teacher(client, student_headers):
    payload = {
        "name": "Fake Teacher",
        "email": "fake.teacher@oakridge.edu",
        "department": "Science",
        "subject": "Biology"
    }
    response = client.post("/api/teachers/", headers=student_headers, json=payload)
    assert response.status_code == 403

def test_list_and_filter_teachers(client, admin_headers):
    client.post("/api/teachers/", headers=admin_headers, json={
        "name": "Ada Lovelace",
        "email": "a.lovelace@oakridge.edu",
        "department": "Computer Science",
        "subject": "Algorithms & Programming"
    })
    client.post("/api/teachers/", headers=admin_headers, json={
        "name": "Marie Curie",
        "email": "m.curie@oakridge.edu",
        "department": "Science",
        "subject": "Radiology & Chemistry"
    })

    # Search for Ada
    search_resp = client.get("/api/teachers/?search=Lovelace", headers=admin_headers)
    assert search_resp.status_code == 200
    results = search_resp.json()
    assert len(results) >= 1
    assert any(t["name"] == "Ada Lovelace" for t in results)

    # Filter by department
    cs_resp = client.get("/api/teachers/?department=Computer Science", headers=admin_headers)
    assert cs_resp.status_code == 200
    for t in cs_resp.json():
        assert t["department"] == "Computer Science"

def test_update_teacher(client, admin_headers):
    create_resp = client.post("/api/teachers/", headers=admin_headers, json={
        "name": "Galileo Galilei",
        "email": "g.galilei@oakridge.edu",
        "department": "Science",
        "subject": "Observational Astronomy"
    })
    teacher_id = create_resp.json()["id"]

    update_resp = client.put(f"/api/teachers/{teacher_id}", headers=admin_headers, json={
        "experience": "20 Years",
        "status": "On Leave"
    })
    assert update_resp.status_code == 200
    assert update_resp.json()["experience"] == "20 Years"
    assert update_resp.json()["status"] == "On Leave"

def test_delete_teacher(client, admin_headers):
    create_resp = client.post("/api/teachers/", headers=admin_headers, json={
        "name": "Temp Faculty",
        "email": "temp.faculty@oakridge.edu",
        "department": "Arts",
        "subject": "Sculpture"
    })
    teacher_id = create_resp.json()["id"]

    del_resp = client.delete(f"/api/teachers/{teacher_id}", headers=admin_headers)
    assert del_resp.status_code == 200
    assert del_resp.json()["success"] is True

    get_resp = client.get(f"/api/teachers/{teacher_id}", headers=admin_headers)
    assert get_resp.status_code == 404
