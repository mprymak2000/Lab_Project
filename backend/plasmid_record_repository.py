import psycopg2
from psycopg2.extras import RealDictCursor

from plasmid_records import Plasmid, PlasmidCollection


# TODO: think about adding plasmids, letting user decide bag, or auto doing it, or both.
#todo: fix the error handling. partially centralized rn except add and modify

#----------------------------
# Database Connection Layer
#----------------------------

class PlasmidDatabase:
    """Singleton database connection for desktop lab application"""
    _instance = None
    _connection = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    # TODO: don't hard-code database, connection parameters, use environment variables or a config file
    def connect(self):
        """Get or create database connection"""
        if self._connection is None or self._connection.closed:
            import os
            database_url = os.getenv('DATABASE_URL')
            if database_url:
                self._connection = psycopg2.connect(database_url)
            else:
                # Fallback for local development
                self._connection = psycopg2.connect(
                    host="database",  # Docker service name
                    port="5432",
                    database="lab_db",
                    user="lab_user",
                    password="lab_pass"
                )
        return self._connection

    def close(self):
        """Close database connection"""
        if self._connection and not self._connection.closed:
            self._connection.close()

# Global database instance
db = PlasmidDatabase()

def check_database_health():
    """Check if database connection is working"""
    try:
        conn = db.connect()
        with conn.cursor() as cursor:
            # Simple query to test connection
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return True, "Database connection healthy"
    except Exception as e:
        return False, f"Database connection failed: {str(e)}"



#----------------------------
# Repository
#----------------------------


### FIND
#todo: search for lots only
def find_plasmids(lots=None, sublots=None):
    """Find plasmids - all if no params, filtered if lots/sublots provided"""
    query = """
            SELECT p.lot, p.sublot, p.bag, p.notes, p.date_added,
                   COALESCE(
                       JSON_AGG(
                           JSON_BUILD_OBJECT(
                               'volume', s.volume,
                               'date_created', s.date_created,
                               'date_modified', s.date_modified
                           ) ORDER BY s.id
                       ) FILTER (WHERE s.volume IS NOT NULL), 
                       '[]'::JSON
                   ) as samples
            FROM plasmids p
                     LEFT JOIN samples s ON p.id = s.plasmid_id
            """

    if lots and sublots:
        # Handle both single values and lists
        if not isinstance(lots, list):
            lots = [lots]
        if not isinstance(sublots, list):
            sublots = [sublots]
        
        query += " WHERE (p.lot, p.sublot) IN (SELECT UNNEST(%s), UNNEST(%s))"
        params = (lots, sublots)
    else:
        params = None

    query += " GROUP BY p.id, p.lot, p.sublot, p.bag, p.notes, p.date_added ORDER BY p.bag, p.lot, p.sublot"

    results = execute_sql(query, params)
    plasmids = [Plasmid(**result) for result in results]
    
    # Always return PlasmidCollection, even if just one plasmid, for consistency
    return PlasmidCollection(plasmids)

def get_all_plasmids():
    return find_plasmids()

### END FIND

### Delete
def delete_plasmid_record(plasmid):
    """Delete plasmid from database"""
    print(f"Deleting plasmid {plasmid.lot}-{plasmid.sublot} from database")

    # THIS DELETES SAMPLES/VOLUMES AS WELLL VIA SQL CASCADE
    query = "DELETE FROM plasmids WHERE lot = %s AND sublot = %s AND bag = %s"
    params = (plasmid.lot, plasmid.sublot, plasmid.bag)
    
    affected_rows = execute_sql(query, params)
    
    if affected_rows == 0:
        raise ValueError(f"Plasmid {plasmid.lot}-{plasmid.sublot} not found in database")
    
    print(f"SUCCESS: Deleted plasmid {plasmid.lot}-{plasmid.sublot} from database")
    return {'lot': plasmid.lot, 'sublot': plasmid.sublot}
###End Delete

