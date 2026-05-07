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
    """Add missing columns to cards/folders tables."""
    inspector = inspect(engine)
    
    # Check if cards table exists
    if 'cards' not in inspector.get_table_names():
        print("Cards table doesn't exist yet, skipping migration")
        return
    
    # Get existing card columns
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

        # Add is_starred column if missing
        if 'is_starred' not in existing_columns:
            print("Adding 'is_starred' column...")
            if engine.dialect.name == "postgresql":
                conn.execute(text("ALTER TABLE cards ADD COLUMN is_starred BOOLEAN NOT NULL DEFAULT FALSE"))
            else:
                conn.execute(text("ALTER TABLE cards ADD COLUMN is_starred INTEGER NOT NULL DEFAULT 0"))
            conn.commit()
            print("Added 'is_starred' column")
        else:
            print("Column 'is_starred' already exists")

    # Folder table migration for nested folders
    if 'folders' in inspector.get_table_names():
        folder_columns = {col['name'] for col in inspector.get_columns('folders')}
        print(f"Existing columns in folders table: {folder_columns}")
        with engine.connect() as conn:
            if 'parent_folder_id' not in folder_columns:
                print("Adding 'parent_folder_id' column to folders...")
                if engine.dialect.name == "postgresql":
                    conn.execute(text("ALTER TABLE folders ADD COLUMN parent_folder_id INTEGER REFERENCES folders(id)"))
                else:
                    conn.execute(text("ALTER TABLE folders ADD COLUMN parent_folder_id INTEGER REFERENCES folders(id)"))
                conn.commit()
                print("Added 'parent_folder_id' column")
            else:
                print("Column 'parent_folder_id' already exists")

    # Deck table migration for sorting support
    if 'decks' in inspector.get_table_names():
        deck_columns = {col['name'] for col in inspector.get_columns('decks')}
        print(f"Existing columns in decks table: {deck_columns}")
        with engine.connect() as conn:
            if 'updated_at' not in deck_columns:
                print("Adding 'updated_at' column to decks...")
                if engine.dialect.name == "postgresql":
                    conn.execute(text("ALTER TABLE decks ADD COLUMN updated_at TIMESTAMP"))
                    conn.execute(text("UPDATE decks SET updated_at = created_at WHERE updated_at IS NULL"))
                else:
                    conn.execute(text("ALTER TABLE decks ADD COLUMN updated_at DATETIME"))
                    conn.execute(text("UPDATE decks SET updated_at = created_at WHERE updated_at IS NULL"))
                conn.commit()
                print("Added 'updated_at' column")
            else:
                print("Column 'updated_at' already exists")

if __name__ == "__main__":
    migrate()
    print("Migration complete!")
