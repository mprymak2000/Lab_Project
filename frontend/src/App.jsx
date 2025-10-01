import React, {useEffect, useState, useRef} from 'react'
import BagCards from './components/display/BagCards.jsx'
import Sidebar from './components/layout/Sidebar.jsx'
import AddPlasmidRecords from './components/add/AddPlasmidRecords.jsx'
import {PlasmidRecord} from "./utils/PlasmidRecord.js";

const App = () => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null)
    const [sideBarOpen, setSideBarOpen] = useState(true);
    const [showSearch, setShowSearch] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAllBagCards, setShowAllBagCards] = useState(true);
    const [data, setData] = useState({});
    const checkUnsavedChangesRef = useRef(() => false);
    const [refreshData, setRefreshData] = useState(false);
    const [apiStatus, setApiStatus] = useState('unknown'); // 'connected', 'disconnected', 'unknown'
    const [dbStatus, setDbStatus] = useState('unknown'); // 'connected', 'disconnected', 'unknown'

    const checkApiHealth = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/health`);
            if (response.ok) {
                setApiStatus('connected');
            } else {
                setApiStatus('disconnected');
            }
        } catch (err) {
            setApiStatus('disconnected');
        }
    };

    const checkDatabaseHealth = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/health/database`);
            if (response.ok) {
                setDbStatus('connected');
            } else {
                setDbStatus('disconnected');
            }
        } catch (err) {
            setDbStatus('disconnected');
        }
    };

    const importAll = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/api/bags`);
            const frontendData = await response.json();

            if (!response.ok) {
                throw new Error(frontendData.error || 'Failed to fetch bags');
            }
            
            console.log("API Response:", frontendData);
            console.log("API Response data:", frontendData.data);
            console.log("Data type:", typeof frontendData.data);

            // Check if data exists and is the right format
            if (!frontendData.data) {
                throw new Error("No data received from API");
            }

            // Convert plain objects to PlasmidRecord instances
            const convertedData = {};
            for (const [bagName, plasmids] of Object.entries(frontendData.data)) {
                console.log(`Processing bag ${bagName}:`, plasmids);
                console.log(`Plasmids is array:`, Array.isArray(plasmids));

                if (!Array.isArray(plasmids)) {
                    console.error(`Expected array for bag ${bagName}, got:`, typeof plasmids, plasmids);
                    continue;
                }

                convertedData[bagName] = plasmids.map(plasmid => {
                    console.log('Converting plasmid:', plasmid);
                    return new PlasmidRecord({...plasmid, bag: bagName});
                });
            }
            setData(convertedData)
        }
        catch (err) {
            setError(err.message);
            console.error('Error fetching bags:', err);
        } finally { setLoading(false); }
    }

    // in case the api url changes, this forces reload
    useEffect(() => {
        importAll();
        console.log("refreshed!")
    }, [API_BASE_URL, refreshData]);

    // Separate health check system - runs independently of data operations
    useEffect(() => {
        // Initial health checks
        checkApiHealth();
        checkDatabaseHealth();
        
        // Set up intervals for periodic health checks
        const apiHealthInterval = setInterval(checkApiHealth, 30000); // Check every 30 seconds
        const dbHealthInterval = setInterval(checkDatabaseHealth, 30000); // Check every 30 seconds
        
        return () => {
            clearInterval(apiHealthInterval);
            clearInterval(dbHealthInterval);
        };
    }, [API_BASE_URL]);

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
            if (!dateString) return '—';
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
                                    {plasmids.map((plasmid) => (
                                        <div key={`${bagName}-${plasmid.id}`} className="p-6 hover:bg-gray-50 transition-colors">
                                            {/* Plasmid Header */}
                                            <div className="flex items-center justify-between mb-3">
                                                <h5 className="text-lg font-mono font-semibold text-gray-900">
                                                    🧬 {plasmid.id}
                                                </h5>
                                                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                                    {plasmid.samples?.length || 0} sample{plasmid.samples?.length !== 1 ? 's' : ''}
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
                                            {plasmid.samples && plasmid.samples.length > 0 ? (
                                                <div className="space-y-2">
                                                    <h6 className="text-sm font-medium text-gray-700 mb-2">💧 Samples:</h6>
                                                    <div className="grid gap-2">
                                                        {plasmid.samples.map((sample, sampleIndex) => (
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
                            {results.not_found.map((plasmid) => (
                                <span key={plasmid} className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded font-mono text-sm">
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
            <div className="bg-indigo-400 border-b border-slate-200 px-6 py-4">
                <div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {/* Sidebar Toggle */}
                            <button
                                onClick={() => setSideBarOpen(prevState => !prevState)}
                                className="p-2 rounded-lg hover:bg-white/20"
                            >
                                <div className="flex flex-col space-y-1">
                                    <div className="w-5 h-0.5 bg-white"></div>
                                    <div className="w-5 h-0.5 bg-white"></div>
                                    <div className="w-5 h-0.5 bg-white"></div>
                                </div>
                            </button>
                            {/* Title */}
                            <h1 className="text-xl font-bold text-white">Immune Tech Data Management</h1>
                        </div>
                        {/* Search Bar */}
                        <div className="flex items-center gap-4 w-100">
                            <input
                                type="text"
                                placeholder="5317-2, 3380-4..."
                                value={searchTerm}
                                onChange = {(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2 bg-indigo-100 text-gray-700 font-medium border-indigo-300 border-2 rounded-lg focus:outline-none"
                            />
                            <button
                                onClick={handleSearch}
                                disabled={loading || !searchTerm.trim()}
                                className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-400 transition-all duration-200"
                            >
                            Search
                            </button>
                        </div>
                        {/* Status Indicators */}
                        <div className="flex flex-col gap-1 items-start ml-3">
                            {/* API Status */}
                            <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full transition-all duration-300 mr-1 ${
                                    apiStatus === 'connected' ? 'bg-green-400 animate-pulse' : 
                                    apiStatus === 'disconnected' ? 'bg-red-400 animate-pulse' : 
                                    'bg-yellow-400 animate-pulse'
                                }`}></div>
                                <span className="text-white text-sm font-medium">
                                    API
                                </span>
                            </div>
                            
                            {/* Database Status */}
                            <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full transition-all duration-300 mr-1 ${
                                    dbStatus === 'connected' ? 'bg-green-400 animate-pulse' : 
                                    dbStatus === 'disconnected' ? 'bg-red-400 animate-pulse' : 
                                    'bg-yellow-400 animate-pulse'
                                }`}></div>
                                <span className="text-white text-sm font-medium">
                                    Database
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex">
                <Sidebar
                    isOpen={sideBarOpen}
                    currentView={showAllBagCards ? 'bags' : showSearch ? 'search' : showAddModal ? 'add' : 'bags'}
                    onAddPlasmid={() => {
                        setShowAddModal(true);
                        setShowAllBagCards(false);
                        setShowSearch(false);
                    }}
                    onAllBagCards={() => {
                        if (showAddModal) {
                            checkUnsavedChangesRef.current('allBags');
                            return; // Don't change state until confirmed
                        }
                        setShowAllBagCards(true);
                        setShowAddModal(false);
                        setShowSearch(false);
                    }}
                    onSearch={() => {
                        if (showAddModal) {
                            checkUnsavedChangesRef.current('search');
                            return; // Don't change state until confirmed
                        }
                        setShowSearch(true);
                        setShowAllBagCards(false);
                        setShowAddModal(false);
                    }}
                />
                {/* Main content */}
                    <div className="flex-1 p-6">
                        {/* All Bag Cards View */}
                        {showAllBagCards && searchTerm==='' &&
                            <BagCards
                            isOpen={showAllBagCards}
                            data={data}
                            />
                        }

                        {/* Add Plasmids Form View */}
                        {showAddModal && searchTerm==='' &&
                            <AddPlasmidRecords
                                onRefreshData={() => setRefreshData(prev => !prev)}
                                onUnsavedChangesCheck={(fn) => { checkUnsavedChangesRef.current = fn; }}
                                onNavigationRequested={(destination) => {
                                    if (destination === 'allBags') {
                                        setShowAllBagCards(true);
                                        setShowAddModal(false);
                                        setShowSearch(false);
                                    } else if (destination === 'search') {
                                        setShowSearch(true);
                                        setShowAllBagCards(false);
                                        setShowAddModal(false);
                                    }
                                }}
                            />
                        }

                    {/* Search Results */}
                    {(showSearch || searchTerm !== '') && renderResults()}

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
