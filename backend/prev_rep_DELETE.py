import re
import psycopg2
from collections import defaultdict
from psycopg2.extras import RealDictCursor


# TODO: Think about cursor, singleton connection, env files
# TODO: think about adding plasmids, letting user decide bag, or auto doing it, or both.


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



#----------------------------
# Business Logic Layer
# TODO: add try catch for all functions, return error messages
#----------------------------

def batch_search_plasmids(user_input):
    # take input from user, format it for sql, find in database, return results
    if not user_input or not user_input.strip():
        return {'error': 'no input provided'}
    # TODO: do more input validation here

    requested_plasmids = set()
    lot = []
    sublot = []

    split_plasmids = re.split(r'[,\s]+', user_input.strip())

    for plasmid in split_plasmids:
        plasmid_lot, plasmid_sublot = plasmid.split('-')
        lot.append(int(plasmid_lot))
        sublot.append(plasmid_sublot)
        requested_plasmids.add((int(plasmid_lot), plasmid_sublot))  # Store as tuple for easy comparison

    # call database function
    results = execute_function(lot, sublot) # connect to database and execute the function

    # Convert results to a set of tuples for easy comparison
    found_plasmids = {(r['lot'], r['sub_lot']) for r in results}

    # Check if any requested plasmids were not found
    missing_plasmids = requested_plasmids - found_plasmids  # Set difference to find missing plasmids
    missing_plasmids_strings = [f"{lot}-{sublot}" for lot, sublot in missing_plasmids]

    # Prepare results for output
    bag_groups = defaultdict(list)
    #Goes row by row, makes string out of lot-sublot, maps it to its bag
    for r in results:
        plasmid_str = f"{r['lot']}-{r['sub_lot']}"
        bag_groups[r['bag']].append(plasmid_str)
    bag_groups_ordered = dict(sorted(bag_groups.items(), key=lambda x: natural_sort_key(x[0])))

    # Return the results from the database
    output = {
        'found': f"{len(results)}/{len(requested_plasmids)}",
        'bags': bag_groups_ordered,
    }

    if missing_plasmids_strings:
        output['not_found'] = missing_plasmids_strings

    return output


def add_plasmid(volume, plasmid_input=None, lot=None, sublot=None, note = None):
    """
    Adds a plasmid to the database if it doesn't already exist.
    Adds new sample/volume if it does
    """

    #Step 1: Validate input
    plasmid = Plasmid(lot, sublot,)

    # Step 2: Business rule - check for duplicates
    existing_row = sql_search(lot=lot, sublot=sublot)

    if existing_row:
        # Step 3a: add new sample/volume if plasmid exists
        # todo: might wanna add more null columns in databsae so more samples can be added
        if existing_row['volume_2'] is not None:
            raise ValueError("plasmid already exists with 2 samples."
                             "Pls combine other samples into single tube or contact"
                             "Michal at 917-655-1237 to add new columns to database.")
        query =  """
                INSERT INTO plasmids (bag, lot, sublot, volume_1, volume_2, note) 
                VALUES (%s, %s, %s, %s, %s, %s)
                """
        update_plasmid_record(existing_row, volume_2 = volume)
        print(f"✅ Created new plasmid {lot}-{sublot} with {volume}mL in {existing_row['bag']}")
    else:
        # Make new record, add to database. auto-select appropriate bag number if one not pased.
        bag = generate_bag_number(lot, sublot)
        insert_plasmid_record(lot, sublot, bag, volume)
        print(f"✅ Created new plasmid {lot}-{sublot} with {volume}mL in {bag}")

def update_plasmid_record(existing_record, volume_1=None, volume_2=None, notes=None):
    """Update plasmid record. Can only update volume_1 OR volume_2, not both"""

    set_clauses = []
    params = []

    # Update volume_1 if specified
    if volume_1 is not None:
        set_clauses.append("volume_1 = %s")
        params.append(volume_1)

    # Update volume_2 if specified
    if volume_2 is not None:
        set_clauses.append("volume_2 = %s")
        params.append(volume_2)

    # Update notes if specified
    if notes is not None:
        set_clauses.append("notes = %s")
        params.append(notes)

    if not set_clauses:
        raise ValueError("No fields to update")

    # WHERE clause
    params.extend([existing_record['lot'], existing_record['sub_lot']])

    query = f"""
        UPDATE plasmids
        SET {', '.join(set_clauses)}
        WHERE lot = %s AND sub_lot = %s
    """

    return execute_update(query, params)



def delete_plasmid():
    return

def update_plasmid():
    return

#----------------------------
# Validation Helpers
#----------------------------

