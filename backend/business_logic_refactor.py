
import psycopg2
from psycopg2.extras import RealDictCursor

from try_2 import Plasmid, PlasmidCollection


# TODO: Think about cursor, singleton connection, env files
# TODO: think about adding plasmids, letting user decide bag, or auto doing it, or both.
# TODO: FURIN

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
            # TODO: Use environment variables for connection params
            self._connection = psycopg2.connect(
                host="localhost",  # Docker service name
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



#----------------------------
# Business Logic Layer
# TODO: add try catch for all functions, return error messages
#----------------------------
def batch_search_plasmids(user_input):
    """Search for multiple plasmids using PlasmidCollection"""
    try:
        # Step 1: Parse input into PlasmidCollection (handles validation)
        requested_collection = PlasmidCollection.from_user_input(user_input)

        # Step 2: Get database results using repository function
        found_collection = _batch_search_database(requested_collection)

        # Step 3: Let collection handle result formatting
        return requested_collection.to_dict(found_collection)

    except ValueError as e:
        return {'error': str(e)}

def _batch_search_database(requested_collection):
    """Repository function - handles database operations for batch search"""

    # Get lots/sublots for database query
    lots, sublots = requested_collection.get_lots_sublots()
    params = (lots, sublots)

    # Execute batch database query
    query = """
        SELECT * FROM plasmids 
        WHERE (lot, sub_lot) IN (
            SELECT UNNEST(%s), UNNEST(%s)
        )
    """

    results = execute_sql(params, query=query)

    # Convert database results to Plasmid objects
    found_plasmids = []
    for row in results:
        plasmid = Plasmid.from_database(
            lot=row['lot'],
            sublot=row['sub_lot'],
            bag=row['bag'],
            volume_1=row['volume_1'],
            volume_2=row['volume_2'],
            notes=row.get('notes')
        )
        found_plasmids.append(plasmid)

    # Return as PlasmidCollection
    return PlasmidCollection(found_plasmids)

def add_plasmid_by_string(full_plasmid, volume_1, volume_2=None, notes=None):
    plasmid = Plasmid.temp_plasmid_from_full(full_plasmid)
    add_plasmid(plasmid.lot, plasmid.sublot, volume_1, volume_2, notes)

# todo: pass just plasmid here in future, if input will be passed as full string
def add_plasmid(lot, sublot, volume_1, volume_2=None, notes=None):
    """
    Adds a plasmid to the database if it doesn't already exist.
    Adds new sample/volume if it does
    """
    # Step 1: make a temp plasmid object - validate lot and sublot
    temp_plasmid = Plasmid.temp_plasmid(lot, sublot)

    # Step 1: check for duplicates
    existing_plasmid = sql_search_plasmid(temp_plasmid)

    if existing_plasmid is None:
        # Step 2: make a new plasmid record
        # TODO: NEED TO DETERMINE WHETHER TO ASSIGN TO EXISTING BAG OR MAKE NEW ONE
        bag = _generate_bag_number()         #generate bag number if not provided
        plasmid = Plasmid(temp_plasmid.lot, temp_plasmid.sublot, bag=bag, volume_1=volume_1, volume_2=volume_2, notes=notes)

        # Step 3: insert into the database
        return _insert_plasmid_record(plasmid)

    else:
        # Step 2: update existing plasmid record with new sample/volume
        existing_plasmid.add_volume(volume_1)
        existing_plasmid.add_notes(notes)
        return _update_plasmid_record(existing_plasmid)

def delete_plasmid_by_string(full_plasmid):
    """Delete plasmid by full string like '5317-1'"""
    plasmid = Plasmid.temp_plasmid_from_full(full_plasmid)
    delete_plasmid(plasmid.lot, plasmid.sublot)

# todo: pass just plasmid here in future, if input will be passed as full string
def delete_plasmid(lot, sublot):
    """
    Deletes a plasmid from the database.
    """
    print(f"Deleting plasmid {lot}-{sublot} from database")
    # Step 1: make a temp plasmid object - validate lot and sublot
    temp_plasmid = Plasmid.temp_plasmid(lot, sublot)

    # Step 2: check for existing plasmid
    existing_plasmid = sql_search_plasmid(temp_plasmid)

    if existing_plasmid is None:
        raise ValueError(f"Plasmid {temp_plasmid.lot}-{temp_plasmid.sublot} not found in database")

    # Step 3: delete plasmid record
    query = "DELETE FROM plasmids WHERE lot = %s AND sub_lot = %s"
    params = (temp_plasmid.lot, temp_plasmid.sublot)

    result = execute_sql(params, query=query)
    print(f"✅ Deleted plasmid {temp_plasmid.lot}-{temp_plasmid.sublot} from database")
    return result

def modify_plasmid_by_string(full_plasmid, volume_1=None, volume_2=None, notes=None):
    plasmid = Plasmid.temp_plasmid_from_full(full_plasmid)
    modify_plasmid(plasmid.lot, plasmid.sublot, volume_1, volume_2, notes)

# todo: pass just plasmid here in future, if input will be passed as full string
def modify_plasmid(lot, sublot, volume_1=None, volume_2=None, notes=None):
    """Modifies an existing plasmid record by updating volumes or notes."""
    print(f"Modifying plasmid {lot}-{sublot} in database")

    # Step 1: make a temp plasmid object - validate lot and sublot
    temp_plasmid = Plasmid.temp_plasmid(lot, sublot)

    # Step 2: check for existing plasmid
    existing_plasmid = sql_search_plasmid(temp_plasmid)

    if existing_plasmid is None:
        raise ValueError(f"Plasmid {temp_plasmid.lot}-{temp_plasmid.sublot} not found in database")

    # Step 3: update plasmid record with new volumes/notes
    if volume_1 is not None:
        existing_plasmid.update_volume_1(volume_1)
    if volume_2 is not None:
        existing_plasmid.update_volume_2(volume_2)
    if notes is not None:
        existing_plasmid.add_notes(notes)

    return _update_plasmid_record(existing_plasmid)

def _insert_plasmid_record(plasmid):
    print(f"Inserting plasmid {plasmid.lot}-{plasmid.sublot} into database")
    """Insert plasmid into database"""
    query = """
        INSERT INTO plasmids (bag, lot, sub_lot, volume_1, volume_2, notes, date_added) 
        VALUES (%s, %s, %s, %s, %s, %s, NOW())
    """
    params = (plasmid.bag, plasmid.lot, plasmid.sublot,
              plasmid.volume_1, plasmid.volume_2, plasmid.notes)

    results = execute_sql(params, query=query)
    print(f"✅ Created new plasmid {plasmid.lot}-{plasmid.sublot} in {plasmid.bag}")
    return results


def _update_plasmid_record(plasmid):
    """Update plasmid record by adding, modifying or deleting volumes."""
    print(f"Updating plasmid {plasmid.lot}-{plasmid.sublot} in database")
    query  = """
        UPDATE plasmids
        SET volume_1 = %s, volume_2 = %s, notes = %s
        WHERE lot = %s AND sub_lot = %s
        """
    params = (plasmid.volume_1, plasmid.volume_2, plasmid.notes, plasmid.lot, plasmid.sublot)

    result = execute_sql(params, query=query)
    print(f"✅ Updated plasmid {plasmid.lot}-{plasmid.sublot} with volumes {plasmid.volume_1}, {plasmid.volume_2} and notes '{plasmid.notes}'")
    return result

def _generate_bag_number():
    print(f"Generating new bag number")
    """Find the highest bag number and increment"""
    query = """
            SELECT MAX(CAST(SUBSTRING(bag FROM 2) AS INTEGER)) as max_num
            FROM plasmids 
            WHERE bag ~* '^c[0-9]+$'
        """

    result = execute_sql(query=query)
    if result and result[0]['max_num'] is not None:
        next_num = result[0]['max_num']+1
        print(f"Generated new bag number: C{next_num}")
        return f"C{next_num}"
    else:
        raise ValueError("Something went wrong, no bag numbers found")

#----------------------------
# Validation Helpers
#----------------------------

#----------------------------
# DB Access Functions
#----------------------------


def sql_search_plasmid(temp_plasmid):
    """Internal search logic - does the actual database work"""
    print(f"searching for plasmid {temp_plasmid.lot}-{temp_plasmid.sublot}")
    # Use validated lot/sublot from temp plasmid
    query = "SELECT * FROM plasmids WHERE lot = %s AND sub_lot = %s"
    params = (temp_plasmid.lot, temp_plasmid.sublot)
    result = execute_sql(params, query=query)

    if not result:
        print(f"No match found!")
        return None

    if len(result) > 1:
        print(f"Multiple matches found for {temp_plasmid.lot}-{temp_plasmid.sublot}. No duplicates should exist. Returning first match.")

    match = result[0]

    # Create real Plasmid from database results
    return Plasmid.from_database(
        lot=match['lot'],
        sublot=match['sub_lot'],
        bag=match['bag'],
        volume_1=match['volume_1'],
        volume_2=match['volume_2'],
        notes=match.get('notes')
    )

# TODO: MUST FIX SQL FUNCTION TO ACCEPT REGULAR INTS, NOT JUST ARRAYS FOR SINGLE SEARCHES
def execute_sql(params=None, function_name='find_plasmids', query=None):
    """Execute PostgreSQL function"""
    conn = db.connect()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if query is not None:
                cur.execute(query, params)
            else:
                function_query = f"SELECT * FROM {function_name}(%s,%s)"
                cur.execute(function_query, params)
            return cur.fetchall()
    except Exception as e:
        print(f"Database error: {e}")
        return []


#----------------------------
# Utility Functions (sorting, formatting etc.)
#----------------------------



#----------------------------
# Testing
#----------------------------

if __name__ == "__main__":
    result = batch_search_plasmids("1170-8  ,,4391-1,4396-1")
    print(result)

"""
if __name__ == "__main__":
    print("Testing plasmid search...")

    # Test 1: Basic search
    print("\n=== Test 1: Basic Search ===")
    result1 = batch_search_plasmids("5317-1, 5332-2, 4773-1")
    print(f"Input: '5317-1, 5332-2, 4773-1'")
    print(f"Result: {result1}")

    # Test 2: Single plasmid
    print("\n=== Test 2: Single Plasmid ===")
    result2 = batch_search_plasmids("5317-1")
    print(f"Input: '5317-1'")
    print(f"Result: {result2}")

    # Test 3: Empty input
    print("\n=== Test 3: Empty Input ===")
    result3 = batch_search_plasmids("")
    print(f"Input: ''")
    print(f"Result: {result3}")

    # Test 4: Different format
    print("\n=== Test 4: Different Spacing ===")
    result4 = batch_search_plasmids("5317-1,5332-2 47734-1")
    print(f"Input: '5317-1,5332-2 4773-1'")
    print(result4)
    print("\nTesting complete!")
"""