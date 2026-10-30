# Oakridge School Management System - FastAPI Backend

Modern, secure, high-performance RESTful API built with **Python FastAPI**, **SQLAlchemy ORM**, **Pydantic v2**, and **MySQL**.

---

## 📁 Architecture & Modules

The backend is organized into decoupled modules following Clean Architecture:

```
backend/
├── .env.example              # Environment variables template (no real secrets)
├── .env                      # Local environment configuration
├── requirements.txt          # Python dependencies list
├── pytest.ini                # Pytest configuration
├── scripts/
│   └── setup_db.sql          # Repeatable MySQL database schema & seed administrator
├── app/
│   ├── main.py               # FastAPI application with CORS and route mounting
│   ├── config.py             # Pydantic Settings configuration loader
│   ├── database.py           # SQLAlchemy engine, session maker, connection pool
│   ├── core/
│   │   ├── security.py       # Bcrypt password hashing & JWT token generation
│   │   ├── dependencies.py   # RBAC dependencies (require_admin, require_teacher)
│   │   └── exceptions.py     # Centralized validation & database error handlers
│   ├── models/               # SQLAlchemy Database Models
│   │   ├── user.py           # User accounts & RBAC roles
│   │   ├── student.py        # Student records & guardian details
│   │   ├── teacher.py        # Faculty members & departments
│   │   ├── classroom.py      # Classes, sections, & seat capacity
│   │   ├── attendance.py     # Attendance registers
│   │   ├── examination.py    # Exam schedules & student marks
│   │   └── fee.py            # Fee invoices & payment settlement
│   ├── schemas/              # Pydantic Request & Response Validation
│   └── routers/              # RESTful API Endpoints
│       ├── auth.py           # /api/auth (register, login, me, change-password)
│       ├── students.py       # /api/students (CRUD + search + filters)
│       ├── teachers.py       # /api/teachers (CRUD + department filter)
│       ├── classes.py        # /api/classes (CRUD + roster)
│       ├── attendance.py     # /api/attendance (bulk mark, stats, update)
│       ├── examinations.py   # /api/examinations (schedules, grading, report cards)
│       └── fees.py           # /api/fees (invoicing, record payment, summary)
└── tests/                    # Automated Pytest Suite (31 unit & integration tests)
```

---

## 🪟 Step-by-Step Setup Guide for Windows Beginners

Follow these simple steps in **PowerShell** or **Command Prompt**:

### Step 1: Open PowerShell and Navigate to the Backend Folder
```powershell
cd c:\Users\ACER\school-management\backend
```

### Step 2: Create a Python Virtual Environment
A virtual environment keeps project dependencies isolated from the rest of your Windows system:
```powershell
python -m venv venv
```

### Step 3: Activate the Virtual Environment
Activate the environment so that any `pip` installs go directly into `venv`:
```powershell
.\venv\Scripts\Activate.ps1
```
*(If Windows gives a script execution policy warning, run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` once).*

### Step 4: Install Dependencies
Install all required libraries (`fastapi`, `uvicorn`, `sqlalchemy`, `pymysql`, `pydantic`, `bcrypt`, `pyjwt`, etc.):
```powershell
pip install -r requirements.txt
```

### Step 5: Configure Environment Variables
Copy `.env.example` to create your local `.env` file:
```powershell
Copy-Item .env.example .env
```
Open `.env` in any text editor and configure your MySQL database credentials:
```ini
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=school_management
```

### Step 6: Initialize MySQL Database (Repeatable Script)
Open MySQL Workbench or the MySQL command line, and execute:
```powershell
mysql -u root -p < scripts\setup_db.sql
```
This automatically creates:
- The database `school_management`
- All tables, foreign key constraints, and indexes
- Default admin account: `admin@oakridge.edu` / `AdminPassword123!`

### Step 7: Run Automated Tests
Run the automated test suite to ensure all 7 modules function correctly:
```powershell
pytest -v
```

### Step 8: Start the FastAPI Backend Server
Launch the development server with live reload:
```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Step 9: Open the Interactive Documentation
Once started, open your web browser:
- **Interactive Swagger UI:** [http://127.0.0.1:8000/api/docs](http://127.0.0.1:8000/api/docs)
- **ReDoc Documentation:** [http://127.0.0.1:8000/api/redoc](http://127.0.0.1:8000/api/redoc)

---

## 🔒 Security & Privacy Measures

1. **Password Hashing**: Passwords are never saved in plain text. Passwords use **bcrypt** with a cryptographic salt (work factor: 12 rounds).
2. **JWT Authentication**: Uses signed **HMAC-SHA256** tokens with expiration timestamps.
3. **Role-Based Access Control (RBAC)**:
   - `admin`: Full administrative control (enrollment, faculty workload, financials, classroom setup).
   - `teacher`: Attendance marking, exam scheduling, score entry.
   - `student`: Can only view their own student dossier, report cards, and fee receipts. Students cannot view or tamper with other students' records.
