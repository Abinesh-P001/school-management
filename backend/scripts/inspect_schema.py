import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine
from sqlalchemy import inspect

inspector = inspect(engine)
print("Examinations columns:", [c['name'] for c in inspector.get_columns("examinations")])
print("Marks columns:", [c['name'] for c in inspector.get_columns("marks")])
if "grading_rules" in inspector.get_table_names():
    print("Grading rules exists")
if "marks_audit_log" in inspector.get_table_names():
    print("Marks audit log exists")

