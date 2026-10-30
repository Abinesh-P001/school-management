import pytest
from app.models.user import User, UserRole

def test_admin_can_list_users(client, admin_headers, admin_user):
    response = client.get("/api/admin/users", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    # Verify passwords and hashes are never exposed
    for u in data:
        assert "password" not in u
        assert "hashed_password" not in u

def test_admin_can_create_admin_user(client, admin_headers):
    payload = {
        "email": "new.admin@oakridge.edu",
        "password": "SuperSecurePass123!",
        "full_name": "Vice Principal Adams",
        "role": "admin"
    }
    response = client.post("/api/admin/users", json=payload, headers=admin_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "new.admin@oakridge.edu"
    assert data["role"] == "admin"
    assert "password" not in data
    assert "hashed_password" not in data

    # Verify newly created admin can log in through standard authentication
    login_res = client.post("/api/auth/login", json={
        "email": "new.admin@oakridge.edu",
        "password": "SuperSecurePass123!"
    })
    assert login_res.status_code == 200
    assert login_res.json()["role"] == "admin"

def test_admin_can_create_teacher_user(client, admin_headers):
    payload = {
        "email": "sarah.physics@oakridge.edu",
        "password": "TeacherPassword123!",
        "full_name": "Dr. Sarah Connor",
        "role": "teacher",
        "department": "Science",
        "subject": "Physics",
        "qualification": "Ph.D. in Physics"
    }
    response = client.post("/api/admin/users", json=payload, headers=admin_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "sarah.physics@oakridge.edu"
    assert data["role"] == "teacher"

    # Verify newly created teacher can log in
    login_res = client.post("/api/auth/login", json={
        "email": "sarah.physics@oakridge.edu",
        "password": "TeacherPassword123!"
    })
    assert login_res.status_code == 200
    assert login_res.json()["role"] == "teacher"

def test_admin_can_create_student_user(client, admin_headers):
    payload = {
        "email": "student.tim@oakridge.edu",
        "password": "StudentPassword123!",
        "full_name": "Timothy Drake",
        "role": "student",
        "grade": "Grade 11",
        "section": "A",
        "guardian_name": "Jack Drake",
        "guardian_phone": "+1 (555) 789-0123"
    }
    response = client.post("/api/admin/users", json=payload, headers=admin_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "student.tim@oakridge.edu"
    assert data["role"] == "student"

    # Verify newly created student can log in
    login_res = client.post("/api/auth/login", json={
        "email": "student.tim@oakridge.edu",
        "password": "StudentPassword123!"
    })
    assert login_res.status_code == 200
    assert login_res.json()["role"] == "student"

def test_teacher_cannot_access_user_management(client, teacher_headers):
    # GET list
    get_res = client.get("/api/admin/users", headers=teacher_headers)
    assert get_res.status_code == 403

    # POST create user
    post_res = client.post("/api/admin/users", json={
        "email": "unauthorized.create@oakridge.edu",
        "password": "Password123!",
        "full_name": "Unauthorized User",
        "role": "student"
    }, headers=teacher_headers)
    assert post_res.status_code == 403

def test_student_cannot_access_user_management(client, student_headers):
    # GET list
    get_res = client.get("/api/admin/users", headers=student_headers)
    assert get_res.status_code == 403

    # POST create user
    post_res = client.post("/api/admin/users", json={
        "email": "unauthorized.student.create@oakridge.edu",
        "password": "Password123!",
        "full_name": "Unauthorized Student User",
        "role": "admin"
    }, headers=student_headers)
    assert post_res.status_code == 403

def test_unauthenticated_request_rejected(client):
    res = client.get("/api/admin/users")
    assert res.status_code == 401

def test_anonymous_cannot_register_admin(client):
    res = client.post("/api/auth/register", json={
        "email": "rogue.admin@oakridge.edu",
        "password": "RoguePassword123!",
        "full_name": "Rogue Admin",
        "role": "admin"
    })
    assert res.status_code == 403

def test_admin_cannot_deactivate_or_delete_self(client, admin_headers, admin_user):
    # Cannot deactivate self
    deact_res = client.patch(
        f"/api/admin/users/{admin_user.id}/status",
        json={"is_active": False},
        headers=admin_headers
    )
    assert deact_res.status_code == 400

    # Cannot delete self
    del_res = client.delete(
        f"/api/admin/users/{admin_user.id}",
        headers=admin_headers
    )
    assert del_res.status_code == 400
