import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.database import SessionLocal
from app.models.user import User
from app.models.student import Student

client = TestClient(app)

@pytest.fixture(scope="module")
def db():
    session = SessionLocal()
    yield session
    session.close()

def make_auth_header(email: str, db_session) -> dict:
    user = db_session.query(User).filter(User.email == email).first()
    assert user is not None, f"User {email} not found in database"
    token = create_access_token({
        "sub": user.email,
        "user_id": user.id,
        "role": user.role.value if hasattr(user.role, "value") else str(user.role)
    })
    return {"Authorization": f"Bearer {token}"}

class TestReportCardPermissions:

    def test_admin_can_access_student_18_report_card(self, db):
        headers = make_auth_header("admin@oakridge.edu", db)
        response = client.get("/api/examinations/student/18/report-card", headers=headers)
        assert response.status_code == 200, response.text
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        card = data[0]
        assert card["student_id"] == 18
        assert card["student_name"] == "NAUSHEEN"

    def test_student_18_can_access_own_report_card(self, db):
        headers = make_auth_header("nausheen.stu7493@oakridge.edu", db)
        response = client.get("/api/examinations/student/18/report-card", headers=headers)
        assert response.status_code == 200, response.text
        data = response.json()
        assert len(data) >= 1
        card = data[0]
        assert card["student_id"] == 18
        # Ensure draft exam subject is NOT leaked
        subject_names = [s["subject"] for s in card["subjects"]]
        assert "Advanced Robotics (Draft)" not in subject_names
        assert "Mathematics" in subject_names
        assert "English Language" in subject_names

    def test_other_student_tampering_rejected_with_403(self, db):
        # Maya Lin (student 2) attempting to access student 18 report card
        headers = make_auth_header("maya.lin@oakridge.edu", db)
        response = client.get("/api/examinations/student/18/report-card", headers=headers)
        assert response.status_code == 403
        assert "Students can only view their own academic report card" in response.json()["detail"]

    def test_verified_parent_can_access_child_report_card(self, db):
        # Dr. Tariq Nausheen is verified parent for Student 18
        headers = make_auth_header("parent.nausheen@oakridge.edu", db)
        response = client.get("/api/examinations/student/18/report-card", headers=headers)
        assert response.status_code == 200, response.text
        data = response.json()
        assert len(data) >= 1
        card = data[0]
        assert card["student_id"] == 18
        # Ensure draft exam subject is NOT leaked to parent
        subject_names = [s["subject"] for s in card["subjects"]]
        assert "Advanced Robotics (Draft)" not in subject_names
        assert "Mathematics" in subject_names

    def test_unlinked_parent_rejected_with_403(self, db):
        # Parent Chen is NOT linked to Student 18
        headers = make_auth_header("parent.chen@oakridge.edu", db)
        response = client.get("/api/examinations/student/18/report-card", headers=headers)
        assert response.status_code == 403
        assert "Parents can only view report cards for verified linked children" in response.json()["detail"]

    def test_assigned_teacher_can_access_student_report_card(self, db):
        # Dr. Eleanor Vance is class teacher of Class 2 (Student 18's class)
        headers = make_auth_header("e.vance@oakridge.edu", db)
        response = client.get("/api/examinations/student/18/report-card", headers=headers)
        assert response.status_code == 200, response.text
        data = response.json()
        assert len(data) >= 1
        assert data[0]["student_id"] == 18

    def test_unauthorized_teacher_rejected_with_403(self, db):
        # Prof. Watson teaches Class 1, NOT Class 2
        headers = make_auth_header("prof.watson@oakridge.edu", db)
        response = client.get("/api/examinations/student/18/report-card", headers=headers)
        assert response.status_code == 403
        assert "Faculty can only access report cards for students in their assigned classes" in response.json()["detail"]

    def test_missing_token_rejected_with_401(self):
        response = client.get("/api/examinations/student/18/report-card")
        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]

    def test_invalid_token_rejected_with_401(self):
        headers = {"Authorization": "Bearer invalid.token.value"}
        response = client.get("/api/examinations/student/18/report-card", headers=headers)
        assert response.status_code == 401

    def test_non_existent_student_returns_404(self, db):
        headers = make_auth_header("admin@oakridge.edu", db)
        response = client.get("/api/examinations/student/99999/report-card", headers=headers)
        assert response.status_code == 404
        assert "Student not found" in response.json()["detail"]

