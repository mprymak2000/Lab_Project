# test_edge_cases.py
# Comprehensive testing of volume edge cases and batch operations

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from try_2 import Plasmid, PlasmidCollection

def test_volume_edge_cases():
    """Test all the weird volume scenarios"""
    print("=== Testing Volume Edge Cases ===")

    # Test 1: Create plasmid without volume_1 (should this be allowed?)
    print("\n1. Creating plasmid without volume_1:")
    try:
        plasmid = Plasmid(5317, 1, "c1", volume_1=None)
        print(f"❌ PROBLEM: Created plasmid without volume_1: {plasmid}")
        print(f"   Volume 1: {plasmid.volume_1}, Volume 2: {plasmid.volume_2}")
    except Exception as e:
        print(f"✅ Correctly prevented: {e}")

    # Test 2: Try to add volume_2 when volume_1 is None
    print("\n2. Adding volume_2 without volume_1:")
    try:
        plasmid = Plasmid.from_database(5317, 1, "c1", volume_1=None, volume_2=None)
        print(f"Database plasmid created: v1={plasmid.volume_1}, v2={plasmid.volume_2}")

        plasmid.add_volume(2.5)  # This should become volume_1 or volume_2?
        print(f"After add_volume(2.5): v1={plasmid.volume_1}, v2={plasmid.volume_2}")
    except Exception as e:
        print(f"Error: {e}")

    # Test 3: Try to add volume_2 twice
    print("\n3. Adding volume_2 twice:")
    try:
        plasmid = Plasmid(5317, 1, "c1", 2.5)
        print(f"before add: v1={plasmid.volume_1}, v2={plasmid.volume_2}")
        plasmid.add_volume(1.5)  # First volume_2
        print(f"After first add: v1={plasmid.volume_1}, v2={plasmid.volume_2}")
        plasmid.add_volume(3.0)  # Should fail
        print(f"❌ PROBLEM: Added third volume!")
    except Exception as e:
        print(f"✅ Correctly prevented: {e}")

    # Test 4: Update volume_2 when volume_1 is None (your method should handle this)
    print("\n4. Update volume_2 when volume_1 is None:")
    try:
        plasmid = Plasmid.from_database(5317, 1, "c1", volume_1=None, volume_2=None)
        plasmid.update_volume_2(2.5)  # This should put it in volume_1 slot per your logic
        print(f"After update_volume_2: v1={plasmid.volume_1}, v2={plasmid.volume_2}")
    except Exception as e:
        print(f"Error: {e}")

    # Test 5: Delete volume_1 when no volume_2 exists
    print("\n5. Delete volume_1 when no volume_2:")
    try:
        plasmid = Plasmid(5317, 1, "c1", 2.5)
        plasmid.delete_volume_1()  # Should fail because volume_2 is None
        print(f"❌ PROBLEM: Deleted only volume!")
    except Exception as e:
        print(f"✅ Correctly prevented: {e}")

    # Test 6: Delete volume_1 when volume_2 exists
    print("\n6. Delete volume_1 when volume_2 exists:")
    try:
        plasmid = Plasmid(5317, 1, "c1", 2.5, 1.5)
        print(f"Before delete: v1={plasmid.volume_1}, v2={plasmid.volume_2}")
        plasmid.delete_volume_1()  # Should move volume_2 to volume_1
        print(f"After delete: v1={plasmid.volume_1}, v2={plasmid.volume_2}")
    except Exception as e:
        print(f"Error: {e}")

    # Test 7: Test your add_volume edge case - volume_2 exists but volume_1 is None
    print("\n7. Add volume when volume_1=None, volume_2=exists:")
    try:
        plasmid = Plasmid.from_database(5317, 1, "c1", volume_1=None, volume_2=2.0)
        print(f"Weird state: v1={plasmid.volume_1}, v2={plasmid.volume_2}")
        plasmid.add_volume(1.5)  # Your logic should reorganize this
        print(f"After add_volume: v1={plasmid.volume_1}, v2={plasmid.volume_2}")
    except Exception as e:
        print(f"Error: {e}")

