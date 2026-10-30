import sys
from pathlib import Path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.database import SessionLocal
from app.models.user import User
from app.core.security import verify_password, hash_password

db = SessionLocal()
users = db.query(User).all()
print("Total users:", len(users))
for u in users:
    print(f"ID: {u.id}, Email: '{u.email}', Role: {u.role}, Active: {u.is_active}")
    if "admin" in u.email:
        print("  Checking passwords for", u.email)
        for pw in ["AdminPassword123!", "admin123", "admin", "AdminSecret123!", "password", "demoPass123!"]:
            matches = verify_password(pw, u.hashed_password)
            print(f"    '{pw}': {matches}")

db.close()

