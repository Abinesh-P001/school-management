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

# 2. Test GET /api/examinations/marks
req = urllib.request.Request("http://localhost:8000/api/examinations/marks", headers=headers)
with urllib.request.urlopen(req) as resp:
    marks = json.loads(resp.read().decode())
    print(f"2. GET /api/examinations/marks returned {len(marks)} marks.")

# 3. Test Search by Subject or Student
req = urllib.request.Request("http://localhost:8000/api/examinations/marks?search=Physics", headers=headers)
with urllib.request.urlopen(req) as resp:
    filtered = json.loads(resp.read().decode())
    print(f"3. GET /api/examinations/marks?search=Physics returned {len(filtered)} results.")

print("\nALL LIVE SEARCH ENDPOINTS WORKING CLEANLY!")

