from flask import Flask, request, jsonify
from flask_cors import CORS

from business_logic_refactor import get_all_plasmids, find_plasmids, add_plasmid_record, modify_plasmid_record, delete_plasmid_record
from plasmid_records import Plasmid, PlasmidCollection, SampleCollection

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'success': True,
        'message': 'plasmid api is running'
    }), 200

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
        
        # Input validation in Flask
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
        if not data or 'lot' not in data or 'sublot' not in data or 'volumes' not in data or 'bag' not in data:
            return jsonify({"error": "Missing 'lot', 'sublot' or 'volume_1' or 'bag' field"}), 400


        lot = data['lot']
        sublot = data['sublot']
        volumes = data.get('volumes')
        notes = data.get('notes')
        bag = data['bag']

        # Validate volumes before creating plasmid
        if not volumes or (isinstance(volumes, list) and len(volumes) == 0):
            return jsonify({"error": "Cannot add plasmid without any samples/volumes"}), 400

        validated_plasmid = Plasmid(lot, sublot, bag, volumes, notes)
        add_plasmid_record(validated_plasmid)

        return jsonify({
            "success": True,
            "message": f"Plasmid {lot}-{sublot} successfully added to {bag}"
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/modify', methods=['PUT'])
def modify_record():
    try:
        data = request.get_json()
        if not data or 'lot' not in data or 'sublot' not in data:
            return jsonify({"error": "Missing 'lot', 'sublot' fields"}), 400

        # Both required
        lot = data['lot']
        sublot = data['sublot']
        bag = data['bag']
        volumes = data.get('volumes')
        notes = data.get('notes')

        validated_plasmid = Plasmid(lot, sublot, bag, volumes, notes)
        modify_plasmid_record(validated_plasmid)

        return jsonify({
            "success": True,
            "message": f"Plasmid {lot}-{sublot} successfully updated"
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/delete', methods=['DELETE'])
def delete_record():
    try:
        data = request.get_json()
        if not data or 'lot' not in data or 'sublot' not in data or 'bag' not in data:
            return jsonify({"error": "Missing 'lot', 'sublot' or 'bag' fields"}), 400

        lot = data['lot']
        sublot = data['sublot']
        bag = data['bag']
        volumes = data.get('volumes')
        notes = data.get('notes')

        validated_plasmid = Plasmid(lot, sublot, bag, volumes, notes)
        delete_plasmid_record(validated_plasmid)

        return jsonify({
            "success": True,
            "message": f"Plasmid {lot}-{sublot} successfully deleted"
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
