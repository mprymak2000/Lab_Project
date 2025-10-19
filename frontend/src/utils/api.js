/**
 * Centralized API module for all backend communication
 * Contains all fetch calls to the Flask backend
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * Wrapper for fetch calls that provides better error messages
 * @param {Function} fetchFn - Async function containing the fetch logic
 * @returns {Promise<any>} - Result from the fetch function
 */
const handleApiCall = async (fetchFn) => {
    try {
        return await fetchFn();
    } catch (err) {
        // Network error (server down, CORS, wrong URL, etc.)
        if (err.message.includes('fetch') || err.message.includes('Failed to fetch')) {
            throw new Error(`Cannot connect to server at ${API_BASE_URL}. Check that the backend is running and accessible.`);
        }
        // Re-throw our custom errors
        throw err;
    }
};

/**
 * Search for plasmids using the search endpoint
 * @param {string} [user_input] - Plasmid IDs, Plasmid Lot, Bag (e.g., "5317-1" or "5317-1, 3380-2" or "3380" or "C20"). If empty/null, returns all plasmids.
 * @returns {Promise<Object>} - Search results with summary data
 */
export const searchPlasmids = async (user_input = '') => {
    return handleApiCall(async () => {
        const trimmedInput = user_input?.trim()

        const response = await fetch(`${API_BASE_URL}/api/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_input: trimmedInput })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Search failed');
        }

        const data = await response.json();
        if (!data.summary)
            return data.results;
        else return data.summary ;
    });
};

/**
 * Fetch all plasmids grouped by bags
 * @returns {Promise<Object>} - Object with bagName keys and record array values
 */
export const fetchAllBags = async () => {
    return handleApiCall(async () => {
        const response = await fetch(`${API_BASE_URL}/api/bags`);

        if (!response.ok) {
            const errorData = await response.json();
            const backendError = errorData.error || 'Unknown server error';
            throw new Error(`Failed to fetch bags from server. Backend error: ${backendError}`);
        }

        const result = await response.json();
        const allRecords = result.data;

        if (!allRecords) {
            throw new Error("No records received from API");
        }

        return allRecords;
    });
};

/**
 * Save NEW record records to the database
 * @param {PlasmidRecord|PlasmidRecord[]} records - Single record or array of records to save
 * @returns {Promise<void>}
 */
export const saveToDb = async (records) => {
    return handleApiCall(async () => {
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
        if (!response.ok) throw new Error(`Backend: ${result.error || "Failed to add record record(s)"}`);

        console.log("API Response:", result);
    });
}

/**
 * Edit a record record from the database
 * @param {PlasmidRecord} updatedRecord - The updated record record that was edited
 * @param {PlasmidRecord} prevRecord - The record record to edit
 * @returns {Promise<Object>} - Response from API
 */
export const editPlasmid = async (updatedRecord, prevRecord) => {
    return handleApiCall(async () => {
        const payload = {updated: updatedRecord.toAPIPayload(), previous: prevRecord.toAPIPayload()};

        console.log("Sending to API:", payload);

        const response = await fetch(`${API_BASE_URL}/api/modify`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(`Backend: ${result.error || "Failed to edit record record"}`);

        console.log("API Response:", result);
        return result;
    });
};

/**
 * Delete a record record from the database
 * @param {PlasmidRecord} record - The record record to delete
 * @returns {Promise<Object>} - Response from API
 */
export const deletePlasmid = async (record) => {
    return handleApiCall(async () => {
        const payload = record.toAPIPayload();
        console.log("Sending to API:", payload);

        const response = await fetch(`${API_BASE_URL}/api/delete`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(`Backend: ${result.error || "Failed to delete record record"}`);

        console.log("API Response:", result);
        return result;
    });
};

/**
 * Check out a record (moved out of bag/freezer)
 * @param {PlasmidRecord} record - The record to check out
 * @param sampleIndex int - The index of sample getting checked out
 * @param user string - name of user checking out the sample
 * @returns {Promise<Object>} - Response from API
 */
export const checkOut = async (record, sampleIndex, user) => {
    return handleApiCall(async () => {
        const payload = {"record": record.toAPIPayload(), "sample_index": sampleIndex, "checked_out_by": user};
        console.log("Sending to API:", payload);

        const response = await fetch(`${API_BASE_URL}/api/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(`Backend: ${result.error || "Failed to check out sample"}`);

        console.log("API Response:", result);
        return result;
    });
};

/**
 * Check in a record (moved into a bag/freezer)
 * @param {PlasmidRecord} record - The record to check in
 * @param sampleIndex int - The index of sample getting checked in
 * @returns {Promise<Object>} - Response from API
 */
export const checkIn = async (record, sampleIndex) => {
    return handleApiCall(async () => {
        const payload = {"record": record.toAPIPayload(), "sample_index": sampleIndex};
        console.log("Sending to API:", payload);

        const response = await fetch(`${API_BASE_URL}/api/checkin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(`Backend: ${result.error || "Failed to check in sample"}`);

        console.log("API Response:", result);
        return result;
    });
};

export const getCheckedOutRecords = async () => {
    return handleApiCall(async () => {
        const response = await fetch(`${API_BASE_URL}/api/getCheckedOut`);

        const result = await response.json();
        if (!response.ok) throw new Error(`Backend: ${result.error || "Failed to fetch checked out samples"}`);

        console.log("API Response:", result);

        const allCheckedOutRecords = result.data;

        if (!allCheckedOutRecords) {
            throw new Error("No records received from API");
        }
        return allCheckedOutRecords;
    })
}