def test_database_scenarios():
    """Test scenarios that might come from database"""
    print("\n=== Testing Database Load Scenarios ===")

    # Test 1: Load plasmid with no volumes (old data?)
    print("\n1. Database plasmid with no volumes:")
    try:
        plasmid = Plasmid.from_database(5317, 1, "c1", volume_1=None, volume_2=None)
        print(f"✅ Loaded: {plasmid}")
        print(f"   Volumes: v1={plasmid.volume_1}, v2={plasmid.volume_2}")
    except Exception as e:
        print(f"❌ Error: {e}")

    # Test 2: Load plasmid with only volume_2 (weird data?)
    print("\n2. Database plasmid with only volume_2:")
    try:
        plasmid = Plasmid.from_database(5317, 1, "c1", volume_1=None, volume_2=2.5)
        print(f"Loaded: {plasmid}")
        print(f"Volumes: v1={plasmid.volume_1}, v2={plasmid.volume_2}")
    except Exception as e:
        print(f"Error: {e}")

def test_batch_search():
    """Test batch search and grouping functionality"""
    print("\n=== Testing Batch Search & Grouping ===")

    # Create a collection of plasmids with different bags
    print("\n1. Creating test collection with different bags:")
    test_plasmids = [
        Plasmid.from_database(5317, 1, "c1", 2.5, 1.0),
        Plasmid.from_database(5317, 2, "c1", 1.5),  # Same bag
        Plasmid.from_database(5332, 1, "c2", 3.0),
        Plasmid.from_database(5332, 2, "c10", 2.0),  # Test natural sorting
        Plasmid.from_database(4773, 1, "c3", 1.0),
    ]

    collection = PlasmidCollection(test_plasmids)

    # Test grouping by bags
    print("\n2. Testing bag grouping:")
    try:
        bag_groups = collection.group_by_bags()
        print("Bag groups:")
        for bag, plasmids in bag_groups.items():
            print(f"  {bag}: {plasmids}")
    except Exception as e:
        print(f"❌ Error: {e}")

    # Test natural sorting of bags
    print("\n3. Testing natural sort (c1, c2, c3, c10):")
    test_bags = ["c1", "c10", "c2", "c3", "c11", "c9"]
    print(f"Unsorted: {test_bags}")

    try:
        sorted_bags = sorted(test_bags, key=collection._natural_sort_key)
        print(f"Sorted:   {sorted_bags}")
    except Exception as e:
        print(f"❌ Error: {e}")

def test_collection_operations():
    """Test PlasmidCollection edge cases"""
    print("\n=== Testing Collection Operations ===")

    # Test 1: Empty collection
    print("\n1. Empty collection:")
    try:
        empty_collection = PlasmidCollection()
        print(f"Length: {len(empty_collection)}")
        print(f"Lots/sublots: {empty_collection.get_lots_sublots()}")
    except Exception as e:
        print(f"❌ Error: {e}")

    # Test 2: Collection with duplicate plasmids
    print("\n2. Collection with duplicates:")
    try:
        plasmid1 = Plasmid.temp_plasmid(5317, 1)
        plasmid2 = Plasmid.temp_plasmid(5317, 1)  # Same lot-sublot

        collection = PlasmidCollection([plasmid1, plasmid2])
        tuples = collection.get_lot_sublot_tuples()
        print(f"Plasmids: {len(collection)}, Unique tuples: {len(tuples)}")
        print(f"Tuples: {tuples}")
    except Exception as e:
        print(f"❌ Error: {e}")

    # Test 3: Find missing plasmids
    print("\n3. Finding missing plasmids:")
    try:
        requested = PlasmidCollection.from_user_input("5317-1, 5332-1, 4773-1")
        found_plasmids = [
            Plasmid.from_database(5317, 1, "c1", 2.5),
            # Missing 5332-1 and 4773-1
        ]
        found = PlasmidCollection(found_plasmids)

        missing = requested.find_missing(found)
        print(f"Requested: {[str(p) for p in requested]}")
        print(f"Found: {[str(p) for p in found]}")
        print(f"Missing: {missing}")
    except Exception as e:
        print(f"❌ Error: {e}")

