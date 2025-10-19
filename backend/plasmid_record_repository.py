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


### FIND ###############################

def find_plasmids(plasmid_collection=None, filters=None):
    """Find plasmids - all records if no plasmid_collection, filtered if PlasmidCollection provided

        Args:
            plasmid_collection: Single Plasmid or PlasmidCollection to search for specific records
            filters: Dict containing filter options:
                - 'checked_out': bool - filter by checkout status
                - 'time_filter': str - 'this_month', 'last_6_months', 'last_12_months'
                - 'time_filter_type': str - 'added' (date_added) or 'modified' (sample dates)
                - 'date_range': tuple - (start_date, end_date) for custom date filtering
                - 'bags': list - specific bag names to include
                - 'has_volume': bool - filter by samples with volume > 0
    """
    base_where_conditions = []
    params = []

    # Handle plasmid collection filtering
    if plasmid_collection:
        # Wrap single record
        if isinstance(plasmid_collection, Plasmid):
            plasmid_collection = PlasmidCollection([plasmid_collection])
        lots, sublots = plasmid_collection.get_lots_sublots()
        base_where_conditions.append("(p.lot, p.sublot) IN (SELECT UNNEST(%s), UNNEST(%s))")
        params.extend([lots, sublots])

    # Build additional filter conditions
    filter_conditions, filter_params = _build_filter_conditions(filters)
    base_where_conditions.extend(filter_conditions)
    params.extend(filter_params)

    # Combine all where conditions
    where_clause = " AND ".join(base_where_conditions) if base_where_conditions else None

    return _unified_plasmids_query(where_clause, params if params else None, filters)

def get_all_plasmids():
    return find_plasmids()

def find_plasmids_by_bag(bag_name, filters=None):
    """Find all plasmids in a specific bag"""

    base_conditions = ["UPPER(p.bag) = UPPER(%s)"]
    params = [bag_name]

    # Add additional filter conditions
    filter_conditions, filter_params = _build_filter_conditions(filters)
    base_conditions.extend(filter_conditions)
    params.extend(filter_params)

    where_clause = " AND ".join(base_conditions)
    return _unified_plasmids_query(where_clause, params, filters, "p.lot, p.sublot")

def find_plasmids_by_lot(lot, filters=None):
    """Find all plasmids with a specific lot number (all sublots)"""

    base_conditions = ["p.lot = %s"]
    params = [lot]

    # Add additional filter conditions
    filter_conditions, filter_params = _build_filter_conditions(filters)
    base_conditions.extend(filter_conditions)
    params.extend(filter_params)

    where_clause = " AND ".join(base_conditions)
    return _unified_plasmids_query(where_clause, params, filters, "p.bag, p.sublot")

def _build_filter_conditions(filters):
    """Build WHERE clause conditions and parameters from filter dictionary

    Args:
        filters: Dict containing filter options

    Returns:
        tuple: (list of condition strings, list of parameters)
    """
    if not filters:
        return [], []

    conditions = []
    params = []

    # Checkout status filter
    if 'checked_out' in filters:
        if filters['checked_out']:
            # Only plasmids with at least one checked out sample
            conditions.append("EXISTS (SELECT 1 FROM samples s2 WHERE s2.plasmid_id = p.id AND s2.is_checked_out = true)")
        else:
            # Only plasmids with no checked out samples
            conditions.append("NOT EXISTS (SELECT 1 FROM samples s2 WHERE s2.plasmid_id = p.id AND s2.is_checked_out = true)")

    # Time-based filters
    if 'time_filter' in filters and filters['time_filter'] != 'all':
        time_condition, time_params = _build_time_filter(
            filters['time_filter'],
            filters.get('time_filter_type', 'added')
        )
        if time_condition:
            conditions.append(time_condition)
            params.extend(time_params)

    # Custom date range filter
    if 'date_range' in filters and filters['date_range']:
        start_date, end_date = filters['date_range']
        filter_type = filters.get('time_filter_type', 'added')

        if filter_type == 'added':
            conditions.append("p.date_added BETWEEN %s AND %s")
            params.extend([start_date, end_date])
        else:  # modified - check sample dates
            conditions.append("EXISTS (SELECT 1 FROM samples s2 WHERE s2.plasmid_id = p.id AND s2.date_modified BETWEEN %s AND %s)")
            params.extend([start_date, end_date])

    # Specific bags filter
    if 'bags' in filters and filters['bags']:
        bag_placeholders = ",".join(["%s"] * len(filters['bags']))
        conditions.append(f"UPPER(p.bag) IN ({bag_placeholders})")
        params.extend([bag.upper() for bag in filters['bags']])

    # Volume filter
    if 'has_volume' in filters:
        if filters['has_volume']:
            # Only plasmids with samples that have volume > 0
            conditions.append("EXISTS (SELECT 1 FROM samples s2 WHERE s2.plasmid_id = p.id AND s2.volume > 0)")
        else:
            # Only plasmids with no volume or volume = 0
            conditions.append("NOT EXISTS (SELECT 1 FROM samples s2 WHERE s2.plasmid_id = p.id AND s2.volume > 0)")

    return conditions, params

