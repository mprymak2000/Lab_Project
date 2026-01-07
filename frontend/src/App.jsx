import React, {useEffect, useState, useRef} from 'react'
import BagCards from './components/display/BagCards.jsx'
import Sidebar from './components/layout/Sidebar.jsx'
import AddPlasmidRecords from './components/add/AddPlasmidRecords.jsx'
import {checkApiHealth, checkDatabaseHealth} from "./utils/healthChecks.js";
import Header from "./components/layout/Header.jsx";
import SearchPlasmidRecords from "./components/search/SearchPlasmidRecords.jsx";
import SampleTracking from "./components/track/SampleTracking.jsx";

const App = () => {
    //Display state
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [currentView, setCurrentView] = useState('bags'); // 'bags' | 'search' | 'add'
    const checkUnsavedChangesRef = useRef(() => false);

    //api/data state
    const [health, setHealth] = useState({api: 'disconnected', db: 'disconnected'})
    const [errors, setErrors] = useState({api: null, db: null})

    //Search connecting searchPlasmidRecords component and header (search bar). disables search button in header if actively searching
    const [refreshRecords, setRefreshRecords] = useState(false); //toggle to refresh
    const [searchTerm, setSearchTerm] = useState('');

    //loading state to be drilled into header search op and main page ops
    const [loading, setLoading] = useState(false);
    const [availableBags, setAvailableBags] = useState([]);

    // Simple authentication state
    const [isPasswordVerified, setIsPasswordVerified] = useState(localStorage.getItem('labPasswordVerified') === 'true');
    const [currentUser, setCurrentUser] = useState(localStorage.getItem('currentLabUser'));

    //  health check system, occurs every 30 seconds displayed in header
    useEffect(() => {
        const fetchHealth = async () => {
            const apiResult = await checkApiHealth();
            const dbResult = await checkDatabaseHealth();

            setHealth({api: apiResult.status, db: dbResult.status})
            setErrors(prev => ({...prev, api: apiResult.error, db: dbResult.error}))
        }

        void fetchHealth(); // Run immediately on mount

        // Set up intervals for periodic health checks
        const healthInterval = setInterval(fetchHealth, 30000); // Check every 30 seconds

        return () => clearInterval(healthInterval);
    }, []);

    // Generic navigation handler with unsaved changes check
    const handleNavigation = (destination) => {
        if (currentView === 'add') {
            checkUnsavedChangesRef.current(destination);
            return; // Don't change state until confirmed
        }
        setCurrentView(destination);
    };

    const handleSearch = (searchTerm) => {
        setSearchTerm(searchTerm);
        handleNavigation('search');
    };


    return (
        <div className="min-h-screen bg-gray-50">

            <Header
                health={health}
                onSearch={handleSearch}
                onSidebarToggle={() => setSidebarOpen(prev => !prev)}
                loading={loading}
            />

            {/* Sidebar - horizontal on small screens (below header), vertical on large (in flex) */}
            <div className="md:hidden pt-[123px]">
                <Sidebar
                    isOpen={sidebarOpen}
                    currentView={currentView}
                    onAddPlasmid={() => setCurrentView('add')}
                    onAllBagCards={() => handleNavigation('bags')}
                    onSearch={() => handleNavigation('search')}
                    onTrack={() => handleNavigation('track')}
                />
            </div>

            {/* Vertical sidebar on large screens - fixed position */}
            <div className="hidden md:block md:fixed md:left-0 md:top-[88px] md:h-[calc(100vh-88px)] md:z-40">
                <Sidebar
                    isOpen={sidebarOpen}
                    currentView={currentView}
                    onAddPlasmid={() => setCurrentView('add')}
                    onAllBagCards={() => handleNavigation('bags')}
                    onSearch={() => handleNavigation('search')}
                    onTrack={()=> handleNavigation('track')}
                />
            </div>

            {/* Main content - add left margin to account for fixed sidebar */}
            <div className={`flex-1 p-6 overflow-x-auto -mt-5 md:pt-[89px] ${sidebarOpen ? 'md:ml-52' : 'md:ml-0'} transition-all duration-300`}>

                    {/* Error Banner */}
                    {(errors.api || errors.db) && (
                        <div className="bg-red-50 border border-red-200 rounded-lg px-6 py-3 mb-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <div className="text-sm">
                                        {errors.api && <p className="text-red-800 font-medium">API Error: {errors.api}</p>}
                                        {errors.db && <p className="text-red-800 font-medium">Database Error: {errors.db}</p>}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setErrors({api: null, db: null})}
                                    className="text-red-600 hover:text-red-800"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* All Bag Cards View */}
                    {currentView === 'bags' &&
                        <BagCards
                            refreshRecords={refreshRecords}
                            onBagNamesChange={setAvailableBags}
                        />
                    }

                    {/* Add Plasmids Form View */}
                    {currentView === 'add' &&
                        <AddPlasmidRecords
                            onRefreshRecords={() => setRefreshRecords(prev => !prev)}
                            onUnsavedChangesCheck={(fn) => { checkUnsavedChangesRef.current = fn; }}
                            onNavigationRequested={(destination) => {
                                setCurrentView(destination === 'allBags' ? 'bags' : destination);
                            }}
                            availableBags={availableBags}
                        />
                    }
                    {/* Search Display */}
                    {currentView === 'search' &&
                        <SearchPlasmidRecords
                            searchTerm={searchTerm}
                            loading={loading}
                            setLoading={setLoading}
                        />
                    }

                    {/* Sample Manager */}
                    {currentView === 'track' &&
                        <SampleTracking/>
                    }

            </div>
        </div>
    );
};
export default App;
