const filterByLocalSearch = (searchInput, data) => {
    // Ensure data exists and is valid
    if (!data || typeof data !== 'object') {
        console.warn('Invalid data for search:', data);
        return;
    }

    if (!searchInput.trim()) {
        // Reset filter if search is empty
        return data;
    }

    const searchTerm = searchInput.trim();
    let filteredData = {};

    // Regex patterns for different search types
    const bagNamePattern = /^[Cc]\d+$/; // C1, C2, c1, c2, etc.
    const singleIdPattern = /^\d+-\d+$/; // 5317-2, 3380-4, 3-3, etc. (flexible length)
    const lotOnlyPattern = /^\d+$/; // Just the lot number: 5317, 3380, 3, etc.
    const multipleIdsPattern = /(\d+-\d+)/g; // Multiple IDs separated by commas, spaces, etc.
    const datePattern = /^\d{1,2}[\/.\s]\d{4}$|^\d{1,2}[\/.\s]\d{1,2}[\/.\s]\d{4}$|^\d{1,2}[\/.\s]\d{1,2}$/;// Date formats: MM/YYYY, MM/DD/YYYY, or MM/DD


    try {
        if (bagNamePattern.test(searchTerm)) filteredData = filterByBag(searchTerm, data);
        else if (singleIdPattern.test(searchTerm)) filteredData = filterBySingleID(searchTerm, data);
        else if (lotOnlyPattern.test(searchTerm)) filteredData = filterByLot(searchTerm, data);
        else if (datePattern.test(searchTerm)) filteredData = filterByDate(searchTerm,data);
        else if (searchTerm.includes(',') || searchTerm.includes(' ') || searchTerm.includes(';')) {
            //break apart list
            const foundIds = searchTerm.match(multipleIdsPattern) || [];
            const cleanIds = foundIds.map(id => id.trim().toLowerCase());
            if (cleanIds.length > 0)
                //filter
                filteredData = filterByMultipleIds(cleanIds, data);
        }
        else filteredData = fallbackSearch(searchTerm, data);

        return filteredData;
    } catch (error) {
        console.error('Error in handleSearch:', error);
        return data; // Fallback to original data
    }
}


    function filterByBag(searchTerm, data) {
        // Search by bag name (e.g., "C1", "c2")
        const result = {};
        const bagName = searchTerm.toUpperCase();
        if (data[bagName]) {
            result[bagName] = data[bagName];
        }
        return result;
    }

    function filterBySingleID(searchTerm, data) {
        // Search by single record ID (e.g., "5317-2")
        const result = {};
        Object.entries(data).forEach(([bagName, plasmids]) => {
            if (!Array.isArray(plasmids)) return;
            const matchingPlasmids = plasmids.filter(plasmid => {
                try {
                    return plasmid && plasmid.getFullId &&
                        plasmid.getFullId().toLowerCase() === searchTerm.toLowerCase();
                } catch {
                    return false;
                }
            });
            if (matchingPlasmids.length > 0) {
                result[bagName] = matchingPlasmids;
            }
        });
        return result;
    }

    function filterByLot(searchTerm, data) {
        // Search by lot only (e.g., "5317" matches "5317-1", "5317-2", etc.)
        const result = {};
        Object.entries(data).forEach(([bagName, plasmids]) => {
            if (!Array.isArray(plasmids)) return;
            const matchingPlasmids = plasmids.filter(plasmid => {
                try {
                    return plasmid && plasmid.lot && String(plasmid.lot) === searchTerm;
                } catch {
                    return false;
                }
            });
            if (matchingPlasmids.length > 0) {
                result[bagName] = matchingPlasmids;
            }
        });
        return result;
    }

    function filterByDate(searchTerm, data) {
        // Search by date (e.g., "12/25/2023", "1/5/2024")
        const result = {};
        Object.entries(data).forEach(([bagName, plasmids]) => {
            if (!Array.isArray(plasmids)) return;
            const matchingPlasmids = plasmids.filter(plasmid => {
                try {
                    if (!plasmid) return false;

                    // Check all date fields in record and samples and isolate them
                    const datesToCheck = [];

                    // Main record dates
                    if (plasmid.date_added) datesToCheck.push(plasmid.date_added);
                    if (plasmid.date_modified) datesToCheck.push(plasmid.date_modified);

                    // Sample dates
                    if (plasmid.samples && Array.isArray(plasmid.samples)) {
                        plasmid.samples.forEach(sample => {
                            if (sample.date_created) datesToCheck.push(sample.date_created);
                            if (sample.date_modified) datesToCheck.push(sample.date_modified);
                        });
                    }

                    // Parse the search term
                    const searchParts = searchTerm.split(/[\/.\s]/);
                    let searchMonth, searchDay, searchYear, searchDate;

                    if (searchParts.length === 2) {
                        // Could be month/year or month/day
                        const firstPart = parseInt(searchParts[0]);
                        const secondPart = parseInt(searchParts[1]);

                        if (secondPart > 31) {
                            // Month/Year format (e.g., "12/2023")
                            searchMonth = firstPart - 1;
                            searchYear = secondPart;
                        } else {
                            // Month/Day format (e.g., "12/25")
                            searchMonth = firstPart - 1;
                            searchDay = secondPart;
                        }
                    } else if (searchParts.length === 3) {
                        // Full date format (e.g., "12/25/2023")
                        searchDate = new Date(searchTerm);
                    }

                    return datesToCheck.some(dateStr => {
                        try {
                            const recordDate = new Date(dateStr);

                            if (searchYear !== undefined) {
                                // Month/Year search (e.g., "12/2023")
                                return recordDate.getMonth() === searchMonth &&
                                    recordDate.getFullYear() === searchYear;
                            } else if (searchDay !== undefined) {
                                // Month/Day search (e.g., "12/25") - match any year
                                return recordDate.getMonth() === searchMonth &&
                                    recordDate.getDate() === searchDay;
                            } else if (searchDate) {
                                // Full date search (e.g., "12/25/2023")
                                return recordDate.toDateString() === searchDate.toDateString();
                            }

                            return false;
                        } catch {
                            return false;
                        }
                    });
                } catch {
                    return false;
                }
            });
            if (matchingPlasmids.length > 0) {
                result[bagName] = matchingPlasmids;
            }
        });
        return result;
    }

    function filterByMultipleIds(multipleSearchTerms, data) {
        // Search by multiple IDs separated by commas, spaces, or semicolons
        const result = {};
        Object.entries(data).forEach(([bagName, plasmids]) => {
            if (!Array.isArray(plasmids)) return;
            const matchingPlasmids = plasmids.filter(plasmid => {
                try {
                    return plasmid && plasmid.getFullId &&
                        multipleSearchTerms.includes(plasmid.getFullId().toLowerCase());
                } catch {
                    return false;
                }
            });
            if (matchingPlasmids.length > 0) {
                result[bagName] = matchingPlasmids;
            }
        });

        return result;
    }

    function fallbackSearch(searchTerm, data) {
        // Fallback: general search across all fields (partial matches)
        const result = {};
        Object.entries(data).forEach(([bagName, plasmids]) => {
            if (!Array.isArray(plasmids)) return;
            const matchingPlasmids = plasmids.filter(plasmid => {
                try {
                    if (!plasmid) return false;
                    const searchLower = searchTerm.toLowerCase();
                    return (
                        (plasmid.getFullId && plasmid.getFullId().toLowerCase().includes(searchLower)) ||
                        (plasmid.lot && String(plasmid.lot).toLowerCase().includes(searchLower)) ||
                        (plasmid.sublot && String(plasmid.sublot).toLowerCase().includes(searchLower)) ||
                        bagName.toLowerCase().includes(searchLower) ||
                        (plasmid.notes && String(plasmid.notes).toLowerCase().includes(searchLower))
                    );
                } catch {
                    return false;
                }
            });
            if (matchingPlasmids.length > 0) {
                result[bagName] = matchingPlasmids;
            }
        });
        return result;
    }
export default filterByLocalSearch
