import { useState } from 'react'
import AllBags from './AllBags.jsx'
import Sidebar from './Sidebar'
import AddPlasmidModal from './AddPlasmidModal'

const App = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null)
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
    const [sideBarOpen, setSideBarOpen] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);


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

             console.log("API Response:", data.summary);
             setResults(data.summary);
        }

        catch (err) {
             setError(err.message);
             setResults(null);
        } finally { setLoading(false); }
    };

    const renderResults = () => {
        if (!results) return null;
        
        const formatDate = (dateString) => {
            if (!dateString) return 'N/A';
            try {
                return new Date(dateString).toLocaleDateString('en-US', {
                    month: 'short',
                    day: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch {
                return dateString;
            }
        };

        return (
            <div className="mt-6">
                {/* Search Summary */}
                <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <h3 className="text-lg font-semibold text-gray-800">
                        🔍 Search Results
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                        Found <span className="font-semibold text-blue-600">{results.found}</span> plasmids
                    </p>
                </div>

                {/* Results by Bag */}
                {results.bags && Object.keys(results.bags).length > 0 ? (
                    <div className="space-y-6">
                        {Object.entries(results.bags).map(([bagName, plasmids]) => (
                            <div key={bagName} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                                {/* Bag Header */}
                                <div className="bg-gradient-to-r from-indigo-500 to-blue-500 px-6 py-3">
                                    <h4 className="text-white font-semibold text-lg">
                                        📦 Bag {bagName}
                                        <span className="ml-2 text-blue-100 text-sm font-normal">
                                            ({plasmids.length} plasmid{plasmids.length !== 1 ? 's' : ''})
                                        </span>
                                    </h4>
                                </div>

                                {/* Plasmids in this bag */}
                                <div className="divide-y divide-gray-100">
                                    {plasmids.map((plasmid, index) => (
                                        <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                                            {/* Plasmid Header */}
                                            <div className="flex items-center justify-between mb-3">
                                                <h5 className="text-lg font-mono font-semibold text-gray-900">
                                                    🧬 {plasmid.id}
                                                </h5>
                                                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                                    {plasmid.volumes?.length || 0} sample{plasmid.volumes?.length !== 1 ? 's' : ''}
                                                </span>
                                            </div>

                                            {/* Notes */}
                                            {plasmid.notes && (
                                                <div className="mb-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r">
                                                    <p className="text-sm text-gray-700">
                                                        <span className="font-medium">📝 Notes:</span> {plasmid.notes}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Samples/Volumes */}
                                            {plasmid.volumes && plasmid.volumes.length > 0 ? (
                                                <div className="space-y-2">
                                                    <h6 className="text-sm font-medium text-gray-700 mb-2">💧 Samples:</h6>
                                                    <div className="grid gap-2">
                                                        {plasmid.volumes.map((sample, sampleIndex) => (
                                                            <div key={sampleIndex} 
                                                                 className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="font-mono font-semibold text-blue-900">
                                                                        {sample.volume} mL
                                                                    </span>
                                                                    <div className="text-xs text-gray-600 space-y-1">
                                                                        <div>Created: {formatDate(sample.date_created)}</div>
                                                                        <div>Modified: {formatDate(sample.date_modified)}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded border-l-4 border-gray-300">
                                                    ⚠️ No samples recorded for this plasmid
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center p-8 bg-white rounded-lg border border-gray-200">
                        <div className="text-6xl mb-4">🔍</div>
                        <p className="text-gray-600 text-lg">No plasmids found matching your search.</p>
                    </div>
                )}

                {/* Not Found Section */}
                {results.not_found && results.not_found.length > 0 && (
                    <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
                        <div className="flex items-center">
                            <div className="text-yellow-400 mr-2">⚠️</div>
                            <h4 className="font-medium text-yellow-800">Plasmids Not Found</h4>
                        </div>
                        <p className="text-yellow-700 mt-2">
                            The following plasmids were not found in the database:
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {results.not_found.map((plasmid, index) => (
                                <span key={index} className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded font-mono text-sm">
                                    {plasmid}
                                </span>
                            ))}
                        </div>
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
                        <button
                            onClick={() => setSideBarOpen(prevState => !prevState)}
                            className="p-2 rounded-lg hover:bg-gray-100"
                        >
                            <div className="flex flex-col space-y-1">
                                <div className="w-5 h-0.5 bg-gray-600"></div>
                                <div className="w-5 h-0.5 bg-gray-600"></div>
                                <div className="w-5 h-0.5 bg-gray-600"></div>
                            </div>
                        </button>
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
                <Sidebar
                    isOpen={sideBarOpen}
                    onAddPlasmid={() => setShowAddModal(true)}
                />
                {/* Main content */}

                <div className="flex-1 p-6">
                    <AllBags/>

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

            {/* Modal Overlay */}
            <AddPlasmidModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
            />
        </div>
    );
};
export default App;
