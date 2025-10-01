from flask import Flask, request, jsonify
from flask_cors import CORS

from plasmid_record_repository import get_all_plasmids, find_plasmids, add_plasmid_record, modify_plasmid_record, delete_plasmid_record, check_database_health
from plasmid_records import Plasmid, PlasmidCollection, SampleCollection

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'success': True,
        'message': 'plasmid api is running'
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
    try:
        data = request.get_json()
        if not data or 'plasmid_collection' not in data:
            return jsonify({"error": "Missing 'plasmid_collection' field"}), 400

        user_input = data['plasmid_collection'].strip()
        
        # Input validation in Flask via plasmid_collection instance
        if not user_input:
            return jsonify({"error": "Search input cannot be empty"}), 400
        user_input_collection = PlasmidCollection.from_user_input(user_input)
        lots, sublots = user_input_collection.get_lots_sublots()
        results = find_plasmids(lots, sublots)

        return jsonify({
            "success": True,
            "summary": user_input_collection.to_dict(results),
            "result": [plasmid.to_dict() for plasmid in results]
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


#todo: this will require bag to be passed. means frontend will need to call and validate bag
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

            # Validate samples before creating plasmid
            samples = record.get('samples')
            if not samples or (isinstance(samples, list) and len(samples) == 0):
                return jsonify({"error": f"Record {i+1}: Cannot add plasmid without any samples/volumes"}), 400

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
        if not data or 'lot' not in data or 'sublot' not in data:
            return jsonify({"error": "Missing 'lot', 'sublot' fields"}), 400

        validated_plasmid = Plasmid(**data)
        modify_plasmid_record(validated_plasmid)

        return jsonify({
            "success": True,
            "message": f"Plasmid {data['lot']}-{data['sublot']} successfully updated"
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


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
