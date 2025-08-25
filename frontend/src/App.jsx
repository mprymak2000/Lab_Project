import { useState } from 'react'
import BagCards from './BagCards'

const App = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null)
    const API_BASE_URL = 'http://localhost:5000'

    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            setError("Please enter plasmid IDs to search");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/api/search`, {
                method: 'POST',
                headers: {'Content-Type' : 'application/json',},
                body: JSON.stringify({plasmid_collection: searchTerm})
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Search failed')
            }

            console.log("API Response:", data.result);
            setResults(data.result);

        }

        catch (err) {
            setError(err.message);
            setResults(null);
        } finally { setLoading(false); }
    };

    const renderResults = () => {
        console.log("renderResults called, results:", results);
        if (!results) return null;
        return (
            <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Search Results: {results.found}
                </h3>
                <pre style={{background: '#f5f5f5', padding: '10px', fontSize: '12px'}}>
                    DEBUG: {JSON.stringify(results, null, 2)}
                </pre>

                {results.bags && Object.keys(results.bags).length > 0 ? (
                    <div className="space-y-4">
                        {Object.entries(results.bags).map(([bagName, plasmids]) => (
                            <div key={bagName} className="bg-white border rounded-lg overflow-hidden shadow">
                                <div className="bg-blue-50 px-4 py-2 border-b">
                                    <h4 className="font-medium text-blue-800">Bag: {bagName}</h4>
                                </div>
                                <div className="p-4">
                                    <ul className="space-y-2">
                                        {plasmids.map((plasmid, index) => (
                                            <li key={index} className="text-sm font-mono bg-gray-50 p-2 rounded">
                                                {plasmid}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-600">No plasmids found.</p>
                )}

                {results.not_found && results.not_found.length > 0 && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <h4 className="font-medium text-yellow-800 mb-2">Not Found:</h4>
                        <p className="text-yellow-700">{results.not_found.join(', ')}</p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">

            {/* Top Search Bar - Flat across the top */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold text-gray-800">🧬 Lab Plasmid Management</h1>
                        <div className="flex-1 max-w-2xl">
                            <input
                                type="text"
                                placeholder="(5317-2, C5, >5mL)"
                                value={searchTerm}
                                onChange = {(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={loading || !searchTerm.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                        Search
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto flex">

                {/* Sidebar */}
                <div className="w-64 bg-white border-r border-gray-200 min-h-screen p-4">
                    <nav className="space-y-2">
                        <a href="#" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg bg-blue-50 text-blue-700">
                            🧬 Search
                        </a>
                        <a href="#" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100">
                            ➕ Add Plasmid
                        </a>
                        <a href="#" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100">
                            📦 All Bags
                        </a>
                        <a href="#" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100">
                            📊 Statistics
                        </a>
                    </nav>
                </div>

                {/* Main content */}
                <div className="flex-1 p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4"> Recent Bags </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <BagCards />
                    </div>

                    {/* Search Results */}
                    {renderResults()}

                    {/* Error Display */}
                    {error && (
                        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-800">{error}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
export default App;
