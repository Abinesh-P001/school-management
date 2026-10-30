import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import inspect, text
from app.database import engine, Base, SessionLocal
from app.models.examination import GradingRule

def run_migration():
    print("[MIGRATION] Checking examinations & marks database schema...")
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    # 1. Create any missing tables (like grading_rules, marks_audit_log)
    Base.metadata.create_all(bind=engine)
    print("[OK] Base metadata tables created or verified.")

    # 2. Check and alter examinations table
    with engine.connect() as conn:
        exam_cols = [c["name"] for c in inspector.get_columns("examinations")]
        
        if "academic_year" not in exam_cols:
            print("Adding column academic_year to examinations...")
            conn.execute(text("ALTER TABLE examinations ADD COLUMN academic_year VARCHAR(30) DEFAULT '2026-2027' NOT NULL;"))
            
        if "section" not in exam_cols:
            print("Adding column section to examinations...")
            conn.execute(text("ALTER TABLE examinations ADD COLUMN section VARCHAR(20);"))
            
        if "exam_type" not in exam_cols:
            print("Adding column exam_type to examinations...")
            conn.execute(text("ALTER TABLE examinations ADD COLUMN exam_type VARCHAR(50) DEFAULT 'Term Exam' NOT NULL;"))
            
        if "start_date" not in exam_cols:
            print("Adding column start_date to examinations...")
            conn.execute(text("ALTER TABLE examinations ADD COLUMN start_date DATE;"))
            
        if "end_date" not in exam_cols:
            print("Adding column end_date to examinations...")
            conn.execute(text("ALTER TABLE examinations ADD COLUMN end_date DATE;"))
            
        if "is_locked" not in exam_cols:
            print("Adding column is_locked to examinations...")
            conn.execute(text("ALTER TABLE examinations ADD COLUMN is_locked BOOLEAN DEFAULT 0 NOT NULL;"))
            
        if "published_at" not in exam_cols:
            print("Adding column published_at to examinations...")
            conn.execute(text("ALTER TABLE examinations ADD COLUMN published_at DATETIME;"))
            
        if "created_by" not in exam_cols:
            print("Adding column created_by to examinations...")
            conn.execute(text("ALTER TABLE examinations ADD COLUMN created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;"))
            
        if "updated_at" not in exam_cols:
            print("Adding column updated_at to examinations...")
            conn.execute(text("ALTER TABLE examinations ADD COLUMN updated_at DATETIME;"))

        # 3. Check and alter marks table
        mark_cols = [c["name"] for c in inspector.get_columns("marks")]
        
        if "is_absent" not in mark_cols:
            print("Adding column is_absent to marks...")
            conn.execute(text("ALTER TABLE marks ADD COLUMN is_absent BOOLEAN DEFAULT 0 NOT NULL;"))
            
        if "updated_at" not in mark_cols:
            print("Adding column updated_at to marks...")
            conn.execute(text("ALTER TABLE marks ADD COLUMN updated_at DATETIME;"))
            
        if "updated_by" not in mark_cols:
            print("Adding column updated_by to marks...")
            conn.execute(text("ALTER TABLE marks ADD COLUMN updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL;"))

        conn.commit()

    # 4. Seed default grading rules if empty
    db = SessionLocal()
    try:
        rule_count = db.query(GradingRule).count()
        if rule_count == 0:
            print("Seeding default grading rules...")
            default_rules = [
                GradingRule(grade="A+", min_percentage=90.0, max_percentage=100.0, grade_point=4.0, description="Outstanding", is_passing=True),
                GradingRule(grade="A", min_percentage=80.0, max_percentage=89.99, grade_point=3.7, description="Excellent", is_passing=True),
                GradingRule(grade="B+", min_percentage=70.0, max_percentage=79.99, grade_point=3.3, description="Very Good", is_passing=True),
                GradingRule(grade="B", min_percentage=60.0, max_percentage=69.99, grade_point=3.0, description="Good", is_passing=True),
                GradingRule(grade="C", min_percentage=50.0, max_percentage=59.99, grade_point=2.0, description="Average", is_passing=True),
                GradingRule(grade="D", min_percentage=40.0, max_percentage=49.99, grade_point=1.0, description="Pass", is_passing=True),
                GradingRule(grade="F", min_percentage=0.0, max_percentage=39.99, grade_point=0.0, description="Fail", is_passing=False),
            ]
            db.add_all(default_rules)
            db.commit()
            print("[OK] Seeded 7 default grading rules.")
        else:
            print(f"[OK] {rule_count} grading rules already present.")
    finally:
        db.close()

    print("[SUCCESS] Examinations and marks database migration completed!")

if __name__ == "__main__":
    run_migration()

