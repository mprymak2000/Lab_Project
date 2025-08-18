# test_business_logic_fixed.py
# Test business logic with persistent mock database

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Mock database data - will be modified during tests
MOCK_DATABASE = []

def reset_mock_database():
    """Reset mock database to initial state"""
    global MOCK_DATABASE
    MOCK_DATABASE = [
        {'lot': 5317, 'sub_lot': 1, 'bag': 'c1', 'volume_1': 2.5, 'volume_2': 1.0, 'notes': 'Test plasmid'},
        {'lot': 5317, 'sub_lot': 2, 'bag': 'c1', 'volume_1': 3.0, 'volume_2': None, 'notes': None},
        {'lot': 5332, 'sub_lot': 1, 'bag': 'c2', 'volume_1': 1.5, 'volume_2': 2.0, 'notes': 'Another plasmid'},
        {'lot': 4773, 'sub_lot': 1, 'bag': 'c3', 'volume_1': 2.0, 'volume_2': None, 'notes': None},
        {'lot': 3380, 'sub_lot': 1, 'bag': 'c2', 'volume_1': 1.0, 'volume_2': None, 'notes': 'Same bag as 5332-1'},
    ]

def mock_execute_sql(params=None, function_name='find_plasmids', query=None):
    """Mock database function that actually modifies MOCK_DATABASE"""
    global MOCK_DATABASE
    print(f"🔧 MOCK DB CALL: query='{query}', params={params}")

    if query and "SELECT * FROM plasmids" in query and "(lot, sub_lot) = ANY" in query:
        # Batch search query
        if params and len(params) >= 2:
            lots = params[0] if isinstance(params[0], list) else [params[0]]
            sublots = params[1] if isinstance(params[1], list) else [params[1]]

            requested_pairs = list(zip(lots, sublots))

            results = []
            for row in MOCK_DATABASE:
                if (row['lot'], row['sub_lot']) in requested_pairs:
                    results.append(row)
            print(f"🔧 MOCK: Found {len(results)} matches")
            return results

    elif query and "SELECT * FROM plasmids WHERE lot = %s AND sub_lot = %s" in query:
        # Single plasmid search
        if params and len(params) >= 2:
            lot, sublot = params[0], params[1]
            for row in MOCK_DATABASE:
                if row['lot'] == lot and row['sub_lot'] == sublot:
                    print(f"🔧 MOCK: Found {lot}-{sublot}")
                    return [row]
            print(f"🔧 MOCK: No match for {lot}-{sublot}")
            return []

    elif query and "INSERT INTO plasmids" in query:
        # Actually insert into mock database
        if params and len(params) >= 6:
            bag, lot, sublot, volume_1, volume_2, notes = params[:6]
            new_row = {
                'lot': lot,
                'sub_lot': sublot,
                'bag': bag,
                'volume_1': volume_1,
                'volume_2': volume_2,
                'notes': notes
            }
            MOCK_DATABASE.append(new_row)
            print(f"🔧 MOCK: ✅ ACTUALLY INSERTED {lot}-{sublot} into database")
            print(f"🔧 MOCK: Database now has {len(MOCK_DATABASE)} plasmids")
            return 1

    elif query and "UPDATE plasmids" in query:
        # Actually update in mock database
        if params and len(params) >= 5:
            volume_1, volume_2, notes, lot, sublot = params[:5]
            for row in MOCK_DATABASE:
                if row['lot'] == lot and row['sub_lot'] == sublot:
                    row['volume_1'] = volume_1
                    row['volume_2'] = volume_2
                    row['notes'] = notes
                    print(f"🔧 MOCK: ✅ ACTUALLY UPDATED {lot}-{sublot}")
                    return 1
            print(f"🔧 MOCK: Could not find {lot}-{sublot} to update")
            return 0

    elif query and "DELETE FROM plasmids" in query:
        # Actually delete from mock database
        if params and len(params) >= 2:
            lot, sublot = params[:2]
            original_length = len(MOCK_DATABASE)
            MOCK_DATABASE[:] = [row for row in MOCK_DATABASE
                                if not (row['lot'] == lot and row['sub_lot'] == sublot)]
            deleted = original_length - len(MOCK_DATABASE)
            if deleted > 0:
                print(f"🔧 MOCK: ✅ ACTUALLY DELETED {lot}-{sublot}")
                print(f"🔧 MOCK: Database now has {len(MOCK_DATABASE)} plasmids")
                return deleted
            else:
                print(f"🔧 MOCK: Could not find {lot}-{sublot} to delete")
                return 0

    elif query and "SELECT MAX" in query and "bag" in query:
        # Generate bag number based on current mock database
        current_bags = [row['bag'] for row in MOCK_DATABASE if row['bag'] and row['bag'].lower().startswith('c')]
        if current_bags:
            import re
            bag_numbers = []
            for bag in current_bags:
                match = re.match(r'^[cC](\d+)$', bag)
                if match:
                    bag_numbers.append(int(match.group(1)))

            max_num = max(bag_numbers) if bag_numbers else 0
            print(f"🔧 MOCK: Found bags {current_bags}, max number: {max_num}")
            return [{'max_num': max_num}]
        else:
            print(f"🔧 MOCK: No bags found, returning 0")
            return [{'max_num': 0}]

    else:
        print(f"🔧 MOCK: Unhandled query type")
        return []

