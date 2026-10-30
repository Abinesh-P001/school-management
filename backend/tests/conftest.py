import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.user import User, UserRole
from app.core.security import hash_password, create_access_token

# In-memory SQLite database specifically for automated test suite
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture
def db():
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def create_test_user(db):
    def _create_user(email: str, password: str, full_name: str, role: UserRole):
        user = User(
            email=email,
            hashed_password=hash_password(password),
            full_name=full_name,
            role=role,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    return _create_user

@pytest.fixture
def admin_user(create_test_user):
    return create_test_user("admin.test@oakridge.edu", "AdminSecret123!", "Dr. Admin Test", UserRole.ADMIN)

@pytest.fixture
def teacher_user(create_test_user):
    return create_test_user("teacher.test@oakridge.edu", "TeacherSecret123!", "Prof. Teacher Test", UserRole.TEACHER)

@pytest.fixture
def student_user(create_test_user):
    return create_test_user("student.test@oakridge.edu", "StudentSecret123!", "Student Test", UserRole.STUDENT)

@pytest.fixture
def admin_headers(admin_user):
    token = create_access_token(data={"sub": admin_user.email, "user_id": admin_user.id, "role": "admin"})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def teacher_headers(teacher_user):
    token = create_access_token(data={"sub": teacher_user.email, "user_id": teacher_user.id, "role": "teacher"})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def student_headers(student_user):
    token = create_access_token(data={"sub": student_user.email, "user_id": student_user.id, "role": "student"})
    return {"Authorization": f"Bearer {token}"}
