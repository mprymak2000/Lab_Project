import csv
import re
import psycopg2
from psycopg2.extras import RealDictCursor
from plasmid_records import Plasmid
import json
from datetime import datetime

# Database connection from inside Docker container
DB_CONFIG = {
    "host": "database",  # Docker service name
    "port": "5432",
    "database": "lab_db",
    "user": "lab_user",
    "password": "lab_pass"
}

CSV_FILE = "/data/CsCl_Inventory.csv"  # Docker volume mount

def create_new_schema():
    """Create new database schema with samples table for metadata"""
    conn = psycopg2.connect(**DB_CONFIG)
    
    try:
        with conn.cursor() as cur:
            print("🗑️  Dropping existing tables...")
            
            # Drop existing tables
            cur.execute("DROP TABLE IF EXISTS samples CASCADE")
            cur.execute("DROP TABLE IF EXISTS plasmids CASCADE")
            
            print("📋 Creating new schema...")
            
            # Create plasmids table (without volume columns)
            cur.execute("""
                CREATE TABLE plasmids (
                    id SERIAL PRIMARY KEY,
                    lot INTEGER NOT NULL,
                    sublot INTEGER NOT NULL,
                    bag VARCHAR(50) NOT NULL,
                    notes TEXT,
                    date_added TIMESTAMP DEFAULT NOW(),
                    UNIQUE(lot, sublot, bag)
                )
            """)
            
            # Create samples table with metadata
            cur.execute("""
                CREATE TABLE samples (
                    id SERIAL PRIMARY KEY,
                    plasmid_id INTEGER NOT NULL REFERENCES plasmids(id) ON DELETE CASCADE,
                    volume DECIMAL(10,1) NOT NULL,
                    date_created TIMESTAMP DEFAULT NOW(),
                    date_modified TIMESTAMP DEFAULT NOW()
                )
            """)
            
            # Create indexes for performance
            cur.execute("CREATE INDEX idx_plasmids_lot_sublot ON plasmids(lot, sublot)")
            cur.execute("CREATE INDEX idx_plasmids_bag ON plasmids(bag)")
            cur.execute("CREATE INDEX idx_samples_plasmid ON samples(plasmid_id)")
            
            conn.commit()
            print("✅ New schema created successfully")
            return True
            
    except Exception as e:
        print(f"❌ Failed to create schema: {e}")
        return False
    finally:
        conn.close()

def parse_volumes(volume1, volumes_str):
    """Parse volume1 and additional volumes from CSV"""
    volumes = []
    
    # Handle primary volume
    if volume1 and str(volume1).strip() not in ('', 'null', 'none'):
        volume1_str = str(volume1).strip()
        # Check if this contains multiple volumes (comma-separated)
        if ',' in volume1_str:
            # Parse as multiple volumes
            volume_parts = [v.strip() for v in volume1_str.split(',') if v.strip()]
            for vol in volume_parts:
                try:
                    volumes.append(float(vol))
                except (ValueError, TypeError):
                    raise ValueError(f"Invalid volume in primary field: {vol}")
        else:
            # Parse as single volume
            try:
                volumes.append(float(volume1_str))
            except (ValueError, TypeError):
                raise ValueError(f"Invalid primary volume: {volume1}")
    
    # Handle additional volumes from second column (if exists and different)
    if volumes_str and str(volumes_str).strip() not in ('', 'null', 'none'):
        additional = [v.strip() for v in re.split(r'[,\s]+', str(volumes_str)) if v.strip()]
        for vol in additional:
            try:
                volumes.append(float(vol))
            except (ValueError, TypeError):
                raise ValueError(f"Invalid additional volume: {vol}")
    
    return volumes