def test_weird_inputs():
    """Test weird user inputs"""
    print("\n=== Testing Weird User Inputs ===")

    weird_inputs = [
        "",  # Empty
        "   ",  # Whitespace only
        "5317-1,,,5332-2",  # Extra commas
        "5317-1 5332-2   4773-1",  # Multiple spaces
        "5317-1,5332-2,",  # Trailing comma
        ",5317-1,5332-2",  # Leading comma
    ]

    for user_input in weird_inputs:
        print(f"\nTesting: '{user_input}'")
        try:
            collection = PlasmidCollection.from_user_input(user_input)
            print(f"✅ Parsed {len(collection)} plasmids: {[str(p) for p in collection]}")
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("Comprehensive Edge Case Testing")
    print("=" * 50)

    test_volume_edge_cases()
    test_database_scenarios()
    test_batch_search()
    test_collection_operations()
    test_weird_inputs()

    print("\n" + "=" * 50)
    print("Edge case testing complete!")


    # test_batch_search.py
# Comprehensive testing of batch search functionality

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from try_2 import Plasmid, PlasmidCollection

def create_mock_database():
    """Create a mock database with 10 plasmids in different bags"""
    database_plasmids = [
        Plasmid.from_database(5317, 1, "c1", 2.5, 1.0, "First plasmid"),
        Plasmid.from_database(5317, 2, "c1", 3.0, None, "Same bag as 5317-1"),
        Plasmid.from_database(5332, 1, "c2", 1.5, 2.0, "Different bag"),
        Plasmid.from_database(5332, 2, "c10", 4.0, None, "Test natural sorting"),
        Plasmid.from_database(4773, 1, "c3", 2.0, 1.5, "Another plasmid"),
        Plasmid.from_database(3380, 1, "c2", 1.0, None, "Same bag as 5332-1"),
        Plasmid.from_database(3380, 2, "c4", 3.5, 2.5, "Different bag"),
        Plasmid.from_database(5280, 1, "c5", 2.8, None, "Single volume"),
        Plasmid.from_database(6100, 1, "c11", 1.2, 0.8, "Test c11 sorting"),
        Plasmid.from_database(7200, 1, "c6", 4.5, 3.0, "Last plasmid")
    ]
    return PlasmidCollection(database_plasmids)

def simulate_database_search(requested_collection, database_collection):
    """Simulate finding plasmids in database"""
    requested_tuples = requested_collection.get_lot_sublot_tuples()
    database_tuples = database_collection.get_lot_sublot_tuples()

    # Find matches
    found_tuples = requested_tuples.intersection(database_tuples)

    # Get matching plasmids from database
    found_plasmids = []
    for plasmid in database_collection:
        if (plasmid.lot, plasmid.sublot) in found_tuples:
            found_plasmids.append(plasmid)

    return PlasmidCollection(found_plasmids)

def test_perfect_match():
    """Test when all requested plasmids are found"""
    print("=== Test 1: Perfect Match (All Found) ===")

    database = create_mock_database()

    # Request plasmids that all exist
    user_input = "5317-1, 5332-1, 4773-1"
    print(f"Searching for: {user_input}")

    try:
        requested = PlasmidCollection.from_user_input(user_input)
        found = simulate_database_search(requested, database)

        result = requested.to_dict(found)

        print(f"Result: {result['found']}")
        print("Bags found:")
        for bag, plasmids in result['bags'].items():
            print(f"  {bag}: {plasmids}")

        if 'not_found' in result:
            print(f"❌ Unexpected missing: {result['not_found']}")
        else:
            print("✅ All plasmids found as expected")

    except Exception as e:
        print(f"❌ Error: {e}")