def setup_mock_database():
    """Replace real database function with mock"""
    import business_logic_refactor
    business_logic_refactor._original_execute_sql = business_logic_refactor.execute_sql
    business_logic_refactor.execute_sql = mock_execute_sql
    reset_mock_database()
    print("🔧 Mock database activated")

def restore_real_database():
    """Restore real database function"""
    try:
        import business_logic_refactor
        if hasattr(business_logic_refactor, '_original_execute_sql'):
            business_logic_refactor.execute_sql = business_logic_refactor._original_execute_sql
            delattr(business_logic_refactor, '_original_execute_sql')
            print("🔧 Real database restored")
        else:
            print("🔧 No original database function to restore")
    except Exception as e:
        print(f"🔧 Error restoring database: {e}")

def show_mock_database():
    """Show what's in our mock database"""
    print("=== Mock Database Contents ===")
    print(f"Total plasmids: {len(MOCK_DATABASE)}")
    for row in MOCK_DATABASE:
        volumes = f"v1={row['volume_1']}"
        if row['volume_2']:
            volumes += f", v2={row['volume_2']}"
        notes = f" - {row['notes']}" if row['notes'] else ""
        print(f"  {row['lot']}-{row['sub_lot']} in {row['bag']} ({volumes}){notes}")

def test_full_workflow():
    """Test complete workflow with persistence"""
    print("\n=== Testing Full Workflow with Persistence ===")

    from business_logic_refactor import add_plasmid_by_string, batch_search_plasmids, modify_plasmid_by_string, delete_plasmid_by_string

    print("\n📊 Initial state:")
    show_mock_database()

    # Step 1: Add a new plasmid
    print("\n🔄 Step 1: Adding new plasmid 9999-1...")
    try:
        add_plasmid_by_string("9999-1", 2.5, None, "New test plasmid")
        print("✅ Add completed")
    except Exception as e:
        print(f"❌ Add failed: {e}")

    print("\n📊 After adding 9999-1:")
    show_mock_database()

    # Step 2: Search for the new plasmid
    print("\n🔄 Step 2: Searching for 9999-1...")
    try:
        result = batch_search_plasmids("9999-1")
        print(f"Search result: {result}")
    except Exception as e:
        print(f"❌ Search failed: {e}")

    # Step 3: Modify the new plasmid (should work now!)
    print("\n🔄 Step 3: Modifying 9999-1 (should work now)...")
    try:
        modify_plasmid_by_string("9999-1", 3.0, 1.5, "Updated volumes")
        print("✅ Modify completed")
    except Exception as e:
        print(f"❌ Modify failed: {e}")

    print("\n📊 After modifying 9999-1:")
    show_mock_database()

    # Step 4: Delete the plasmid
    print("\n🔄 Step 4: Deleting 9999-1...")
    try:
        delete_plasmid_by_string("9999-1")
        print("✅ Delete completed")
    except Exception as e:
        print(f"❌ Delete failed: {e}")

    print("\n📊 Final state after deleting 9999-1:")
    show_mock_database()

def test_add_plasmid():
    """Test add plasmid business logic"""
    print("\n=== Testing Add Plasmid Business Logic ===")

    from business_logic_refactor import add_plasmid_by_string

    test_cases = [
        ("9999-1", 2.5, None, "New plasmid"),      # Should create new
        ("5317-1", 1.5, None, "Existing plasmid"), # Should fail - has 2 volumes
    ]

    for plasmid_str, volume1, volume2, notes in test_cases:
        print(f"\n--- Adding: {plasmid_str} ---")
        try:
            result = add_plasmid_by_string(plasmid_str, volume1, volume2, notes)
            print(f"✅ Success: {result}")
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("Testing Business Logic (FIXED - Persistent Mock Database)")
    print("=" * 60)

    # Set up mock database first
    setup_mock_database()

    try:
        show_mock_database()

        # Run comprehensive workflow test
        test_full_workflow()

        print("\n" + "=" * 30)
        print("Running add plasmid test...")

        # Reset database for individual test
        reset_mock_database()
        test_add_plasmid()

    except Exception as e:
        print(f"❌ Test failed: {e}")

    finally:
        # Always restore real database
        restore_real_database()

    print("\n" + "=" * 60)
    print("Business logic testing complete!")
    print("✅ This version ACTUALLY persists data!")
    print("✅ Your real database was never touched!")