import urllib.request
import json

# 1. Admin Login
payload = json.dumps({"email": "admin@oakridge.edu", "password": "AdminPassword123!"}).encode("utf-8")
req = urllib.request.Request("http://localhost:8000/api/auth/login", data=payload, headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req) as resp:
    admin_auth = json.loads(resp.read().decode())
    token = admin_auth["access_token"]
    print("1. Admin Login successful.")

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {token}"
}

# 2. Get Classes to find Class 6-A, 6-B, 7-A
req = urllib.request.Request("http://localhost:8000/api/classes/", headers=headers)
with urllib.request.urlopen(req) as resp:
    classes = json.loads(resp.read().decode())
    cls_map = {f"{c['name']} - {c['section']}": c['id'] for c in classes}
    print(f"2. Loaded {len(classes)} classes from API: {list(cls_map.keys())[:5]}")

cls_6a_id = cls_map.get("Class 6 - A")
cls_6b_id = cls_map.get("Class 6 - B")
cls_7a_id = cls_map.get("Class 7 - A")

assert cls_6a_id and cls_6b_id and cls_7a_id, "Required classes not found!"

# 3. Fetch Timetable for Class 6-A
req = urllib.request.Request(f"http://localhost:8000/api/timetable?academic_year=2026-2027&class_id={cls_6a_id}", headers=headers)
with urllib.request.urlopen(req) as resp:
    tt_6a = json.loads(resp.read().decode())
    p1_6a = tt_6a["grid"]["Monday"][0]
    print(f"3. Class 6-A Monday Period 1: {p1_6a['subject']} (Teacher: {p1_6a['teacher_name']})")
    assert p1_6a["subject"] == "Mathematics"

# 4. Fetch Timetable for Class 6-B
req = urllib.request.Request(f"http://localhost:8000/api/timetable?academic_year=2026-2027&class_id={cls_6b_id}", headers=headers)
with urllib.request.urlopen(req) as resp:
    tt_6b = json.loads(resp.read().decode())
    p1_6b = tt_6b["grid"]["Monday"][0]
    print(f"4. Class 6-B Monday Period 1: {p1_6b['subject']} (Teacher: {p1_6b['teacher_name']})")
    assert p1_6b["subject"] == "English"

# 5. Fetch Timetable for Class 7-A
req = urllib.request.Request(f"http://localhost:8000/api/timetable?academic_year=2026-2027&class_id={cls_7a_id}", headers=headers)
with urllib.request.urlopen(req) as resp:
    tt_7a = json.loads(resp.read().decode())
    p1_7a = tt_7a["grid"]["Monday"][0]
    print(f"5. Class 7-A Monday Period 1: {p1_7a['subject']} (Teacher: {p1_7a['teacher_name']})")
    assert p1_7a["subject"] == "Science"

print("\nALL LIVE BACKEND TIMETABLE VERIFICATIONS PASSED!")