def test_partial_match():
    """Test when some plasmids are missing"""
    print("\n=== Test 2: Partial Match (Some Missing) ===")

    database = create_mock_database()

    # Request mix of existing and non-existing plasmids
    user_input = "5317-1, 5332-1, 9999-1, 4773-1, 8888-2"
    print(f"Searching for: {user_input}")

    try:
        requested = PlasmidCollection.from_user_input(user_input)
        found = simulate_database_search(requested, database)

        result = requested.to_dict(found)

        print(f"Result: {result['found']}")
        print("Bags found:")
        for bag, plasmids in result['bags'].items():
            print(f"  {bag}: {plasmids}")

        if 'not_found' in result:
            print(f"Missing plasmids: {result['not_found']}")
            expected_missing = {'9999-1', '8888-2'}
            actual_missing = set(result['not_found'])
            if actual_missing == expected_missing:
                print("✅ Correctly identified missing plasmids")
            else:
                print(f"❌ Expected missing: {expected_missing}, got: {actual_missing}")
        else:
            print("❌ Should have found missing plasmids")

    except Exception as e:
        print(f"❌ Error: {e}")

def test_no_matches():
    """Test when no plasmids are found"""
    print("\n=== Test 3: No Matches (All Missing) ===")

    database = create_mock_database()

    # Request plasmids that don't exist
    user_input = "9999-1, 8888-2, 7777-3"
    print(f"Searching for: {user_input}")

    try:
        requested = PlasmidCollection.from_user_input(user_input)
        found = simulate_database_search(requested, database)

        result = requested.to_dict(found)

        print(f"Result: {result['found']}")
        print(f"Bags found: {result['bags']}")

        if 'not_found' in result:
            print(f"Missing plasmids: {result['not_found']}")
            if len(result['not_found']) == 3:
                print("✅ Correctly found no matches")
            else:
                print("❌ Wrong number of missing plasmids")
        else:
            print("❌ Should have found missing plasmids")

    except Exception as e:
        print(f"❌ Error: {e}")

def test_bag_grouping():
    """Test bag grouping and natural sorting"""
    print("\n=== Test 4: Bag Grouping & Sorting ===")

    database = create_mock_database()

    # Request plasmids from multiple bags
    user_input = "5317-1, 5317-2, 5332-1, 3380-1, 5332-2, 6100-1"
    print(f"Searching for: {user_input}")

    try:
        requested = PlasmidCollection.from_user_input(user_input)
        found = simulate_database_search(requested, database)

        result = requested.to_dict(found)

        print(f"Result: {result['found']}")
        print("Bags found (should be in natural order: c1, c2, c10, c11):")
        bag_order = list(result['bags'].keys())
        print(f"Bag order: {bag_order}")

        # Test natural sorting
        expected_order = ['c1', 'c2', 'c10', 'c11']
        if bag_order == expected_order:
            print("✅ Bags correctly sorted in natural order")
        else:
            print(f"❌ Expected order: {expected_order}, got: {bag_order}")

        # Test grouping
        for bag, plasmids in result['bags'].items():
            print(f"  {bag}: {plasmids}")

    except Exception as e:
        print(f"❌ Error: {e}")

def test_duplicates_in_request():
    """Test when user requests the same plasmid multiple times"""
    print("\n=== Test 5: Duplicate Requests ===")

    database = create_mock_database()

    # Request same plasmid multiple times
    user_input = "5317-1, 5332-1, 5317-1, 4773-1, 5317-1"
    print(f"Searching for: {user_input}")

    try:
        requested = PlasmidCollection.from_user_input(user_input)
        print(f"Requested plasmids count: {len(requested)}")
        print(f"Unique plasmids: {len(requested.get_lot_sublot_tuples())}")

        found = simulate_database_search(requested, database)

        result = requested.to_dict(found)

        print(f"Result: {result['found']}")
        print("Bags found:")
        for bag, plasmids in result['bags'].items():
            print(f"  {bag}: {plasmids}")

        # Check if 5317-1 appears only once in results
        c1_plasmids = result['bags'].get('c1', [])
        count_5317_1 = c1_plasmids.count('5317-1')
        if count_5317_1 == 1:
            print("✅ Duplicates correctly handled - 5317-1 appears once")
        else:
            print(f"❌ Expected 5317-1 to appear once, found {count_5317_1} times")

    except Exception as e:
        print(f"❌ Error: {e}")

