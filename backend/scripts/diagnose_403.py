import urllib.request
import urllib.error
import json

def get_token(email, password):
    data = json.dumps({"email": email, "password": password}).encode("utf-8")
    req = urllib.request.Request("http://127.0.0.1:8000/api/auth/login", data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())["access_token"]

def test_endpoint(token, student_id=18):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"http://127.0.0.1:8000/api/examinations/student/{student_id}/report-card", headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            return f"Status {resp.status}: {len(data)} report cards"
    except urllib.error.HTTPError as e:
        return f"Status {e.code}: {e.read().decode()}"
    except Exception as e:
        return f"Error: {e}"

print("1. Admin (admin@oakridge.edu):")
admin_token = get_token("admin@oakridge.edu", "AdminPassword123!")
print("  Result:", test_endpoint(admin_token))

print("\n2. Teacher (e.vance@oakridge.edu):")
teacher_token = get_token("e.vance@oakridge.edu", "TeacherSecure123!")
print("  Result:", test_endpoint(teacher_token))

print("\n3. Student Maya Lin (maya.lin@oakridge.edu) trying student 18:")
maya_token = get_token("maya.lin@oakridge.edu", "StudentSecure123!")
print("  Result:", test_endpoint(maya_token))

print("\n4. Student 18 Nausheen (nausheen.stu7493@oakridge.edu) trying student 18:")
# Check Nausheen password
from app.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password

db = SessionLocal()
u14 = db.query(User).filter(User.id == 14).first()
if u14:
    u14.hashed_password = hash_password("StudentSecure123!")
    db.commit()
db.close()

nausheen_token = get_token("nausheen.stu7493@oakridge.edu", "StudentSecure123!")
print("  Result:", test_endpoint(nausheen_token))

print("\n5. Parent (parent.chen@oakridge.edu):")
parent_token = get_token("parent.chen@oakridge.edu", "ParentSecure123!")
print("  Result:", test_endpoint(parent_token))

print("\n6. Anonymous (no token):")
print("  Result:", test_endpoint(None))

print("\n7. Invalid token:")
print("  Result:", test_endpoint("invalid.jwt.token"))

