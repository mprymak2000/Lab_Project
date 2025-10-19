import React, {useState} from 'react'

const Header = ({health, onSearch, onSidebarToggle, loading}) => {

    const [searchTerm, setSearchTerm] = useState('');


    return (
        <>
            {/* Top Search Bar - Responsive Header */}
            <div className="bg-gradient-to-r from-indigo-400 via-indigo-400 via-70% to-blue-400 border-b border-slate-200 px-6 py-4 fixed top-0 left-0 right-0 z-50">
                <div className="flex flex-col md:flex-row md:items-center gap-4">

                    {/* Left: Title and Toggle (on regular screens) / Top line (on small screens) */}
                    <div className="flex items-center justify-between md:justify-start md:flex-1">
                        <div className="flex items-center gap-4">
                            {/* Sidebar Toggle */}
                            <button
                                onClick={onSidebarToggle}
                                className="p-2 rounded-lg hover:bg-white/20"
                            >
                                {/*hamburger icon*/}
                                <div className="flex flex-col space-y-1">
                                    <div className="w-5 h-0.5 bg-white"></div>
                                    <div className="w-5 h-0.5 bg-white"></div>
                                    <div className="w-5 h-0.5 bg-white"></div>
                                </div>
                            </button>
                            {/* Title */}
                            <h1 className="text-xl font-semibold text-white min-w-80 hidden md:block">Immune Tech Data Management</h1>
                            <h1 className="text-xl font-semibold text-white md:hidden">Immune Tech LIMS</h1>
                        </div>

                        {/* Status Indicators */}
                        <div className="flex flex-row gap-4 items-center md:hidden">
                            {/* API Status for small screens*/}
                            <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full transition-all duration-300 mr-1 ${
                                    health.api === 'connected' ? 'bg-green-400 animate-pulse' :
                                        health.api === 'disconnected' ? 'bg-red-400 animate-pulse' :
                                            'bg-yellow-400 animate-pulse'
                                }`}></div>
                                <span className="text-white text-sm font-medium">
                                    API
                                </span>
                            </div>
                            {/* Database Status */}
                            <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full transition-all duration-300 mr-1 ${
                                    health.db === 'connected' ? 'bg-green-400 animate-pulse' :
                                        health.db === 'disconnected' ? 'bg-red-400 animate-pulse' :
                                            'bg-yellow-400 animate-pulse'
                                }`}></div>
                                <span className="text-white text-sm font-medium">
                                    Database
                                </span>
                            </div>
                        </div>

                    </div>

                    {/* Center: Search Bar (on regular screens) */}
                    <div className="flex items-center justify-center md:flex-1 md:justify-center md:ml-8">
                        <div className="group flex items-center gap-2 px-3 py-2 bg-indigo-100 hover:bg-indigo-50 rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.1)] focus-within:bg-indigo-50 focus-within:ring-1 focus-within:ring-inset focus-within:ring-indigo-400 transition-all duration-200">
                            <svg className="w-4 h-4 text-indigo-500 group-hover:text-indigo-600 group-focus-within:text-indigo-700 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="5317-2, 3380-4..."
                                value={searchTerm}
                                onChange = {(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && searchTerm.trim()) {
                                        onSearch(searchTerm);
                                    }
                                }}
                                className="bg-transparent border-none outline-none text-indigo-700 placeholder-indigo-500 group-focus-within:placeholder-indigo-400 text-sm font-medium w-48 md:w-64 transition-all duration-200"
                            />
                            <button
                                onClick={() => onSearch(searchTerm)}
                                disabled={loading || !searchTerm.trim()}
                                className={`px-3 py-1 rounded-md font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                                    loading || !searchTerm.trim()
                                        ? 'bg-indigo-200 text-indigo-400 cursor-not-allowed'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                }`}
                            >
                                Search
                            </button>
                        </div>
                    </div>

                    {/* Right: Status Indicators (on regular screens) */}
                    <div className="hidden md:flex md:flex-1 md:justify-end">
                        <div className="flex flex-col gap-1 items-start">

                            {/* API Status */}
                            <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full transition-all duration-300 mr-1 ${
                                    health.api === 'connected' ? 'bg-green-400 animate-pulse' :
                                        health.api === 'disconnected' ? 'bg-red-400 animate-pulse' :
                                            'bg-yellow-400 animate-pulse'
                                }`}></div>
                                <span className="text-white text-sm font-medium">
                                    API
                                </span>
                            </div>

                            {/* Database Status */}
                            <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full transition-all duration-300 mr-1 ${
                                    health.db === 'connected' ? 'bg-green-400 animate-pulse' :
                                        health.db === 'disconnected' ? 'bg-red-400 animate-pulse' :
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
        </>
    )
}
export default Header
