const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const saveToDb = async (records) => {

    try {
        // Handle both single record and array of records
        const recordsArray = Array.isArray(records) ? records : [records];

        // serialize payload
        const payload = recordsArray.length === 1
            ? recordsArray[0].toAPIPayload()
            : recordsArray.map(record => record.toAPIPayload());

        const response = await fetch(`${API_BASE_URL}/api/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (!response.ok) throw new Error(result.error || 'Failed to add plasmid(s)');

        console.log("API Response:", result);

    }
    catch (err) {
        console.error('Error adding plasmid(s):', err);
        throw err; // Re-throw so calling components can handle it
    }
}
export default saveToDb;