def validate_plasmid_format (full_plasmid=None, lot=None, sublot=None):

    has_full = full_plasmid is not None
    has_parts = lot is not None and sublot is not None

    """Validation. Either full format xxxx-xx or lot xxxx and sublot xx"""

    #don't accept empties
    if not has_full and not has_parts:
        raise ValueError("Must provide either full_plasmid or both lot and sublot")

    #if full plasmid (xxxx-xx), break into lot (xxxx) and sublot (xx)
    if has_full:
        plasmid = re.match(r'^(\d+)-(\d+)$', full_plasmid.strip())
        if not plasmid:
            raise ValueError("Invalid Format. Use XXXX-XX")
        lot, sublot = int(plasmid.group(1)), int(plasmid.group(2))

    #don't accept both formats if they're different
    if has_full and has_parts:
        if not full_plasmid == f"{lot}-{sublot}":
            raise ValueError("Both full format and partial format provided")

    #range validation
    if lot < 0 or sublot < 1:
        raise ValueError("Lot must be non-negative and sublot must be positive")

    return lot, sublot


def validate_volume (volume_input):
    if volume_input is None:
        raise ValueError("Volume (mL) is required")
    try:
        volume = float(volume_input)
        if volume <= 0:
            raise ValueError("Volume must be positive")
    except (ValueError, TypeError):
        raise ValueError("Volume must be a valid positive number")
    return volume


#----------------------------
# DB Access Functions
#----------------------------

def sql_search(full_plasmid=None, lot=None, sublot=None, column_index=None):

    """
    Helper function. Modular, allows for parsing of the database.
    Search for plasmid and return specified column or full row
    Validates input format


    Args:
        full_plasmid: str in format 'xxxx-xx' (lot-sublot)
        lot: plasmid lot number
        sublot: plasmid sublot number
        column_index: int (index) or str (column name) or None (full row)

    Returns:
        - If column specified: single value or None
        - If column=None: full row tuple or None
    """
    lot, sublot = validate_plasmid_format(full_plasmid,lot,sublot)

    #cursor.execute("SELECT * FROM plasmids WHERE lot = %s AND sub_lot = %s)", (lot, sublot))
    row = execute_function(lot, sublot)

    # no match
    if row is None:
        return None

    #if no column specified, return full row for matched plasmid
    if column_index is None:
        return row  # Full row: (bag_number, lot, sublot, volume)

    #column specified as int
    if isinstance(column_index, int):
        #check column index passed is valid
        if column_index < 0 or column_index > 10:
            raise ValueError("Column index must be 0-10")

        #this will return column 0:bag_number, 1:lot, 2:sublot, 3+:volume
        # For volume, return all columns from index 3 onward as a tuple.
        #Table may have multiple volume columns, depending on the number of samples stored.
        if column_index <= 2:
            return row[column_index]
        else:
            return row[3:]

    if isinstance(column_index, str):
        # Map column names to indices
        columns = {'bag_number': 0, 'lot': 1, 'sublot': 2, 'volume': 3}
        if column_index in columns:
            return row[columns[column_index]]
        else:
            raise ValueError(f"Unknown column name: {column_index}")

    #bad input type
    raise ValueError("Bad Input: column must be int, str, or None")


# TODO: MUST FIX SQL FUNCTION TO ACCEPT REGULAR INTS, NOT JUST ARRAYS FOR SINGLE SEARCHES
def execute_function(lots, sublots, function_name='find_plasmids', query=None):
    """Execute PostgreSQL function"""
    conn = db.connect()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if query is not None:
                cur.execute(query, (lots, sublots))
            else:
                function_query = f"SELECT * FROM {function_name}(%s,%s)"
                cur.execute(function_query, (lots, sublots))
            return cur.fetchall()
    except Exception as e:
        print(f"Database error: {e}")
        return []


def insert_plasmid_record(lot, sublot, bag, volume_1, volume_2 = None, notes = None):
    """Database function: Insert new plasmid record"""
    query = """
        INSERT INTO plasmids (bag, lot, sub_lot, volume_1, volume_2, notes) 
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    params = (bag, lot, sublot, volume_1, volume_2, notes)
    return execute_insert(query, params)


def execute_insert(query, params):
    """
    Execute INSERT and return affected rows
    It's separate in case other things will be inserted besides plasmids - unlikely but still.
    """
    conn = db.connect()
    try:
        with conn.cursor() as cur:
            cur.execute(query, params)
            conn.commit()
            return cur.rowcount
    except Exception as e:
        conn.rollback()
        print(f"Database error: {e}")
        return 0


#----------------------------
# Utility Functions (sorting, formatting etc.)
#----------------------------

# Natural sort helper function for search operation
def natural_sort_key(bag):
    return [int(text) if text.isdigit() else text.lower()
            for text in re.split('([0-9]+)', bag)]



def has_plasmid(lot, sublot):
    # Check if plasmid already exists in database
    return sql_search(lot=lot, sublot=sublot) is not None



#----------------------------
# Testing
#----------------------------



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
    print(f"Result: {result4}")

    print("\nTesting complete!")