### ADD
def add_plasmid_record(plasmids):
    """Insert plasmid(s) into database - accepts single plasmid or list of plasmids"""
    
    # Handle both single plasmid and list of plasmids
    if not isinstance(plasmids, list):
        plasmids = [plasmids]
    
    if not plasmids:
        raise ValueError("No plasmids provided")
    
    try:
        print(f"Inserting {len(plasmids)} plasmid(s) into database")
        
        # Validate bag numbers for all plasmids before insertion
        for plasmid in plasmids:
            _bag_number_in_range(plasmid.bag)
        
        # Use transaction to insert all plasmids and samples atomically
        operations = []
        
        for i, plasmid in enumerate(plasmids):
            print(f"Processing plasmid {i+1}/{len(plasmids)}: {plasmid.lot}-{plasmid.sublot}")
            print(f"DEBUG: plasmid object: {plasmid}")
            print(f"DEBUG: plasmid.samples: {plasmid.samples}")

            # Get list of volume numbers from SampleCollection
            volumes = plasmid.samples.to_list()
            print(f"DEBUG: volumes list: {volumes}")
            
            # Insert plasmid first
            plasmid_query = """
                INSERT INTO plasmids (lot, sublot, bag, notes, date_added)
                VALUES (%s, %s, %s, %s, NOW())
                RETURNING id
            """
            params = (plasmid.lot, plasmid.sublot, plasmid.bag, plasmid.notes)
            operations.append((plasmid_query, params))
            
            # Insert each sample for this plasmid
            for volume in volumes:
                sample_query = """
                    INSERT INTO samples (plasmid_id, volume, date_created, date_modified)
                    VALUES ((SELECT currval(pg_get_serial_sequence('plasmids','id'))), %s, NOW(), NOW())
                """
                operations.append((sample_query, (volume,)))
        
        # Execute all operations in a single transaction
        results = execute_transaction(operations)
        
        success_msg = f"SUCCESS: Created {len(plasmids)} plasmid(s) in database"
        for plasmid in plasmids:
            volumes = plasmid.samples.to_list()
            success_msg += f"\n  - {plasmid.lot}-{plasmid.sublot} in {plasmid.bag} with {len(volumes)} samples"
        print(success_msg)
        
        return {"inserted_count": len(plasmids), "plasmids": [{"lot": p.lot, "sublot": p.sublot, "bag": p.bag} for p in plasmids]}
        
    except Exception as e:
        error_msg = f"ERROR: Failed to add plasmid(s): {e}"
        if len(plasmids) > 1:
            error_msg += f"\nTransaction rolled back - no records were inserted"
        print(error_msg)
        raise
### END ADD

### MODIFY
def modify_plasmid_record(plasmid):
    """Update plasmid record - change its bag, notes, samples etc."""
    try:
        print(f"Updating plasmid {plasmid.lot}-{plasmid.sublot} in database")

        # Validate bag number to make sure it's within acceptable database range, for move operations
        _bag_number_in_range(plasmid.bag)

        # Get list of volume numbers and sample metadata
        volumes = plasmid.samples.to_list()
        date_created = [sample.date_created for sample in plasmid.samples]
        date_modified = [sample.date_modified for sample in plasmid.samples]

        # Use transaction to update plasmid and replace all samples atomically
        operations = []
        
        # Update plasmid first - MUST include bag in WHERE clause for unique identification
        update_query = """
            UPDATE plasmids 
            SET bag = %s, notes = %s 
            WHERE lot = %s AND sublot = %s AND bag = %s
            RETURNING id
        """
          
        params = (plasmid.bag, plasmid.notes, plasmid.lot, plasmid.sublot, plasmid.bag)
        operations.append((update_query, params))
        
        delete_query = """
            DELETE FROM samples 
            WHERE plasmid_id = (SELECT id FROM plasmids WHERE lot = %s AND sublot = %s AND bag = %s)
        """
        operations.append((delete_query, (plasmid.lot, plasmid.sublot, plasmid.bag)))
        
        # Insert new samples
        for i, volume in enumerate(volumes):
            sample_query = """
                INSERT INTO samples (plasmid_id, volume, date_created, date_modified)
                VALUES ((SELECT id FROM plasmids WHERE lot = %s AND sublot = %s AND bag = %s), %s, %s, %s)
            """
            params = (plasmid.lot, plasmid.sublot, plasmid.bag, volume, date_created[i], date_modified[i])
            operations.append((sample_query, params))
        
        results = execute_transaction(operations)
        
        # Check if plasmid was found (first operation should return a result with RETURNING)
        if not results[0]:
            raise ValueError(f"Plasmid {plasmid.lot}-{plasmid.sublot} not found")
        
        print(f"SUCCESS: Updated plasmid {plasmid.lot}-{plasmid.sublot}")
        return {'lot': plasmid.lot, 'sublot': plasmid.sublot, 'bag': plasmid.bag}
        
    except Exception as e:
        print(f"ERROR: Failed to modify plasmid {plasmid.lot}-{plasmid.sublot}: {e}")
        raise
