import urllib.request
import json

# 1. Login as Admin
payload = json.dumps({"email": "admin@oakridge.edu", "password": "AdminPassword123!"}).encode("utf-8")
req = urllib.request.Request("http://localhost:8000/api/auth/login", data=payload, headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req) as resp:
    admin_auth = json.loads(resp.read().decode())
    token = admin_auth["access_token"]
    print("1. Admin Login Successful. Token acquired.")

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {token}"
}

# 2. Get Class Mentors List
req = urllib.request.Request("http://localhost:8000/api/assignments/classes/mentors", headers=headers)
with urllib.request.urlopen(req) as resp:
    mentors = json.loads(resp.read().decode())
    print(f"2. GET /api/assignments/classes/mentors returned {len(mentors)} classes.")
    for m in mentors[:3]:
        print(f"   - {m['class_name']} Sec {m['section']}: Mentor = {m['mentor_name']} ({m['mentor_email']})")

# 3. Test Teacher Attendance
# Fetch Teachers
req = urllib.request.Request("http://localhost:8000/api/teachers/", headers=headers)
with urllib.request.urlopen(req) as resp:
    teachers = json.loads(resp.read().decode())
    print(f"3. GET /api/teachers/ returned {len(teachers)} teachers.")
    if teachers:
        t = teachers[0]
        # Upsert teacher attendance
        upsert_payload = json.dumps({
            "teacher_id": t["id"],
            "attendance_date": "2026-10-28",
            "status": "Present",
            "remarks": "On time for faculty briefing"
        }).encode("utf-8")
        req = urllib.request.Request("http://localhost:8000/api/teacher-attendance/", data=upsert_payload, headers=headers)
        with urllib.request.urlopen(req) as post_resp:
            res = json.loads(post_resp.read().decode())
            print(f"4. POST /api/teacher-attendance/ successful for teacher {t['id']}: status={res['status']}")

# 4. Teacher Attendance Stats
req = urllib.request.Request("http://localhost:8000/api/teacher-attendance/stats?date=2026-10-28", headers=headers)
with urllib.request.urlopen(req) as resp:
    stats = json.loads(resp.read().decode())
    print(f"5. GET /api/teacher-attendance/stats: total={stats['total_teachers']}, present={stats['present']}, rate={stats['attendance_rate']}%")

# 5. Class Student Attendance Roster
if mentors:
    first_class_id = mentors[0]["class_id"]
    req = urllib.request.Request(f"http://localhost:8000/api/attendance/class-roster?class_id={first_class_id}&date=2026-10-28", headers=headers)
    with urllib.request.urlopen(req) as resp:
        roster_data = json.loads(resp.read().decode())
        print(f"6. GET /api/attendance/class-roster for class {first_class_id}: {len(roster_data['students'])} students returned.")

print("\nALL LIVE API CHECKS FOR MENTORSHIP & SEPARATE ATTENDANCE PASSED!")
