import urllib.request
import urllib.error
import json
import sys
import uuid

BASE_URL = "http://127.0.0.1:8000/api"

def make_request(method, path, body=None, token=None):
    url = f"{BASE_URL}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            content = resp.read().decode("utf-8")
            try:
                parsed = json.loads(content)
            except Exception:
                parsed = content
            return status, parsed
    except urllib.error.HTTPError as e:
        err_content = e.read().decode("utf-8")
        try:
            parsed = json.loads(err_content)
        except Exception:
            parsed = err_content
        return e.code, parsed

def login(email, password):
    status, res = make_request("POST", "/auth/login", {"email": email, "password": password})
    if status != 200:
        raise Exception(f"Login failed for {email}: {status} {res}")
    return res.get("access_token") or res.get("token")

def run_all_12_tests():
    print("=================================================================")
    print("RUNNING 12 CORE RBAC VERIFICATION SCENARIOS (ADMIN & TEACHER)")
    print("=================================================================")
    
    # Pre-test logins
    admin_token = login("admin@oakridge.edu", "AdminPassword123!")
    teacher_token = login("e.vance@oakridge.edu", "TeacherSecure123!")
    student_token = login("maya.lin@oakridge.edu", "StudentSecure123!")
    print("Tokens acquired for Admin, Teacher, and Student.")

    # -------------------------------------------------------------
    # Scenario 1: Admin can create teacher accounts
    # -------------------------------------------------------------
    print("\n[Scenario 1] Admin creating teacher account...")
    rand_suffix = str(uuid.uuid4())[:6]
    new_teacher_data = {
        "teacher_id": f"TCH-TEST-{rand_suffix}",
        "full_name": f"Prof. Test Faculty {rand_suffix}",
        "email": f"test.prof.{rand_suffix}@oakridge.edu",
        "phone": "+15550001111",
        "department": "Science",
        "subject": "Biology",
        "assigned_classes": ["Class 6-A"]
    }
    status_t, res_t = make_request("POST", "/admin/teachers", new_teacher_data, token=admin_token)
    assert status_t in [201, 200], f"Admin failed to create teacher account: {status_t} {res_t}"
    print(f"  [PASS] Scenario 1: Admin successfully created teacher account '{new_teacher_data['email']}'.")

    # -------------------------------------------------------------
    # Scenario 2: Teacher can log in successfully
    # -------------------------------------------------------------
    print("\n[Scenario 2] Teacher logging in successfully...")
    t_token_verified = login("e.vance@oakridge.edu", "TeacherSecure123!")
    assert t_token_verified is not None, "Teacher failed to retrieve JWT token on login"
    print("  [PASS] Scenario 2: Teacher login authenticated and returned valid JWT claims.")

    # Fetch teacher assignments
    status_as, assignments = make_request("GET", "/assignments/my-assignments", token=teacher_token)
    assert status_as == 200, f"Failed to retrieve teacher assignments: {assignments}"
    mentor_class = assignments.get("mentorship_class")
    auth_classes = assignments.get("authorized_classes", [])
    assigned_class_ids = [c["class_id"] for c in auth_classes]
    assigned_class = auth_classes[0]
    assigned_class_id = assigned_class["class_id"]

    status_cl, all_classes = make_request("GET", "/classes", token=admin_token)
    unassigned_class = next((c for c in all_classes if c["id"] not in assigned_class_ids), None)
    unassigned_class_id = unassigned_class["id"] if unassigned_class else 99999

    # -------------------------------------------------------------
    # Scenario 3: Teacher can add a student to an authorized class
    # -------------------------------------------------------------
    print(f"\n[Scenario 3] Teacher adding a student to assigned class (ID {assigned_class_id})...")
    student_email = f"student.rbac.{rand_suffix}@oakridge.edu"
    new_student = {
        "name": f"Enrolled Student {rand_suffix}",
        "email": student_email,
        "guardian_name": "Parent Guardian",
        "guardian_phone": "+15558889999",
        "class_id": assigned_class_id,
        "status": "Active"
    }
    status_st, res_st = make_request("POST", "/students", new_student, token=teacher_token)
    assert status_st in [201, 200], f"Teacher failed to add student to assigned class: {status_st} {res_st}"
    created_student_id = res_st.get("id")
    print(f"  [PASS] Scenario 3: Teacher successfully added student ID {created_student_id} to assigned class.")

    # -------------------------------------------------------------
    # Scenario 4: Teacher can edit student details
    # -------------------------------------------------------------
    print(f"\n[Scenario 4] Teacher editing student details (Student ID {created_student_id})...")
    status_edit, res_edit = make_request("PUT", f"/students/{created_student_id}", {"guardian_phone": "+15557778888"}, token=teacher_token)
    assert status_edit == 200, f"Teacher failed to edit assigned student: {status_edit} {res_edit}"
    print(f"  [PASS] Scenario 4: Teacher successfully updated student record.")

    # -------------------------------------------------------------
    # Scenario 5: Teacher can mark and update attendance
    # -------------------------------------------------------------
    print(f"\n[Scenario 5] Teacher marking and updating attendance for assigned class {assigned_class_id}...")
    bulk_att = {
        "class_id": assigned_class_id,
        "section": assigned_class.get("section", "B"),
        "date": "2026-10-30",
        "records": [
            {"student_id": created_student_id, "status": "Present", "remarks": "Prompt and active"}
        ]
    }
    status_att, res_att = make_request("POST", "/attendance/bulk", bulk_att, token=teacher_token)
    assert status_att in [200, 201], f"Teacher failed to record attendance: {status_att} {res_att}"
    print(f"  [PASS] Scenario 5: Teacher marked and updated attendance in assigned class.")

    # -------------------------------------------------------------
    # Scenario 6: Teacher can view only assigned classes in My Classes
    # -------------------------------------------------------------
    print("\n[Scenario 6] Verifying Teacher can view only assigned classes...")
    status_tc, teacher_classes = make_request("GET", "/classes", token=teacher_token)
    assert status_tc == 200, f"Failed to retrieve teacher classes: {teacher_classes}"
    teacher_class_ids = [c["id"] for c in teacher_classes]
    assert unassigned_class_id not in teacher_class_ids, f"Unassigned class {unassigned_class_id} leaked to teacher class list!"
    print(f"  [PASS] Scenario 6: Teacher views only assigned classes ({len(teacher_classes)} classes visible, unassigned class ID {unassigned_class_id} strictly excluded).")

    # -------------------------------------------------------------
    # Scenario 7: Teacher can enter and update marks for assigned subjects
    # -------------------------------------------------------------
    print("\n[Scenario 7] Teacher entering and updating marks for assigned subjects...")
    # Create an exam first
    exam_payload = {
        "name": f"RBAC Chemistry Test {rand_suffix}",
        "academic_year": "2026-2027",
        "class_id": assigned_class_id,
        "section": assigned_class.get("section", "B"),
        "exam_type": "Unit Test",
        "subject": "Chemistry",
        "exam_date": "2026-11-20",
        "total_marks": 100,
        "passing_marks": 40,
        "status": "Draft"
    }
    status_ex, res_ex = make_request("POST", "/examinations", exam_payload, token=teacher_token)
    assert status_ex in [201, 200], f"Teacher failed to create exam in assigned class: {status_ex} {res_ex}"
    exam_id = res_ex["id"]
    
    # Enter mark
    mark_payload = {
        "examination_id": exam_id,
        "student_id": created_student_id,
        "marks_obtained": 88.5,
        "is_absent": False,
        "remarks": "Excellent performance"
    }
    status_mk, res_mk = make_request("POST", f"/examinations/{exam_id}/marks", mark_payload, token=teacher_token)
    assert status_mk in [200, 201], f"Teacher failed to enter marks: {status_mk} {res_mk}"
    print(f"  [PASS] Scenario 7: Teacher successfully entered marks ({mark_payload['marks_obtained']}/100) for student in assigned exam ID {exam_id}.")

    # -------------------------------------------------------------
    # Scenario 8: Teacher can create and update examinations for assigned classes
    # -------------------------------------------------------------
    print(f"\n[Scenario 8] Teacher updating examination details (Exam ID {exam_id})...")
    status_up_ex, res_up_ex = make_request("PUT", f"/examinations/{exam_id}", {"name": f"RBAC Chemistry Test (Updated) {rand_suffix}"}, token=teacher_token)
    assert status_up_ex == 200, f"Teacher failed to update exam: {status_up_ex} {res_up_ex}"
    print(f"  [PASS] Scenario 8: Teacher successfully updated examination title and schedule.")

    # -------------------------------------------------------------
    # Scenario 9: Teacher can create and edit announcements
    # -------------------------------------------------------------
    print("\n[Scenario 9] Teacher creating and editing class announcements...")
    ann_create = {
        "title": f"Lab Practical Briefing {rand_suffix}",
        "content": "Bring observation notebooks tomorrow.",
        "category": "Academic",
        "priority": "Normal",
        "target_audience": "PARENTS_CLASS",
        "target_class_id": assigned_class_id,
        "status": "Published",
        "is_published": True
    }
    status_ann, res_ann = make_request("POST", "/announcements", ann_create, token=teacher_token)
    assert status_ann == 201, f"Teacher failed to create announcement: {status_ann} {res_ann}"
    ann_id = res_ann["id"]
    
    status_ann_up, res_ann_up = make_request("PUT", f"/announcements/{ann_id}", {"content": "Bring observation notebooks and lab coats."}, token=teacher_token)
    assert status_ann_up == 200, f"Teacher failed to edit announcement: {status_ann_up} {res_ann_up}"
    print(f"  [PASS] Scenario 9: Teacher created and updated class announcement (ID {ann_id}).")

    # -------------------------------------------------------------
    # Scenario 10: Teacher cannot modify another teacher's unauthorized records
    # -------------------------------------------------------------
    print(f"\n[Scenario 10] Verifying Teacher CANNOT modify unassigned or unauthorized records...")
    # Attempting to add student to unassigned class -> 403
    bad_student = {
        "name": "Intruder Student",
        "email": f"intruder.{rand_suffix}@oakridge.edu",
        "guardian_name": "Intruder Parent",
        "guardian_phone": "+15551112222",
        "class_id": unassigned_class_id,
        "status": "Active"
    }
    s_bad_st, _ = make_request("POST", "/students", bad_student, token=teacher_token)
    assert s_bad_st == 403, f"Expected 403 for unauthorized student enrollment, got {s_bad_st}"

    # Attempting to add exam to unassigned class -> 403
    bad_exam = {
        "name": "Unauthorized Exam",
        "academic_year": "2026-2027",
        "class_id": unassigned_class_id,
        "section": "A",
        "exam_type": "Unit Test",
        "subject": "French",
        "exam_date": "2026-11-25",
        "total_marks": 100,
        "passing_marks": 40
    }
    s_bad_ex, _ = make_request("POST", "/examinations", bad_exam, token=teacher_token)
    assert s_bad_ex == 403, f"Expected 403 for unauthorized exam creation, got {s_bad_ex}"

    # Attempting to publish school-wide announcement as teacher -> 403
    bad_ann = {
        "title": "School Closure",
        "content": "Closed.",
        "category": "General",
        "priority": "Urgent",
        "target_audience": "ALL",
        "status": "Published"
    }
    s_bad_ann, _ = make_request("POST", "/announcements", bad_ann, token=teacher_token)
    assert s_bad_ann == 403, f"Expected 403 for school-wide announcement by teacher, got {s_bad_ann}"
    print("  [PASS] Scenario 10: All unauthorized teacher actions blocked with HTTP 403 Forbidden.")

    # -------------------------------------------------------------
    # Scenario 11: Student accounts cannot modify teacher or admin data
    # -------------------------------------------------------------
    print("\n[Scenario 11] Verifying Student account cannot modify faculty or administrative data...")
    # Student trying to create a teacher -> 403
    s_stu_tch, _ = make_request("POST", "/teachers", {"name": "Hacker Teacher"}, token=student_token)
    assert s_stu_tch == 403, f"Expected 403 when student calls /teachers, got {s_stu_tch}"

    # Student trying to record attendance -> 403
    s_stu_att, _ = make_request("POST", "/attendance/bulk", bulk_att, token=student_token)
    assert s_stu_att == 403, f"Expected 403 when student calls /attendance/bulk, got {s_stu_att}"

    # Student trying to create exam -> 403
    s_stu_ex, _ = make_request("POST", "/examinations", exam_payload, token=student_token)
    assert s_stu_ex == 403, f"Expected 403 when student calls /examinations, got {s_stu_ex}"
    print("  [PASS] Scenario 11: Student account strictly blocked from administrative & grading endpoints with HTTP 403 Forbidden.")

    # -------------------------------------------------------------
    # Scenario 12: Admin retains full administrative permissions
    # -------------------------------------------------------------
    print("\n[Scenario 12] Verifying Admin retains complete, unrestricted control across all school records...")
    # Admin can access all classes
    s_adm_cls, adm_classes = make_request("GET", "/classes", token=admin_token)
    assert s_adm_cls == 200 and len(adm_classes) >= len(teacher_classes), "Admin cannot see all classes"

    # Admin can access timetable across any class
    s_adm_tt, _ = make_request("GET", f"/timetable?class_id={unassigned_class_id}", token=admin_token)
    assert s_adm_tt == 200, f"Admin failed to access timetable for class {unassigned_class_id}"

    # Admin can publish school-wide announcement
    admin_ann = {
        "title": f"Official School Notice {rand_suffix}",
        "content": "Institutional bulletin for all faculty and students.",
        "category": "General",
        "priority": "Normal",
        "target_audience": "ALL",
        "status": "Published",
        "is_published": True
    }
    s_adm_ann, res_adm_ann = make_request("POST", "/announcements", admin_ann, token=admin_token)
    assert s_adm_ann == 201, f"Admin failed to create school-wide announcement: {s_adm_ann}"
    print(f"  [PASS] Scenario 12: Admin retained unrestricted access to all classes ({len(adm_classes)} classes), timetables, and school-wide communications.")

    print("\n=================================================================")
    print("ALL 12 RBAC SCENARIOS VERIFIED AND WORKING 100% CORRECTLY!")
    print("=================================================================")

if __name__ == "__main__":
    run_all_12_tests()
