"""
Database migration script to add missing columns.
Run this once to update the database schema.
"""
import os
from sqlalchemy import create_engine, text

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./srs_vocab.db")

# Railway uses postgres:// but SQLAlchemy requires postgresql://
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(SQLALCHEMY_DATABASE_URL)

def migrate():
    """Add missing columns to the cards table."""
    with engine.connect() as conn:
        # Check if synonyms column exists
        try:
            conn.execute(text("SELECT synonyms FROM cards LIMIT 1"))
            print("Column 'synonyms' already exists")
        except Exception:
            print("Adding 'synonyms' column...")
            conn.execute(text("ALTER TABLE cards ADD COLUMN synonyms JSON"))
            conn.commit()
            print("Added 'synonyms' column")
        
        # Check if examples column exists
        try:
            conn.execute(text("SELECT examples FROM cards LIMIT 1"))
            print("Column 'examples' already exists")
        except Exception:
            print("Adding 'examples' column...")
            conn.execute(text("ALTER TABLE cards ADD COLUMN examples JSON"))
            conn.commit()
            print("Added 'examples' column")

if __name__ == "__main__":
    migrate()
    print("Migration complete!")