def migrate_csv():
    """Migrate CSV data to new PostgreSQL schema with sample metadata"""
    conn = psycopg2.connect(**DB_CONFIG)
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("BEGIN")
            
            with open(CSV_FILE, newline='') as csvfile:
                reader = csv.DictReader(csvfile)
                
                for i, row in enumerate(reader, 1):
                    try:
                        # Parse and validate data using your cleansed CSV structure
                        volumes = parse_volumes(row.get('Volume(mL)'), row.get('Volumes(mL)'))
                        
                        # Create plasmid object to validate data
                        plasmid = Plasmid(
                            lot=row.get("Lot #"),
                            sublot=row.get("Variant #"),
                            bag=row.get("BAG ID"),
                            volumes=volumes,
                            notes=row.get("Notes", "")
                        )
                        
                        # Insert plasmid record (without volumes)
                        plasmid_query = """
                            INSERT INTO plasmids (lot, sublot, bag, notes, date_added) 
                            VALUES (%s, %s, %s, %s, %s)
                            RETURNING id
                        """
                        # Set date_added to current time for migration
                        cur.execute(plasmid_query, (
                            plasmid.lot, 
                            plasmid.sublot,
                            plasmid.bag,
                            plasmid.notes,
                            datetime.now()
                        ))
                        
                        plasmid_id = cur.fetchone()['id']
                        
                        # Insert each sample with metadata
                        sample_query = """
                            INSERT INTO samples (plasmid_id, volume, date_created, date_modified)
                            VALUES (%s, %s, %s, %s)
                        """
                        
                        migration_time = datetime.now()
                        for sample in plasmid.samples:
                            cur.execute(sample_query, (
                                plasmid_id,
                                sample.volume,
                                migration_time,  # Use migration time as creation time
                                migration_time   # Use migration time as modified time
                            ))
                        
                        print(f"✅ Row {i}: Migrated {plasmid} with {len(plasmid.samples)} samples")
                        
                    except Exception as e:
                        print(f"❌ Row {i}: FAILED - {e}")
                        print(f"   Data: {dict(row)}")
                        cur.execute("ROLLBACK")
                        return False
            
            cur.execute("COMMIT")
            print(f"\n🎯 Migration SUCCESS: {i} plasmid records with samples migrated")
            return True
            
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False
    finally:
        conn.close()

def verify_migration():
    """Verify the migrated data"""
    conn = psycopg2.connect(**DB_CONFIG)
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Count records
            cur.execute("SELECT COUNT(*) as count FROM plasmids")
            plasmid_count = cur.fetchone()['count']
            
            cur.execute("SELECT COUNT(*) as count FROM samples")
            sample_count = cur.fetchone()['count']
            
            print(f"📊 Verification Results:")
            print(f"   Plasmids: {plasmid_count}")
            print(f"   Samples: {sample_count}")
            
            # Show sample data
            cur.execute("""
                SELECT p.lot, p.sublot, p.bag, 
                       COUNT(s.id) as sample_count,
                       ARRAY_AGG(s.volume ORDER BY s.id) as volumes
                FROM plasmids p
                LEFT JOIN samples s ON p.id = s.plasmid_id
                GROUP BY p.id, p.lot, p.sublot, p.bag
                ORDER BY p.lot, p.sublot
                LIMIT 5
            """)
            
            print(f"📋 Sample records:")
            for row in cur.fetchall():
                volumes_str = ', '.join(map(str, row['volumes'] or []))
                print(f"   {row['lot']}-{row['sublot']} in {row['bag']}: {row['sample_count']} samples [{volumes_str}]")
            
    except Exception as e:
        print(f"❌ Verification failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    print("Starting CSV migration to PostgreSQL with sample metadata...")
    
    # Step 1: Create new schema
    if not create_new_schema():
        print("❌ Failed to create schema - aborting migration")
        exit(1)
    
    # Step 2: Migrate CSV data
    success = migrate_csv()
    if not success:
        print("❌ Migration FAILED - fix the error and run again")
        exit(1)
    
    # Step 3: Verify results
    verify_migration()
    print("✅ Migration COMPLETED successfully")