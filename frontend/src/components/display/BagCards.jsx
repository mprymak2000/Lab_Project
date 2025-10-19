import React, {useEffect, useState, useCallback, useMemo} from 'react'
import BagCard from "./BagCards/BagCard.jsx";
import { Search, SearchX, UserX, Calendar, Clock } from 'lucide-react';
import filterByLocalSearch from '../../utils/filterByLocalSearch.js';
import { fetchAllBags } from '../../utils/api.js';
import { sortBagNames } from '../../utils/sortingUtils.js';
import {PlasmidRecord} from "../../utils/PlasmidRecord.js";
import LoadingSpinner from '../common/LoadingSpinner.jsx';

const BagCards = ({refreshRecords, onBagNamesChange}) => {



    // state
    const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [records, setRecords] = useState({}); // Object with bagName keys and record array values
    const [filteredRecords, setFilteredRecords] = useState({}); // Filtered records for display
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearchInput, setDebouncedSearchInput] = useState('');
    const [showCheckedOutOnly, setShowCheckedOutOnly] = useState(false);
    const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'thisMonth', 'last6Months', 'last12Months'
    const [timeFilterType, setTimeFilterType] = useState('added'); // 'added' or 'modified'

    const importAllRecords = async () => {
        setLoading(true);
        setError(null);

        try {
            const allRecords = await fetchAllBags();

            // Convert plain objects to PlasmidRecord instances
            const convertedRecords = {};
            for (const [bagName, plasmids] of Object.entries(allRecords)) {
                console.log(`Processing bag ${bagName}:`, plasmids);

                convertedRecords[bagName] = plasmids.map(record => {
                    console.log('Converting record:', record);
                    return new PlasmidRecord({...record, bag: bagName});
                });
            }
            setRecords(convertedRecords)
            setFilteredRecords(convertedRecords)
        }
        catch (err) {
            setError(err.message);
            console.error('Error fetching bags:', err);
        } finally { setLoading(false); }
    }

    // Initial load and refresh on demand
    useEffect(() => {
        try {
            importAllRecords();
            console.log("refreshed!")
        } catch (error) { console.error("Error refreshing record record import:", error);}
    }, [refreshRecords]);

    // Send bag names up to parent whenever records change
    useEffect(() => {
        if (onBagNamesChange) {
            const bagNames = Object.keys(records).sort((a, b) => sortBagNames(a, b));
            onBagNamesChange(bagNames);
        }
    }, [records, onBagNamesChange]);


    // Simple debouncing with minimum character threshold
    useEffect(() => {
        if (searchInput === '') {
            // Immediate clear
            setDebouncedSearchInput('');
            return;
        }
        // Only search if we have enough characters for meaningful results
        if (searchInput.length < 2) {
            // Show all records for very short inputs
            setDebouncedSearchInput('');
            return;
        }

        const timer = setTimeout(() => {
            setDebouncedSearchInput(searchInput);
        }, searchInput.length < 4 ? 200 : 100); // Longer delay for short searches

        return () => clearTimeout(timer);
    }, [searchInput]);

    // Time filtering utility functions
    const getDateCutoff = useCallback((timeFilter) => {
        const now = new Date();
        switch (timeFilter) {
            case 'thisMonth':
                return new Date(now.getFullYear(), now.getMonth(), 1);
            case 'last6Months':
                return new Date(now.setMonth(now.getMonth() - 6));
            case 'last12Months':
                return new Date(now.setFullYear(now.getFullYear() - 1));
            default:
                return null; // 'all' - no filter
        }
    }, []);

    const isWithinTimeRange = useCallback((plasmid, cutoffDate, type) => {
        if (!cutoffDate) return true; // No time filter

        for (const sample of plasmid.samples) {
            const dateField = type === 'added' ? sample.date_created : sample.date_modified;
            if (!dateField) return false; // No date available
            const recordDate = new Date(dateField);
            if (recordDate >= cutoffDate) return true; // At least one sample matches
        }
        return false;
    }, []);

    // Trigger search when debounced input changes or any filter changes
    useEffect(() => {
        if (!records || Object.keys(records).length === 0) return;

        setLoading(true);
        try {
            let searchResults = filterByLocalSearch(debouncedSearchInput, records);

            // Apply checkout filter if enabled
            if (showCheckedOutOnly) {
                const filteredResults = {};
                for (const [bagName, plasmids] of Object.entries(searchResults)) {
                    const checkedOutPlasmids = plasmids.filter(plasmid =>
                        plasmid.samples.some(sample => sample.is_checked_out)
                    );
                    if (checkedOutPlasmids.length > 0) {
                        filteredResults[bagName] = checkedOutPlasmids;
                    }
                }
                searchResults = filteredResults;
            }

            // Apply time filter if enabled
            if (timeFilter !== 'all') {
                const cutoffDate = getDateCutoff(timeFilter);
                const filteredResults = {};
                for (const [bagName, plasmids] of Object.entries(searchResults)) {
                    const timePlasmids = plasmids.filter(plasmid =>
                        isWithinTimeRange(plasmid, cutoffDate, timeFilterType)
                    );
                    if (timePlasmids.length > 0) {
                        filteredResults[bagName] = timePlasmids;
                    }
                }
                searchResults = filteredResults;
            }

            setFilteredRecords(searchResults);
        } catch (error) {
            console.error('Search error:', error);
            setFilteredRecords(records); // Fallback to original records on error
        } finally {
            setLoading(false);
        }
    }, [debouncedSearchInput, records, showCheckedOutOnly, timeFilter, timeFilterType, getDateCutoff, isWithinTimeRange]);

    // Memoize sorted bags to prevent re-sorting on every render
    const sortedBags = useMemo(() => {
        return Object.entries(filteredRecords).sort((a, b) => {
            const result = sortBagNames(a[0], b[0]);
            return sortOrder === 'desc' ? -result : result;
        });
    }, [filteredRecords, sortOrder]);

    // Memoize input change handler
    const handleInputChange = useCallback((e) => {
        setSearchInput(e.target.value);
    }, []);

    // Memoize total records calculation
    const totalRecords = useMemo(() => {
        return Object.values(filteredRecords).flat().length;
    }, [filteredRecords]);

    const handleAddBag = () => {
        const newBagName = `C${Object.entries(records).length+1}`; //total number of bags present + 1
        setRecords({...records, [newBagName]:[]})
    }

    const handleBagRecordMoved = useCallback((updatedSourcePlasmids, movedRecord) => {
        const destinationBag = movedRecord.bag;

        setRecords(prev => {
            // Find which bag currently has this record
            const sourceBag = Object.keys(prev).find(bag =>
                prev[bag].some(p => p.getFullId() === movedRecord.getFullId())
            );

            // Guard: If source bag not found, record was already moved
            if (!sourceBag) return prev;

            // Guard: If record already in destination, skip duplicate move
            if (prev[destinationBag]?.some(p => p.getFullId() === movedRecord.getFullId())) {
                return prev;
            }

            // Remove from source, add to destination
            return {
                ...prev,
                [sourceBag]: prev[sourceBag].filter(p => p.getFullId() !== movedRecord.getFullId()),
                [destinationBag]: [...(prev[destinationBag] || []), movedRecord]
            };
        });
    }, []);




    return (
        <div className={"mx-5"}>
            {/* Loading Spinner */}
            {loading && <LoadingSpinner message="Loading plasmid record bags..." />}

            {/* Error Display */}
            {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <p className="text-red-800 font-medium">{error}</p>
                    </div>
                </div>
            )}

            {!loading && !error && (
                <>
                    <div className="flex flex-wrap items-center justify-between gap-3 mt-10 mb-10">
                {/* Search with integrated info ribbon */}
                <div className="flex items-stretch flex-shrink-0">
                    {/*Search */}
                    <div className="group flex items-center gap-2 px-3 py-2 bg-indigo-100 hover:bg-indigo-50 rounded-lg -mr-2 shadow-[0_1px_3px_rgba(0,0,0,0.1)] focus-within:bg-indigo-50 focus-within:ring-1 focus-within:ring-inset focus-within:ring-indigo-400 transition-all duration-200 z-10">
                        <Search size={16} className="text-indigo-500 group-hover:text-indigo-600 group-focus-within:text-indigo-700 transition-colors duration-200" />
                        <input
                            className="bg-transparent border-none outline-none text-indigo-700 placeholder-indigo-500 group-focus-within:placeholder-indigo-400 text-sm font-medium w-22 sm:w-48 transition-all duration-200"
                            placeholder="ID, Lot, Bag..."
                            value={searchInput}
                            onChange={handleInputChange}
                        />
                    </div>
                    {/* Info - extends from search bar */}
                    <div className="bg-orange-400 text-white px-4 py-2 shadow-sm rounded-r-lg">
                        <span className="text-xs font-medium whitespace-nowrap">
                            {totalRecords} records • {Object.keys(filteredRecords).length} bags
                        </span>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setShowCheckedOutOnly(!showCheckedOutOnly)}
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium whitespace-nowrap ${
                            showCheckedOutOnly
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                        <UserX size={16} />
                        <span className="hidden sm:inline">Checked Out</span>
                        <span className="sm:hidden">Checked Out</span>
                    </button>

                    {/* Time filter type toggle */}
                    <button
                        onClick={() => setTimeFilterType(timeFilterType === 'added' ? 'modified' : 'added')}
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium whitespace-nowrap ${
                            timeFilterType === 'added'
                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        }`}
                    >
                        {timeFilterType === 'added' ? <Calendar size={16} /> : <Clock size={16} />}
                        <span className="hidden sm:inline">{timeFilterType === 'added' ? 'Added' : 'Modified'}</span>
                        <span className="sm:hidden">{timeFilterType === 'added' ? 'Added' : 'Mod'}</span>
                    </button>

                    {/* Time filter options */}
                    <div className="flex gap-1">
                        {[
                            { key: 'all', label: 'All' },
                            { key: 'thisMonth', label: 'This Month' },
                            { key: 'last6Months', label: '6 Months' },
                            { key: 'last12Months', label: '1 Year' }
                        ].map(filter => (
                            <button
                                key={filter.key}
                                onClick={() => setTimeFilter(filter.key)}
                                className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                                    timeFilter === filter.key
                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                    <button
                        className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg flex items-center justify-center gap-2 whitespace-nowrap"
                        onClick={handleAddBag}
                    >
                        <span className="text-sm font-bold">+</span>
                        Add New Bag
                    </button>
                    <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
                    >
                        <span className="hidden sm:inline">Sort: {sortOrder === 'asc' ? 'Ascending' : 'Descending'}</span>
                        <span className="sm:hidden">{sortOrder === 'asc' ? 'Ascending' : 'Descending'}</span>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            {sortOrder === 'asc' ? (
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            ) : (
                                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                            )}
                        </svg>
                    </button>
                </div>
            </div>
            {sortedBags.length === 0 ? (
                <div className="flex items-center justify-center gap-3 text-gray-500 mt-12">
                    <SearchX size={28} />
                    <p className="text-xl">No records found</p>
                </div>
            ) : (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(310px,1fr))] gap-8 items-start">
                    {sortedBags.map(([bagName, plasmids]) => (
                        <BagCard
                            key={bagName}
                            bagName={bagName}
                            recordsPassed={plasmids}
                            availableBags={Object.keys(records).sort((a, b) => sortBagNames(a, b))}
                            onBagRecordsChanged={(updatedPlasmids) => {
                                setRecords(prev => ({...prev, [bagName]: updatedPlasmids}));
                            }}
                            onBagRecordMoved={handleBagRecordMoved} //del old loc, add to new loc
                        />
                    ))}
                </div>
            )}
                </>
            )}
        </div>
    )
}
export default BagCards
