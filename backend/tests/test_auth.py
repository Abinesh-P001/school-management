from app.core.security import verify_password

def test_register_user_success(client):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "new.user@oakridge.edu",
            "password": "SecurePassword123!",
            "full_name": "New User",
            "role": "student"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "new.user@oakridge.edu"
    assert data["full_name"] == "New User"
    assert data["role"] == "student"
    assert "password" not in data
    assert "hashed_password" not in data

def test_register_duplicate_email(client, student_user):
    response = client.post(
        "/api/auth/register",
        json={
            "email": student_user.email,
            "password": "AnotherPassword123!",
            "full_name": "Duplicate Student",
            "role": "student"
        }
    )
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]

def test_login_success(client, admin_user):
    response = client.post(
        "/api/auth/login",
        json={
            "email": admin_user.email,
            "password": "AdminSecret123!"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["email"] == admin_user.email
    assert data["role"] == "admin"

def test_login_invalid_password(client, admin_user):
    response = client.post(
        "/api/auth/login",
        json={
            "email": admin_user.email,
            "password": "WrongPassword999!"
        }
    )
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]

def test_get_current_user_me(client, admin_headers, admin_user):
    response = client.get("/api/auth/me", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == admin_user.email
    assert data["full_name"] == admin_user.full_name

def test_get_current_user_unauthorized(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401

def test_change_password_success(client, admin_headers, admin_user, db):
    response = client.post(
        "/api/auth/change-password",
        headers=admin_headers,
        json={
            "current_password": "AdminSecret123!",
            "new_password": "UpdatedPassword456!"
        }
    )
    assert response.status_code == 200
    assert response.json()["success"] is True

    # Verify login with new password
    login_resp = client.post(
        "/api/auth/login",
        json={
            "email": admin_user.email,
            "password": "UpdatedPassword456!"
        }
    )
    assert login_resp.status_code == 200