def _build_time_filter(time_filter, filter_type='added'):
    """Build time-based filter conditions

    Args:
        time_filter: 'this_month', 'last_6_months', 'last_12_months'
        filter_type: 'added' (date_added) or 'modified' (sample dates)

    Returns:
        tuple: (condition string, list of parameters)
    """
    import datetime

    now = datetime.datetime.now()

    if time_filter == 'this_month':
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif time_filter == 'last_6_months':
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        # Go back 6 months
        for _ in range(6):
            if start_date.month == 1:
                start_date = start_date.replace(year=start_date.year - 1, month=12)
            else:
                start_date = start_date.replace(month=start_date.month - 1)
    elif time_filter == 'last_12_months':
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        start_date = start_date.replace(year=start_date.year - 1)
    else:
        return None, []

    if filter_type == 'added':
        condition = "p.date_added >= %s"
        return condition, [start_date]
    else:  # modified - check sample modification dates
        condition = "EXISTS (SELECT 1 FROM samples s2 WHERE s2.plasmid_id = p.id AND s2.date_modified >= %s)"
        return condition, [start_date]

def _unified_plasmids_query(where_clause=None, params=None, filters=None, order_by="p.bag, p.lot, p.sublot"):
    base_query = """
                 SELECT p.lot, p.sublot, p.bag, p.notes, p.date_added,
                        COALESCE(
                                JSON_AGG(
                                        JSON_BUILD_OBJECT(
                                                'volume', s.volume,
                                                'date_created', s.date_created,
                                                'date_modified', s.date_modified,
                                                'is_checked_out', s.is_checked_out,
                                                'checked_out_by', s.checked_out_by,
                                                'checked_out_at', s.checked_out_at,
                                                'checked_in_at', s.checked_in_at
                                        ) ORDER BY s.id
                                ) FILTER (WHERE s.volume IS NOT NULL),
                                '[]'::JSON
                        ) as samples
                 FROM plasmids p
                          LEFT JOIN samples s ON p.id = s.plasmid_id \
                 """

    if where_clause:
        base_query += f" WHERE {where_clause}"

    base_query += f" GROUP BY p.id, p.lot, p.sublot, p.bag, p.notes, p.date_added ORDER BY {order_by}"

    results = execute_sql(base_query, params)
    plasmids = [Plasmid(**result) for result in results]
    return PlasmidCollection(plasmids)

### END FIND ##################################

### Delete ###################################
def delete_plasmid_record(plasmid):
    """Delete record from database"""
    print(f"Deleting record {plasmid.lot}-{plasmid.sublot} from database")

    # THIS DELETES SAMPLES/VOLUMES AS WELLL VIA SQL CASCADE
    query = "DELETE FROM plasmids WHERE lot = %s AND sublot = %s AND bag = %s"
    params = (plasmid.lot, plasmid.sublot, plasmid.bag)
    
    affected_rows = execute_sql(query, params)
    
    if affected_rows == 0:
        raise ValueError(f"Plasmid {plasmid.lot}-{plasmid.sublot} not found in database")
    
    print(f"SUCCESS: Deleted record {plasmid.lot}-{plasmid.sublot} from database")
    return {'lot': plasmid.lot, 'sublot': plasmid.sublot}

### End Delete #############################

