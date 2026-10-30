import urllib.request
import json

creds = [
    ("admin@oakridge.edu", "AdminPassword123!", "admin"),
    ("e.vance@oakridge.edu", "TeacherSecure123!", "teacher"),
    ("maya.lin@oakridge.edu", "StudentSecure123!", "student"),
]

for email, pw, expected_role in creds:
    payload = json.dumps({"email": email, "password": pw}).encode("utf-8")
    req = urllib.request.Request(
        "http://localhost:8000/api/auth/login",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print(f"PASS: {email} -> Role: {data['role']} | Name: {data['full_name']}")
        assert data["role"] == expected_role

print("\nALL LOGIN CREDENTIALS VERIFIED AGAINST LIVE SERVER!")

