from flask import Flask, request, jsonify
from flask_cors import CORS

from plasmid_record_repository import get_all_plasmids, find_plasmids, add_plasmid_record, modify_plasmid_record, delete_plasmid_record, check_database_health, find_plasmids_by_bag, find_plasmids_by_lot
from plasmid_records import Plasmid, PlasmidCollection

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'success': True,
        'message': 'record api is running'
    }), 200

@app.route('/health/database', methods=['GET'])
def database_health_check():
    try:
        is_healthy, message = check_database_health()
        
        if is_healthy:
            return jsonify({
                'success': True,
                'message': message
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': message
            }), 503  # Service Unavailable
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Database health check failed: {str(e)}'
        }), 503

@app.route('/api/bags', methods =['GET'])
def get_bags():
    try:
        bags = get_all_plasmids().group_by_bags()

        return jsonify({
            "success": True,
            "data": bags
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/search', methods=['POST'])
def search_records():
    """
    Unified search function with input parsing, validation, and routing

    Input patterns:
    - "5317" -> search by lot only
    - "5317-1, 5317-2" -> search by specific lot-sublot combinations
    - "C25" -> search by bag
    """
    import re
    try:
        data = request.get_json()
        if not data or 'user_input' not in data:
            return jsonify({"error": "Missing 'user_input' field"}), 400

        user_input = data['user_input'].strip()

        # Clean up trailing dashes not followed by digits or commas
        # e.g., "3333-" -> "3333", "111-" -> "111"
        # but keep "3333-1" and "111-1, 222-2"
        user_input = re.sub(r'(\d+)-(?!\d)', r'\1', user_input)

        summary = {}

        # Input validation and routing:

        #empty?
        if not user_input:
            return jsonify({"error": "Search input cannot be empty"}), 400

        #bag search route - find all records for a bag
        if re.match(r'^[Cc]\d+$', user_input):
            # Validate bag format using Plasmid's validation
            validated_bag = Plasmid.validate_bag(user_input)
            results = find_plasmids_by_bag(validated_bag)

        #lot search route - find all variants for a lot number
        elif re.match(r'^\d+$', user_input):
            # Validate lot format using Plasmid's validation
            validated_lot = Plasmid.validate_lot(user_input)
            results = find_plasmids_by_lot(validated_lot)
        # Otherwise, treat as record collection (lot-sublot combinations)
        else:
            try:
                # Use existing PlasmidCollection parsing (which does its own validation)
                # this is instantiated using factory function so we need try catch
                user_input_collection = PlasmidCollection.from_user_input(user_input)
                results = find_plasmids(user_input_collection)
                summary = user_input_collection.to_dict(results)
            except Exception as e:
                raise ValueError(f"Invalid search input format: {user_input}. Expected formats: '5317', '5317-1', '5317-1, 5317-2', or 'C25'. Error: {str(e)}")

        # For bag/lot searches, create consistent summary format
        if not summary:
            summary = {
                "bags": results.group_by_bags(),
                "found": f"{len(results)}"
            }

        ##Summary groups by bags and shows found count. results ungrouped
        return jsonify({
            "success": True,
            "summary": summary,
            "results": [plasmid.to_dict() for plasmid in results]
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/getCheckedOut', methods=['GET'])
def get_checked_out_samples():
    try:
        checked_out_samples = find_plasmids(filters={"checked_out": True})
        return jsonify({
            "success": True,
            "data": checked_out_samples.group_by_bags()
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/add', methods=['POST'])
def add_record():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Handle both single record and list of records
        records_data = data if isinstance(data, list) else [data]
        
        if len(records_data) == 0:
            return jsonify({"error": "No records provided"}), 400

        validated_plasmids = []
        
        # Validate each record
        for i, record in enumerate(records_data):
            if not record or 'lot' not in record or 'sublot' not in record or 'samples' not in record or 'bag' not in record:
                return jsonify({"error": f"Record {i+1}: Missing 'lot', 'sublot', 'samples' or 'bag' field"}), 400

            # Validate samples before creating record
            samples = record.get('samples')
            if not samples or (isinstance(samples, list) and len(samples) == 0):
                return jsonify({"error": f"Record {i+1}: Cannot add record without any samples/volumes"}), 400

            validated_plasmid = Plasmid(**record)
            validated_plasmids.append(validated_plasmid)

        # Add all plasmids in a single transaction
        result = add_plasmid_record(validated_plasmids)
        
        # Create response message
        if len(validated_plasmids) == 1:
            plasmid = validated_plasmids[0]
            message = f"Plasmid {plasmid.lot}-{plasmid.sublot} successfully added to {plasmid.bag}"
        else:
            message = f"Successfully added {len(validated_plasmids)} plasmids"

        return jsonify({
            "success": True,
            "message": message,
            "inserted_count": result["inserted_count"],
            "plasmids": result["plasmids"]
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/modify', methods=['PUT'])
def modify_record():
    try:
        data = request.get_json()
        if not data or 'updated' not in data or 'previous' not in data:
            return jsonify({"error": "Missing 'updated' or 'previous' record records"}), 400

        updated, previous = data.get('updated'), data.get('previous')
        if 'bag' not in previous or 'lot' not in previous or 'sublot' not in previous:
            return jsonify({"error": "Plasmid record to be updated is missing crucial fields: 'lot', 'sublot' or 'bag' for previous record"}), 400

        if 'bag' not in updated or 'lot' not in updated or 'sublot' not in updated:
            return jsonify({"error": "Updated record record is missing crucial fields: 'lot', 'sublot' or 'bag' for updated record"}), 400

        updated_plasmid = Plasmid(**data['updated'])
        previous_plasmid = Plasmid(**data['previous'])

        if str(updated_plasmid) != str(previous_plasmid):
            return jsonify({"Cannot change lot-sublot. If the id changed, please delete old record and make a new one"}), 400

        modify_plasmid_record(updated_plasmid, previous_plasmid)

        return jsonify({
            "success": True,
            "message": f"Plasmid {updated_plasmid.lot}-{updated_plasmid.sublot} successfully updated"
        }), 201

    except Exception as e:
        return jsonify({"error": str

        (e)}), 500


@app.route('/api/delete', methods=['DELETE'])
def delete_record():
    try:
        data = request.get_json()
        if not data or 'lot' not in data or 'sublot' not in data or 'bag' not in data:
            return jsonify({"error": "Missing 'lot', 'sublot' or 'bag' fields"}), 400

        validated_plasmid = Plasmid(**data)
        delete_plasmid_record(validated_plasmid)

        return jsonify({
            "success": True,
            "message": f"Plasmid {data['lot']}-{data['sublot']} successfully deleted"
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/checkout', methods=['POST'])
def checkout_sample():
    """
        Check out a sample - mark it as taken from freezer
        Expected payload:
        {
            "record": { full record object },
            "sample_index": 0,
            "checked_out_by": "John Doe"
        }
        """
    try:
        data = request.get_json()
        if not data or 'record' not in data or 'sample_index' not in data or 'checked_out_by' not in data:
            return jsonify({"error": "Missing required fields: 'record', 'sample_index', or 'checked_out_by'"}), 400

        # Create record from full object
        plasmid = Plasmid(**data['record'])

        sample_index = int(data['sample_index'])
        if sample_index >= len(plasmid.samples) or sample_index < 0:
            return jsonify({"error": f"Invalid sample_index {sample_index}. Must be between 0 and {len(plasmid.samples)-1}"}), 400

        #update checkout status
        sample = plasmid.samples[sample_index]
        if sample.is_checked_out:
            return jsonify({"error": f"Sample at index {sample_index} is already checked out by {sample.checked_out_by}"}), 400

        from datetime import datetime
        sample.is_checked_out = True
        sample.checked_out_by = data['checked_out_by']
        sample.checked_out_at = datetime.now()

        #save
        modify_plasmid_record(plasmid)
        return jsonify({
            "success": True,
            "message": f"Sample {sample_index} of record {plasmid.lot}-{plasmid.sublot} checked out by {data['checked_out_by']}"
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/checkin', methods=['POST'])
def checkin_sample():
    """
        Check in a sample - mark it as returned to freezer
        Expected payload:
        {
            "record": { full record object },
            "sample_index": 0
        }
        """
    try:
        data = request.get_json()
        if not data or 'record' not in data or 'sample_index' not in data:
            return jsonify({"error": "Missing required fields: 'record', 'sample_index'"}), 400

        # Create record from full object
        plasmid = Plasmid(**data['record'])

        sample_index = int(data['sample_index'])
        if sample_index >= len(plasmid.samples) or sample_index < 0:
            return jsonify({"error": f"Invalid sample_index {sample_index}. Must be between 0 and {len(plasmid.samples)-1}"}), 400

        #update checkin status
        sample = plasmid.samples[sample_index]
        if not sample.is_checked_out:
            return jsonify({"error": f"Sample at index {sample_index} is not checked out"}), 400

        from datetime import datetime
        sample.is_checked_out = False
        sample.checked_in_at = datetime.now()
        # Keep checked_out_by and checked_out_at for history

        #save
        modify_plasmid_record(plasmid)
        return jsonify({
            "success": True,
            "message": f"Sample {sample_index} of record {plasmid.lot}-{plasmid.sublot} checked in successfully"
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({"error": "Method not allowed"}), 405

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

@app.errorhandler(400)
def bad_request(error):
    return jsonify({"error": "Bad request"}), 400

if __name__ == '__main__':
    print("Server starting on port 5000 - updated code")
    app.run(host='0.0.0.0', port=5000, debug=True)