### END MODIFY

def _bag_number_in_range(bag_name):
    """Validate that bag number is not more than +1 of the highest existing bag"""
    requested_num = int(bag_name[1:])
    
    query = """
            SELECT MAX(CAST(SUBSTRING(bag FROM 2) AS INTEGER)) as max_num
            FROM plasmids 
            WHERE bag ~* '^c[0-9]+$'
        """
    
    result = execute_sql(query)
    if result and result[0]['max_num'] is not None:
        max_existing = result[0]['max_num']
        if requested_num > max_existing + 1:
            raise ValueError(f"Bag number C{requested_num} is not allowed. Please increment bags. Most recent bag number is: C{max_existing}")
    
    return True

##todo: not used - delete
def _generate_bag_number():
    print(f"Generating new bag number")
    """Find the highest bag number and increment"""
    query = """
            SELECT MAX(CAST(SUBSTRING(bag FROM 2) AS INTEGER)) as max_num
            FROM plasmids 
            WHERE bag ~* '^c[0-9]+$'
        """

    result = execute_sql(query)
    if result and result[0]['max_num'] is not None:
        next_num = result[0]['max_num']+1
        print(f"Generated new bag number: C{next_num}")
        return f"C{next_num}"
    else:
        raise ValueError("Something went wrong, no bag numbers found")

#----------------------------
# DB Access Function
#----------------------------


def execute_sql(query, params=None, fetch_one=False):
    """Execute single SQL query with centralized error handling"""
    return execute_transaction([(query, params)])[0] if not fetch_one else execute_transaction([(query, params)], fetch_one=True)[0]

def execute_transaction(operations, fetch_one=False):
    """
    Execute multiple SQL operations in a single transaction with centralized error handling
    
    Args:
        operations: List of (query, params) tuples
        fetch_one: Return single row for SELECT queries
    
    Returns:
        List of results for each operation
    """
    conn = db.connect()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            results = []
            
            for query, params in operations:
                cur.execute(query, params)
                
                # Handle different return types
                if query.strip().upper().startswith('SELECT'):
                    result = cur.fetchone() if fetch_one else cur.fetchall()
                    results.append(result)
                elif 'RETURNING' in query.upper():
                    results.append(cur.fetchone())
                elif query.strip().upper().startswith(('INSERT', 'UPDATE', 'DELETE')):
                    results.append(cur.rowcount)
                else:
                    results.append(None)
            
            conn.commit()
            return results
                
    except psycopg2.IntegrityError as e:
        conn.rollback()
        if "unique" in str(e).lower():
            raise ValueError("Record already exists in this bag - duplicate entry")
        else:
            raise ValueError(f"Data constraint error: {e}")
    except psycopg2.Error as e:
        conn.rollback()
        print(f"ERROR: Database error: {e}")
        raise ValueError(f"Database operation failed: {e}")
    except Exception as e:
        conn.rollback()
        print(f"ERROR: Unexpected error: {e}")
        raise


#----------------------------
# Testing
#----------------------------

if __name__ == "__main__":
    print(f"hello")