"""
Database migration script to add missing columns.
Run this once to update the database schema.
"""
import os
from sqlalchemy import create_engine, text, inspect

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./srs_vocab.db")

# Railway uses postgres:// but SQLAlchemy requires postgresql://
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(SQLALCHEMY_DATABASE_URL)

def migrate():
    """Add missing columns to the cards table."""
    inspector = inspect(engine)
    
    # Check if cards table exists
    if 'cards' not in inspector.get_table_names():
        print("Cards table doesn't exist yet, skipping migration")
        return
    
    # Get existing columns
    existing_columns = {col['name'] for col in inspector.get_columns('cards')}
    print(f"Existing columns in cards table: {existing_columns}")
    
    with engine.connect() as conn:
        # Add synonyms column if missing
        if 'synonyms' not in existing_columns:
            print("Adding 'synonyms' column...")
            conn.execute(text("ALTER TABLE cards ADD COLUMN synonyms JSON"))
            conn.commit()
            print("Added 'synonyms' column")
        else:
            print("Column 'synonyms' already exists")
        
        # Add examples column if missing
        if 'examples' not in existing_columns:
            print("Adding 'examples' column...")
            conn.execute(text("ALTER TABLE cards ADD COLUMN examples JSON"))
            conn.commit()
            print("Added 'examples' column")
        else:
            print("Column 'examples' already exists")

if __name__ == "__main__":
    migrate()
    print("Migration complete!")
