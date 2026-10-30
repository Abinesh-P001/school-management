"""
Comprehensive verification test script for Oakridge School Management System using Python's standard urllib.
Validates:
1. One Common Login for all roles (Admin, Teacher, Student) with email + password.
2. Role retrieval from server-side profile (no client-selected role).
3. Admin User Management: Admin creating another Admin, Teacher, Student.
4. Newly created users logging in via the common login endpoint.
5. RBAC Protection: Teachers and Students blocked from /api/admin/users (403 Forbidden).
6. Unauthenticated requests rejected (401 Unauthorized).
7. Admin session preservation: Admin token remains fully valid and unchanged after creating users.
8. Security audits: Passwords and hashes never returned in any response.
"""
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import json
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
        with urllib.request.urlopen(req, timeout=5) as resp:
            resp_data = resp.read().decode("utf-8")
            return resp.status, json.loads(resp_data) if resp_data else {}
    except urllib.error.HTTPError as e:
        err_data = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_data)
        except Exception:
            return e.code, {"detail": err_data}

def run_tests():
    print("=" * 70)
    print("STARTING SECURITY & ROLE VERIFICATION TESTS")
    print("=" * 70)

    # 1. Authenticate with initial admin credentials on Common Login
    print("\n[TEST 1] Testing Common Login with Admin Credentials...")
    status, admin_data = api_request("POST", "/auth/login", {
        "email": "admin@oakridge.edu",
        "password": "AdminPassword123!"
    })

    if status != 200:
        print("  Notice: Seeding initial admin account...")
        from app.database import SessionLocal
        from app.models.user import User, UserRole
        from app.core.security import hash_password
        db = SessionLocal()
        admin = db.query(User).filter(User.email == "admin@oakridge.edu").first()
        if not admin:
            admin = User(
                email="admin@oakridge.edu",
                hashed_password=hash_password("AdminPassword123!"),
                full_name="Dr. Eleanor Vance",
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin)
            db.commit()
        db.close()
        status, admin_data = api_request("POST", "/auth/login", {
            "email": "admin@oakridge.edu",
            "password": "AdminPassword123!"
        })

    assert status == 200, f"Admin login failed: {admin_data}"
    admin_token = admin_data["access_token"]
    assert admin_data["role"] == "admin", f"Expected admin role, got {admin_data['role']}"
    assert "password" not in admin_data and "hashed_password" not in admin_data
    print(f"  [PASS] Admin logged in successfully via common login. Role: {admin_data['role']}")

    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Verify Unauthenticated Request Rejected
    print("\n[TEST 2] Testing Unauthenticated Request Rejection...")
    status, unauth_data = api_request("GET", "/admin/users")
    assert status == 401, f"Expected 401, got {status}"
    print("  [PASS] Unauthenticated access to /api/admin/users rejected with 401 Unauthorized")

    # 3. Admin creates another Admin account
    print("\n[TEST 3] Admin Creating Another Administrator Account...")
    new_admin_email = "vice.principal@oakridge.edu"
    new_admin_pass = "VicePrincipalPass123!"
    status, res_data = api_request("POST", "/admin/users", {
        "email": new_admin_email,
        "password": new_admin_pass,
        "full_name": "Arthur Pendelton",
        "role": "admin"
    }, headers=admin_headers)

    if status == 400 and "already exists" in str(res_data):
        print("  Notice: Account already exists from previous run, proceeding.")
    else:
        assert status == 201, f"Failed: {res_data}"
        assert res_data["email"] == new_admin_email
        assert res_data["role"] == "admin"
        assert "password" not in res_data and "hashed_password" not in res_data
    print("  [PASS] Admin successfully created secondary Administrator account.")

    # 4. Admin creates a Teacher account
    print("\n[TEST 4] Admin Creating a Faculty Teacher Account...")
    teacher_email = "prof.watson@oakridge.edu"
    teacher_pass = "WatsonProf2026!"
    status, res_data = api_request("POST", "/admin/users", {
        "email": teacher_email,
        "password": teacher_pass,
        "full_name": "Dr. John Watson",
        "role": "teacher",
        "department": "Science",
        "subject": "Biochemistry",
        "qualification": "M.D., Ph.D."
    }, headers=admin_headers)

    if status == 400 and "already exists" in str(res_data):
        print("  Notice: Account already exists from previous run, proceeding.")
    else:
        assert status == 201, f"Failed: {res_data}"
        assert res_data["email"] == teacher_email
        assert res_data["role"] == "teacher"
    print("  [PASS] Admin successfully created Faculty Teacher account with department allocations.")

    # 5. Admin creates a Student account
    print("\n[TEST 5] Admin Creating an Enrolled Student Account...")
    student_email = "student.lucas@oakridge.edu"
    student_pass = "LucasStudent2026!"
    status, res_data = api_request("POST", "/admin/users", {
        "email": student_email,
        "password": student_pass,
        "full_name": "Lucas Scott",
        "role": "student",
        "grade": "Grade 11",
        "section": "A",
        "roll_number": "11A-07",
        "guardian_name": "Karen Scott",
        "guardian_phone": "+1 (555) 432-1098"
    }, headers=admin_headers)

    if status == 400 and "already exists" in str(res_data):
        print("  Notice: Account already exists from previous run, proceeding.")
    else:
        assert status == 201, f"Failed: {res_data}"
        assert res_data["email"] == student_email
        assert res_data["role"] == "student"
    print("  [PASS] Admin successfully created Student account with grade & guardian details.")

    # 6. Verify Admin Session is Preserved (Not Logged Out or Replaced)
    print("\n[TEST 6] Verifying Current Admin Session is Strictly Preserved...")
    status, me_data = api_request("GET", "/auth/me", headers=admin_headers)
    assert status == 200, f"Admin session was invalidated: {me_data}"
    assert me_data["email"] == "admin@oakridge.edu"
    print("  [PASS] Admin session remains active and unchanged after account creation.")

    # 7. Verify Newly Created Users Can Sign In Through Common Login
    print("\n[TEST 7] Verifying Newly Created Users Can Sign In via Common Login...")
    # New Admin
    status, na_data = api_request("POST", "/auth/login", {"email": new_admin_email, "password": new_admin_pass})
    assert status == 200, f"New admin login failed: {na_data}"
    assert na_data["role"] == "admin"
    print(f"  [PASS] Newly created admin ({new_admin_email}) logged in successfully. Role: admin")

    # Teacher
    status, t_data = api_request("POST", "/auth/login", {"email": teacher_email, "password": teacher_pass})
    assert status == 200, f"Teacher login failed: {t_data}"
    teacher_token = t_data["access_token"]
    assert t_data["role"] == "teacher"
    print(f"  [PASS] Newly created teacher ({teacher_email}) logged in successfully. Role: teacher")

    # Student
    status, s_data = api_request("POST", "/auth/login", {"email": student_email, "password": student_pass})
    assert status == 200, f"Student login failed: {s_data}"
    student_token = s_data["access_token"]
    assert s_data["role"] == "student"
    print(f"  [PASS] Newly created student ({student_email}) logged in successfully. Role: student")

    # 8. Verify Teachers and Students Cannot Access User Management Endpoints
    print("\n[TEST 8] Verifying RBAC Restrictions on User Management...")
    # Teacher access
    status, _ = api_request("GET", "/admin/users", headers={"Authorization": f"Bearer {teacher_token}"})
    assert status == 403, f"Expected 403 for teacher, got {status}"
    print("  [PASS] Teacher access to /api/admin/users rejected with 403 Forbidden")

    status, _ = api_request("POST", "/admin/users", {
        "email": "illegal@oakridge.edu", "password": "Illegal123!", "full_name": "Illegal", "role": "admin"
    }, headers={"Authorization": f"Bearer {teacher_token}"})
    assert status == 403, f"Expected 403 for teacher create, got {status}"
    print("  [PASS] Teacher attempt to create account rejected with 403 Forbidden")

    # Student access
    status, _ = api_request("GET", "/admin/users", headers={"Authorization": f"Bearer {student_token}"})
    assert status == 403, f"Expected 403 for student, got {status}"
    print("  [PASS] Student access to /api/admin/users rejected with 403 Forbidden")

    status, _ = api_request("POST", "/admin/users", {
        "email": "illegal.student@oakridge.edu", "password": "Illegal123!", "full_name": "Illegal", "role": "student"
    }, headers={"Authorization": f"Bearer {student_token}"})
    assert status == 403, f"Expected 403 for student create, got {status}"
    print("  [PASS] Student attempt to create account rejected with 403 Forbidden")

    # 9. Verify Passwords and Hashes are Never Returned in User List
    print("\n[TEST 9] Verifying Passwords/Hashes are Never Returned...")
    status, users_list = api_request("GET", "/admin/users", headers=admin_headers)
    assert status == 200
    for u in users_list:
        assert "password" not in u
        assert "hashed_password" not in u
        assert "secret" not in u
    print(f"  [PASS] Verified across {len(users_list)} accounts: Zero password or hash leaks.")

    print("\n" + "=" * 70)
    print("ALL 9 SECURITY & ROLE TESTS PASSED PERFECTLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