### ADD ####################################
def add_plasmid_record(plasmids):
    """Insert record(s) into database - accepts single record or list of plasmids"""
    
    # Handle both single record and list of plasmids
    if not isinstance(plasmids, list):
        plasmids = [plasmids]
    
    if not plasmids:
        raise ValueError("No plasmids provided")
    
    try:
        print(f"Inserting {len(plasmids)} record(s) into database")
        
        # Validate bag numbers for all plasmids before insertion
        for plasmid in plasmids:
            _bag_number_in_range(plasmid.bag)
        
        # Use transaction to insert all plasmids and samples atomically
        operations = []
        
        for i, plasmid in enumerate(plasmids):
            print(f"Processing record {i+1}/{len(plasmids)}: {plasmid.lot}-{plasmid.sublot}")
            print(f"DEBUG: record object: {plasmid}")
            print(f"DEBUG: record.samples: {plasmid.samples}")

            # Get list of volume numbers from SampleCollection
            volumes = plasmid.samples.to_list()
            print(f"DEBUG: volumes list: {volumes}")
            
            # Insert record first
            plasmid_query = """
                INSERT INTO plasmids (lot, sublot, bag, notes, date_added)
                VALUES (%s, %s, %s, %s, NOW())
                RETURNING id
            """
            params = (plasmid.lot, plasmid.sublot, plasmid.bag, plasmid.notes)
            operations.append((plasmid_query, params))
            
            # Insert each sample for this record
            for volume in volumes:
                sample_query = """
                    INSERT INTO samples (plasmid_id, volume, date_created, date_modified)
                    VALUES ((SELECT currval(pg_get_serial_sequence('plasmids','id'))), %s, NOW(), NOW())
                """
                operations.append((sample_query, (volume,)))
        
        # Execute all operations in a single transaction
        results = execute_transaction(operations)
        
        success_msg = f"SUCCESS: Created {len(plasmids)} record(s) in database"
        for plasmid in plasmids:
            volumes = plasmid.samples.to_list()
            success_msg += f"\n  - {plasmid.lot}-{plasmid.sublot} in {plasmid.bag} with {len(volumes)} samples"
        print(success_msg)
        
        return {"inserted_count": len(plasmids), "plasmids": [{"lot": p.lot, "sublot": p.sublot, "bag": p.bag} for p in plasmids]}
        
    except Exception as e:
        error_msg = f"ERROR: Failed to add record(s): {e}"
        if len(plasmids) > 1:
            error_msg += f"\nTransaction rolled back - no records were inserted"
        print(error_msg)
        raise
### END ADD ###################################

### MODIFY ###################################
def modify_plasmid_record(updated_plasmid, previous_plasmid=None):
    """Update record - change its bag, notes, samples etc."""
    # If no previous plasmid provided, assume updating in place (same bag)
    if previous_plasmid is None:
        previous_plasmid = updated_plasmid

    try:

        # Validate bag number to make sure it's within acceptable database range, for move operations
        _bag_number_in_range(updated_plasmid.bag)

        # Get list of volume numbers and sample metadata
        volumes = updated_plasmid.samples.to_list()
        date_created = [sample.date_created for sample in updated_plasmid.samples]
        date_modified = [sample.date_modified for sample in updated_plasmid.samples]

        # Use transaction to update record and replace all samples atomically
        operations = []
        
        # Update record table first (main record) - MUST include bag in WHERE clause for unique identification
        update_query = """
            UPDATE plasmids 
            SET bag = %s, notes = %s 
            WHERE lot = %s AND sublot = %s AND bag = %s
            RETURNING id
        """
          
        params = (updated_plasmid.bag, updated_plasmid.notes, previous_plasmid.lot, previous_plasmid.sublot, previous_plasmid.bag)
        operations.append((update_query, params))

        # Once updated, delete the samples for this record (will re-insert the updated copy)
        delete_query = """
            DELETE FROM samples
            WHERE plasmid_id = (SELECT id FROM plasmids WHERE lot = %s AND sublot = %s AND bag = %s)
        """
        operations.append((delete_query, (previous_plasmid.lot, previous_plasmid.sublot, updated_plasmid.bag)))
        
        # Insert new samples
        for i, volume in enumerate(volumes):
            sample = updated_plasmid.samples[i]
            sample_query = """
                INSERT INTO samples (plasmid_id, volume, date_created, date_modified, is_checked_out, checked_out_by, checked_out_at, checked_in_at)
                VALUES ((SELECT id FROM plasmids WHERE lot = %s AND sublot = %s AND bag = %s), %s, %s, %s, %s, %s, %s, %s)
            """
            params = (
                previous_plasmid.lot,
                previous_plasmid.sublot,
                updated_plasmid.bag,
                volume,
                date_created[i],
                date_modified[i],
                sample.is_checked_out,
                sample.checked_out_by,
                sample.checked_out_at,
                sample.checked_in_at
            )
            operations.append((sample_query, params))
        
        results = execute_transaction(operations)
        
        # Check if record was found (first operation should return a result with RETURNING)
        if not results[0]:
            raise ValueError(f"Plasmid {previous_plasmid.lot}-{previous_plasmid.sublot} not found")
        
        print(f"SUCCESS: Updated record {previous_plasmid.lot}-{previous_plasmid.sublot}")
        return {'lot': updated_plasmid.lot, 'sublot': updated_plasmid.sublot, 'bag': updated_plasmid.bag}

    except Exception as e:
        print(f"ERROR: Failed to modify record {previous_plasmid.lot}-{previous_plasmid.sublot}: {e}")
        raise

### END MODIFY #####################################

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
            raise ValueError("Record already exists in this bag - duplicate entry. Please add new sample to existing record.")
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