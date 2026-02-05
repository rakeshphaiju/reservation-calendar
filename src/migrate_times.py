#!/usr/bin/env python3
import asyncio
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.common.db import get_db, AsyncSessionLocal
from sqlalchemy import text

async def add_reservation_columns():
    """Add start_time and end_time columns to reservations table"""
    async with AsyncSessionLocal() as db:
        try:
            # Check if columns exist
            result = await db.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'reservations' 
                AND column_name IN ('start_time', 'end_time')
            """))
            existing_columns = {row[0] for row in result.fetchall()}
            
            print(f"Existing columns: {existing_columns}")
            
            # Add start_time if it doesn't exist
            if 'start_time' not in existing_columns:
                print("Adding start_time column...")
                await db.execute(text("""
                    ALTER TABLE reservations 
                    ADD COLUMN start_time VARCHAR
                """))
                print("✓ Added start_time column")
            
            # Add end_time if it doesn't exist
            if 'end_time' not in existing_columns:
                print("Adding end_time column...")
                await db.execute(text("""
                    ALTER TABLE reservations 
                    ADD COLUMN end_time VARCHAR
                """))
                print("✓ Added end_time column")
            
            await db.commit()
            print("\n✅ Migration complete!")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            await db.rollback()
            sys.exit(1)

if __name__ == "__main__":
    asyncio.run(add_reservation_columns())