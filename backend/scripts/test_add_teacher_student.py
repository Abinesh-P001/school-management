import json
import sys
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000/api"

def api_request(method, path, body=None, headers=None):
    url = f"{BASE_URL}{path}"
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            content = resp.read().decode("utf-8")
            json_data = json.loads(content) if content else None
            return status, json_data
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            json_data = json.loads(content)
        except Exception:
            json_data = {"detail": content}
        return e.code, json_data

def main():
    print("=" * 65)
    print("TESTING ADD TEACHER & ADD STUDENT PROVISIONING ENDPOINTS")
    print("=" * 65)

    # 1. Admin logs in
    status, login_res = api_request("POST", "/auth/login", {
        "email": "admin@oakridge.edu",
        "password": "AdminPassword123!"
    })
    if status != 200:
        print(f"[FAIL] Admin login failed: {status} {login_res}")
        sys.exit(1)

    admin_token = login_res["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("[PASS] 1. Admin authenticated via common login")

    # 2. Admin adds Teacher
    teacher_payload = {
        "full_name": "Dr. Eleanor Vance",
        "email": "e.vance@oakridge.edu",
        "teacher_id": "TCH-9021",
        "subject": "Quantum Physics",
        "assigned_classes": ["Grade 11-A", "Grade 12-A"],
        "password": "TeacherSecure123!"
    }
    t_status, t_data = api_request("POST", "/admin/teachers", teacher_payload, admin_headers)
    if t_status == 400 and "already exists" in str(t_data):
        print("  Notice: Dr. Eleanor Vance already registered from prior run, verifying duplicate handling...")
    elif t_status == 201:
        assert t_data["teacher_id"] == "TCH-9021"
        assert "Grade 11-A" in t_data["assigned_classes"]
        assert "invitation_link" in t_data and len(t_data["invitation_link"]) > 0
        print("[PASS] 2. Admin successfully created Teacher with invitation link:", t_data["invitation_link"][:60], "...")
    else:
        print(f"[FAIL] Add teacher returned {t_status}: {t_data}")
        sys.exit(1)

    # 3. Duplicate teacher email/ID check
    dup_t_status, dup_t_data = api_request("POST", "/admin/teachers", teacher_payload, admin_headers)
    assert dup_t_status == 400, f"Expected 400 for duplicate teacher, got {dup_t_status}"
    print("[PASS] 3. Duplicate teacher email / ID correctly rejected with 400 Bad Request")

    # 4. Admin adds Student
    student_payload = {
        "full_name": "Maya Lin",
        "admission_number": "ADM-2026-902",
        "email": "maya.lin@oakridge.edu",
        "student_id": "STU-9021",
        "class_name": "Grade 10",
        "section": "A",
        "guardian_name": "Thomas Lin",
        "guardian_phone": "+1 (555) 345-6789",
        "password": "StudentSecure123!"
    }
    s_status, s_data = api_request("POST", "/admin/students", student_payload, admin_headers)
    if s_status == 400 and "already exists" in str(s_data):
        print("  Notice: Maya Lin already registered from prior run, verifying duplicate handling...")
    elif s_status == 201:
        assert s_data["student_id"] == "STU-9021"
        assert s_data["admission_number"] == "ADM-2026-902"
        assert "invitation_link" in s_data and len(s_data["invitation_link"]) > 0
        print("[PASS] 4. Admin successfully created Student with invitation link:", s_data["invitation_link"][:60], "...")
    else:
        print(f"[FAIL] Add student returned {s_status}: {s_data}")
        sys.exit(1)

    # 5. Duplicate student admission_number / student_id check
    dup_s_status, dup_s_data = api_request("POST", "/admin/students", student_payload, admin_headers)
    assert dup_s_status == 400, f"Expected 400 for duplicate student, got {dup_s_status}"
    print("[PASS] 5. Duplicate student admission number / student ID correctly rejected with 400 Bad Request")

    # 6. Verify newly created accounts can log in via Common Login
    t_login_status, t_login_data = api_request("POST", "/auth/login", {
        "email": "e.vance@oakridge.edu",
        "password": "TeacherSecure123!"
    })
    assert t_login_status == 200, f"Teacher login failed: {t_login_data}"
    teacher_token = t_login_data["access_token"]
    assert t_login_data["role"] == "teacher"
    print("[PASS] 6. Teacher logged in successfully via common login with verified role: teacher")

    s_login_status, s_login_data = api_request("POST", "/auth/login", {
        "email": "maya.lin@oakridge.edu",
        "password": "StudentSecure123!"
    })
    assert s_login_status == 200, f"Student login failed: {s_login_data}"
    student_token = s_login_data["access_token"]
    assert s_login_data["role"] == "student"
    print("[PASS] 7. Student logged in successfully via common login with verified role: student")

    # 7. Verify Teacher and Student cannot access Admin Endpoints
    t_unauth_status, _ = api_request("POST", "/admin/teachers", teacher_payload, {"Authorization": f"Bearer {teacher_token}"})
    assert t_unauth_status == 403, f"Teacher should be 403, got {t_unauth_status}"

    s_unauth_status, _ = api_request("POST", "/admin/students", student_payload, {"Authorization": f"Bearer {student_token}"})
    assert s_unauth_status == 403, f"Student should be 403, got {s_unauth_status}"
    print("[PASS] 8. Server-side RBAC verified: Teacher and Student forbidden from creating accounts (403 Forbidden)")

    # 8. Verify unauthenticated call is rejected
    anon_status, _ = api_request("POST", "/admin/teachers", teacher_payload)
    assert anon_status == 401, f"Anonymous should be 401, got {anon_status}"
    print("[PASS] 9. Unauthenticated request correctly rejected with 401 Unauthorized")

    print("=" * 65)
    print("ALL ADD TEACHER & ADD STUDENT TESTS PASSED!")
    print("=" * 65)

if __name__ == "__main__":
    main()
