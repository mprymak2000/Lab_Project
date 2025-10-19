import React, {useState, useEffect} from 'react'
import { searchPlasmids } from "../../utils/api.js";
import BagCardInlineRow from "../display/BagCards/BagCard/BagCardInlineRow.jsx";
import {PlasmidRecord} from "../../utils/PlasmidRecord.js";
import { sortPlasmidIds } from '../../utils/sortingUtils.js';
import { AlertTriangle, SearchX } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner.jsx';


const SearchPlasmidRecords = ({searchTerm, loading, setLoading}) => {
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const [expandedRecords, setExpandedRecords] = useState([]);

    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            setError("Please enter record IDs to search");
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const result = await searchPlasmids(searchTerm);
            console.log("API Response:", result);

            // Convert bags to PlasmidRecord instances while preserving summary data
            const convertedBags = {};
            if (result.bags) {
                for (const [bagName, plasmids] of Object.entries(result.bags)) {
                    convertedBags[bagName] = plasmids.map(plasmid => {
                        return new PlasmidRecord({...plasmid, bag: bagName});
                    });
                }
            }

            const finalResults = {
                ...result,
                bags: convertedBags
            };

            console.log("Final results:", finalResults);
            setResults(finalResults);
        }
        catch (err) {
            setError(err.message);
            setResults(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (searchTerm) {
            handleSearch();
        }
    }, [searchTerm]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape')
                if (expandedRecords) setExpandedRecords([]);
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [expandedRecords])

    const handleViewDetails = (plasmid) => {
        setExpandedRecords(prev => {
            // Check if this record is already expanded
            const isAlreadyExpanded = prev.some(record => record.equals(plasmid));

            if (isAlreadyExpanded) {
                // Remove it from the array
                return prev.filter(record => !record.equals(plasmid));
            } else {
                // Add it to the array
                return [...prev, plasmid];
            }
        });
    }

    const handleCheckIO = (bagName, plasmidIndex, plasmid, newSamples) => {
        // Create the updated plasmid
        const updatedPlasmid = new PlasmidRecord({
            ...plasmid,
            samples: newSamples
        });

        // Update only the specific plasmid in results
        setResults(prevResults => {
            const updatedBags = { ...prevResults.bags };
            updatedBags[bagName] = [...updatedBags[bagName]];
            updatedBags[bagName][plasmidIndex] = updatedPlasmid;

            return {
                ...prevResults,
                bags: updatedBags
            };
        });

        // Update expandedRecords to maintain expanded state with new plasmid reference
        setExpandedRecords(prevExpanded => {
            return prevExpanded.map(expandedRecord =>
                expandedRecord.equals(plasmid) ? updatedPlasmid : expandedRecord
            );
        });
    }

    return (
        <div>
            {/* Header Section */}
            <div className="mb-6 mt-10 -ml-6">
                <div className="inline-block pl-10 px-5 py-3 shadow-[0_4px_12px_rgba(251,146,60,0.25)] rounded-r-xl" style={{backgroundImage: 'linear-gradient(to right, rgb(251 166 96), rgb(253 184 120))'}}>
                    <h1 className="text-2xl font-bold text-white mb-1">Search Plasmid Records</h1>
                    <p className="text-white text-sm font-medium">
                        Search by plasmid IDs, lot numbers, or bag locations.
                    </p>
                </div>

            </div>

            {/* Query display */}
            {searchTerm && (
                <div className="ml-10 mb-10 mt-15">
                    <div className="flex items-center gap-2 text-indigo-600">
                        <span className="text-sm font-medium">Searching for:</span>
                        <code className="px-3 py-1.5 bg-blue-100 text-indigo-800 rounded-md text-sm font-mono border border-gray-200">
                            {searchTerm.split(/[,;\s]+/).filter(Boolean).join(', ')}
                        </code>
                    </div>
                </div>
            )}

            {/* Loading Spinner */}
            {loading && <LoadingSpinner message="Searching plasmids..." />}

            {/* Main Content Layout */}
            {!loading && results ? (
                <>
                    {/* Found Results */}
                    {results.bags && Object.keys(results.bags).length > 0 && (
                        <div className="mb-5 pb-10">
                            {/* Found Count Box */}
                            <div className="flex justify-center mx-5">
                                <div className="flex items-center justify-center w-full mb-5 gap-3 py-3 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-xl shadow-sm">
                                    <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                                    <span className="text-xl font-semibold text-gray-50">
                                        {results.found} Plasmids Found
                                    </span>
                                </div>
                            </div>

                            {/* Display results using compact inline rows in responsive grid */}
                            <div className="mx-10 grid grid-cols-[repeat(auto-fit,minmax(350px,1fr))] gap-5 items-start">
                                {Object.entries(results.bags).map(([bagName, plasmids]) => (
                                    <div key={bagName} className="max-w-100 flex shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 rounded-lg overflow-hidden">
                                        {/* Bag Name on Left */}
                                        <div className="bg-gradient-to-b from-indigo-400 to-indigo-500 text-white px-3 font-bold text-xl flex items-center justify-center min-h-5">
                                            {bagName}
                                        </div>

                                        {/* Plasmid Rows */}
                                        <div className="bg-slate-50 flex-1">
                                            {plasmids.map((plasmid, index) => (
                                                <BagCardInlineRow
                                                    key={plasmid.getFullId()}
                                                    plasmid={plasmid}
                                                    isExpanded={expandedRecords.some(record => record.equals(plasmid))}
                                                    onViewDetails={() => handleViewDetails(plasmid)}
                                                    onCheckIO={(plasmid, newSamples) => handleCheckIO(bagName, index, plasmid, newSamples)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* No results message - show when NO bags found */}
                    {(!results.bags || Object.keys(results.bags).length === 0) && (
                        <div className="flex items-center py-5 justify-center gap-3 text-gray-500 mt-12">
                            <SearchX size={28} />
                            <p className="text-xl">No plasmids found</p>
                        </div>
                    )}
                </>

            ) : error ? (
                <div className="bg-red-100 rounded-xl mx-10 px-5 py-2 flex items-center justify-center gap-2 text-red-600 mt-6">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="font-medium">{error}</p>
                </div>
            ) : (
                <div className="flex items-center py-5 justify-center gap-3 text-gray-500 mt-12">
                    <p className="text-xl">Much empty... Use the search bar and results will show here!</p>
                </div>
            )}

            {/* Missing Plasmids - only show when there ARE found bags */}
            {!loading && results && results.bags && Object.keys(results.bags).length > 0 && results.not_found && results.not_found.length > 0 && (
                <div className="bg-white shadow-md rounded-xl mx-5 mt-8 overflow-hidden flex flex-col lg:flex-row">
                    {/* Header on small/medium, sidebar on large */}
                    <div className="flex flex-row flex-nowrap items-center gap-2 px-6 py-3 flex-shrink-0" style={{backgroundImage: 'linear-gradient(to right, rgb(251 166 96), rgb(253 184 120))'}}>
                        <AlertTriangle className="w-5 h-5 text-white flex-shrink-0" strokeWidth={2.5} />
                        <span className="text-lg font-bold text-white whitespace-nowrap">
                            {results.not_found.length} Missing
                        </span>
                    </div>

                    {/* List below on small/medium, right on large */}
                    <div className="flex flex-wrap gap-3 p-5 flex-1">
                        {[...results.not_found].sort(sortPlasmidIds).map((plasmid) => (
                            <div
                                key={plasmid}
                                className="bg-orange-100 text-orange-800 min-w-20 font-mono text-sm font-semibold px-3 py-1 rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-center border border-orange-200"
                            >
                                {plasmid}
                            </div>
                        ))}
                    </div>
                </div>
             )}

        </div>
    )
}
export default SearchPlasmidRecords


