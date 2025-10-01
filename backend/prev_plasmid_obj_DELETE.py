import re

def add_plasmid(volume, plasmid_input=None, lot=None, sublot=None):
    if check_duplicate(cursor, lot, sublot):
        raise ValueError("Plasmid already exists in database")
    return

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

def check_duplicate(cursor, lot, sublot):
    # Check if plasmid already exists in database
    if sql_search(cursor,lot, sublot) is None:
        return False
    return True




def sql_search(cursor, full_plasmid=None, lot=None, sublot=None, column=None):

    """
    Helper function
    Search for plasmid and return specified column or full row
    Valiudates input format


    Args:
        cursor: DB cursor
        full_plasmid: str in format 'xxxx-xx' (lot-sublot)
        lot: plasmid lot number
        sublot: plasmid sublot number
        column: int (index) or str (column name) or None (full row)

    Returns:
        - If column specified: single value or None
        - If column=None: full row tuple or None
    """
    validate_plasmid_format(full_plasmid,lot,sublot)

    cursor.execute("SELECT * FROM plasmids WHERE lot = %s AND sub_lot = %s)", (lot, sublot))
    row = cursor.fetchone()

    # no match
    if row is None:
        return None

    #if no column specified, return full row for matched plasmid
    if column is None:
        return row  # Full row: (bag_number, lot, sublot, volume)

    #column specified as int
    if isinstance(column, int):
        #check column passed is valid
        if column < 0 or column > 10:
            raise ValueError("Column index must be 0-10")

        #this will return column 0:bag_number, 1:lot, 2:sublot, 3+:volume
        # For volume, return all columns from index 3 onward as a tuple.
        #Table may have multiple volume columns, depending on the number of samples stored.
        if column <= 2:
            return row[column]
        else:
            return row[3:]

    if isinstance(column, str):
        # Map column names to indices
        columns = {'bag_number': 0, 'lot': 1, 'sublot': 2, 'volume': 3}
        if column in columns:
            return row[columns[column]]
        else:
            raise ValueError(f"Unknown column name: {column}")

    #bad input type
    raise ValueError("Bad Input: column must be int, str, or None")

def validate_plasmid_format (full_plasmid=None, lot=None, sublot=None):

    has_full = full_plasmid is not None
    has_parts = lot is not None and sublot is not None

    """Validation. Either full format xxxx-xx or lot xxxx and sublot xx"""

    #don't accept both
    if has_full and has_parts:
        raise ValueError("Both full format and partial format provided")

    #don't accept empties
    if not has_full and not has_parts:
        raise ValueError("Must provide either full_plasmid or both lot and sublot")

    #if full plasmid (xxxx-xx), break into lot (xxxx) and sublot (xx)
    if full_plasmid:
        plasmid = re.match(r'^(\d+)-(\d+)$', full_plasmid.strip())
        if not plasmid:
            raise ValueError("Invalid Format. Use XXXX-XX")
        lot, sublot = int(plasmid.group(1)), int(plasmid.group(2))

    #range validation
    if lot < 0 or sublot < 1:
        raise ValueError("Lot must be non-negative and sublot must be positive")

    return lot, sublot

