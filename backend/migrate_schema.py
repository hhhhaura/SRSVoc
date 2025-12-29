"""
Migration script to update the cards table schema.
Adds: synonyms (JSON), examples (JSON)
Removes: chinese_translation, example_sentence (data will be migrated)
"""
import sqlite3
import json
import os

DB_PATH = os.getenv("DATABASE_URL", "sqlite:///./srs_vocab.db")
if DB_PATH.startswith("sqlite:///"):
    DB_PATH = DB_PATH.replace("sqlite:///", "")
    if DB_PATH.startswith("./"):
        DB_PATH = DB_PATH[2:]

def migrate():
    print(f"Migrating database: {DB_PATH}")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check current schema
    cursor.execute("PRAGMA table_info(cards)")
    columns = {row[1]: row[2] for row in cursor.fetchall()}
    print(f"Current columns: {list(columns.keys())}")
    
    # Check if migration is needed
    if 'synonyms' in columns and 'examples' in columns:
        print("Schema already migrated!")
        conn.close()
        return
    
    # Add new columns if they don't exist
    if 'synonyms' not in columns:
        print("Adding 'synonyms' column...")
        cursor.execute("ALTER TABLE cards ADD COLUMN synonyms TEXT")
    
    if 'examples' not in columns:
        print("Adding 'examples' column...")
        cursor.execute("ALTER TABLE cards ADD COLUMN examples TEXT")
    
    # Migrate data from old columns to new format
    if 'example_sentence' in columns:
        print("Migrating existing data to new format...")
        # Check if chinese_translation exists
        has_chinese = 'chinese_translation' in columns
        
        if has_chinese:
            cursor.execute("SELECT id, example_sentence, chinese_translation FROM cards WHERE example_sentence IS NOT NULL")
        else:
            cursor.execute("SELECT id, example_sentence FROM cards WHERE example_sentence IS NOT NULL")
        
        rows = cursor.fetchall()
        
        for row in rows:
            card_id = row[0]
            example_sentence = row[1]
            chinese_translation = row[2] if has_chinese and len(row) > 2 else None
            
            if example_sentence:
                # Convert old format to new examples array
                examples = [{"sentence": example_sentence, "translation": chinese_translation}]
                cursor.execute("UPDATE cards SET examples = ? WHERE id = ?", (json.dumps(examples), card_id))
        
        print(f"Migrated {len(rows)} cards with existing examples")
    
    conn.commit()
    
    # Verify migration
    cursor.execute("PRAGMA table_info(cards)")
    new_columns = {row[1]: row[2] for row in cursor.fetchall()}
    print(f"Updated columns: {list(new_columns.keys())}")
    
    conn.close()
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
