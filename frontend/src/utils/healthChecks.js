const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const checkApiHealth = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
            return { status: 'connected', error: null };
        } else {
            return { status: 'disconnected', error: `API returned ${response.status}` };
        }
    } catch (err) {
        return { status: 'disconnected', error: err.message };
    }
};

export const checkDatabaseHealth = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/health/database`);
        if (response.ok) {
            return { status: 'connected', error: null };
        } else {
            return { status: 'disconnected', error: `Database health check returned ${response.status}` };
        }
    } catch (err) {
        return { status: 'disconnected', error: err.message };
    }
};