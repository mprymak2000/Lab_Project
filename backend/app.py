from flask import Flask, request, jsonify
from flask_cors import CORS
from business_logic_refactor import batch_search_plasmids, add_plasmid, modify_plasmid, delete_plasmid

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'success': True,
        'message': 'plasmid api is running'
    }), 200

@app.route('/api/search', methods=['POST'])
def search_records():
    try:
        data = request.get_json()
        if not data or 'plasmid_collection' not in data:
            return jsonify({"error": "Missing 'plasmid_collection' field"}), 400

        plasmid_collection = data['plasmid_collection'].strip()

        results = batch_search_plasmids(plasmid_collection)
     #   print(f"DEBUG: Raw results = {results}")  # Add this line

        return jsonify({
            "success": True,
            "result": results
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


#todo: this will require bag to be passed. means frontend will need to call and validate bag
@app.route('/api/add', methods=['POST'])
def add_record():
    try:
        data = request.get_json()
        if not data or 'lot' not in data or 'sublot' not in data or 'volume_1' not in data:
            return jsonify({"error": "Missing 'lot', 'sublot' or 'volume_1' or 'bag' field"}), 400

        lot = data['lot']
        sublot = data['sublot']
        volume_1 = data['volume_1']
        volume_2 = data.get('volume_2') #optional
        notes = data.get('notes') #optional
        bag = data.get('bag') #optional

        result = add_plasmid(lot, sublot, volume_1, volume_2, notes)

        return jsonify({
            "success": True,
            "message": f"Plasmid {lot}-{sublot} successfully added to {result['bag']}"
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/modify', methods=['PUT'])
def modify_record():
    try:
        data = request.get_json()
        if not data or 'lot' not in data or 'sublot' not in data:
            return jsonify({"error": "Missing 'lot', 'sublot' fields"}), 400

        if not any([data.get('bag'), data.get('volume_1'), data.get('volume_2'), data.get('notes')]):
            return jsonify({"error": "must pass either volume, notes or bag to modify plasmid"}), 400

        # Both required
        lot = data['lot']
        sublot = data['sublot']

        # 1 required
        bag = data.get('bag')
        volume_1 = data.get('volume_1')
        volume_2 = data.get('volume_2')
        notes = data.get('notes')

        modify_plasmid(lot, sublot, volume_1, volume_2, notes, bag)

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
        if not data or 'lot' not in data or 'sublot' not in data:
            return jsonify({"error": "Missing 'lot', 'sublot' fields"}), 400

        lot = data['lot']
        sublot = data['sublot']

        delete_plasmid(lot, sublot)

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
    print("Server starting on localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
