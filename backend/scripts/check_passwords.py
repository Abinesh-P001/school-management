import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.user import User
from app.core.security import verify_password

db = SessionLocal()
users = db.query(User).all()

test_passwords = [
    "AdminPassword123!",
    "TeacherPass123!",
    "TeacherSecure123!",
    "StudentSecure123!",
    "Password123!",
    "admin123",
    "password",
    "Secret123!"
]

for u in users:
    matches = [p for p in test_passwords if verify_password(p, u.hashed_password)]
    print(f"User: {u.email} ({u.role}) -> Matched: {matches}")