def test_edge_case_inputs():
    """Test edge cases in user input"""
    print("\n=== Test 6: Edge Case Inputs ===")

    database = create_mock_database()

    edge_cases = [
        ("Single plasmid", "5317-1"),
        ("Extra spaces", "5317-1,   5332-1  ,4773-1"),
        ("Mixed separators", "5317-1, 5332-1 4773-1"),
        ("Trailing comma", "5317-1, 5332-1,"),
        ("Leading comma", ",5317-1, 5332-1"),
        ("Multiple commas", "5317-1,,5332-1"),
    ]

    for description, user_input in edge_cases:
        print(f"\n--- {description}: '{user_input}' ---")
        try:
            requested = PlasmidCollection.from_user_input(user_input)
            found = simulate_database_search(requested, database)
            result = requested.to_dict(found)

            print(f"✅ Parsed successfully: {result['found']}")
            print(f"   Found plasmids: {list(result['bags'].keys()) if result['bags'] else 'None'}")

        except Exception as e:
            print(f"❌ Error: {e}")

def test_real_world_scenario():
    """Test a realistic lab scenario"""
    print("\n=== Test 7: Real World Lab Scenario ===")

    database = create_mock_database()

    # Simulate lab worker searching for plasmids for an experiment
    user_input = "5317-1, 5317-2, 5332-1, 3380-1, 3380-2, 4773-1, 9999-1"
    print(f"Lab worker searching for: {user_input}")
    print("(Mix of plasmids from same lots, different bags, some missing)")

    try:
        requested = PlasmidCollection.from_user_input(user_input)
        found = simulate_database_search(requested, database)
        result = requested.to_dict(found)

        print(f"\nSearch Result: {result['found']}")
        print("\nPlasmids organized by storage bag:")
        for bag, plasmids in result['bags'].items():
            print(f"  📦 Bag {bag}: {', '.join(plasmids)}")

        if 'not_found' in result:
            print(f"\n⚠️  Missing plasmids (need to order/make): {', '.join(result['not_found'])}")

        # Calculate some stats
        total_requested = len(requested)
        total_found = len(found)
        success_rate = (total_found / total_requested) * 100

        print(f"\n📊 Summary:")
        print(f"   Requested: {total_requested}")
        print(f"   Found: {total_found}")
        print(f"   Success rate: {success_rate:.1f}%")
        print(f"   Bags to retrieve: {len(result['bags'])}")

    except Exception as e:
        print(f"❌ Error: {e}")

def print_database_contents():
    """Helper function to show what's in our mock database"""
    print("=== Mock Database Contents ===")
    database = create_mock_database()

    print("10 plasmids in database:")
    for plasmid in database:
        volumes = f"v1={plasmid.volume_1}"
        if plasmid.volume_2:
            volumes += f", v2={plasmid.volume_2}"
        print(f"  {plasmid} in {plasmid.bag} ({volumes})")

    print(f"\nBags used: {sorted(set(p.bag for p in database), key=database._natural_sort_key)}")

if __name__ == "__main__":
    print("Comprehensive Batch Search Testing")
    print("=" * 50)

    print_database_contents()
    print("\n" + "=" * 50)

    test_perfect_match()
    test_partial_match()
    test_no_matches()
    test_bag_grouping()
    test_duplicates_in_request()
    test_edge_case_inputs()
    test_real_world_scenario()

    print("\n" + "=" * 50)
    print("Batch search testing complete!")