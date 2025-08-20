import { useState } from 'react'
import BagCards from './BagCards'

const App = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState(null);

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
                            onClick={() => setResults(`Searching for: ${searchTerm}`)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
                    {results && (
                        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-green-800">{results}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
export default App;
