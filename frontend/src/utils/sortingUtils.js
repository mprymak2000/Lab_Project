// Natural sorting utilities for record records and bag names

/**
 * Natural sort for bag names (e.g., C1, C2, C3... C10, C11, C12)
 * Handles format: [Letter(s)][Number]
 */
export const sortBagNames = (bagA, bagB) => {
    const matchA = bagA.match(/^([A-Za-z]+)(\d+)$/);
    const matchB = bagB.match(/^([A-Za-z]+)(\d+)$/);

    if (matchA && matchB) {
        const letterA = matchA[1].toUpperCase();
        const letterB = matchB[1].toUpperCase();
        const numberA = parseInt(matchA[2]);
        const numberB = parseInt(matchB[2]);

        if (letterA === letterB) {
            return numberA - numberB;
        } else {
            return letterA.localeCompare(letterB);
        }
    } else {
        return bagA.localeCompare(bagB);
    }
};

/**
 * Natural sort for record IDs (e.g., 1234-1, 1234-2, 5678)
 * Handles formats: [number]-[sublot] or just [number]
 */
export const sortPlasmidIds = (idA, idB) => {
    // Extract numbers using localeCompare with numeric option
    return idA.localeCompare(idB, undefined, { numeric: true });
};

/**
 * Sort record records by different criteria
 */
export const sortPlasmids = (plasmids, sortBy) => {
    return [...plasmids].sort((a, b) => {
        if (sortBy === 'id') {
            return sortPlasmidIds(a.getFullId(), b.getFullId());
        }
        if (sortBy === 'volume') {
            return parseFloat(b.total_volume) - parseFloat(a.total_volume);
        }
        if (sortBy === 'date') {
            return new Date(b.date_added) - new Date(a.date_added);
        }
        return 0;
    });
};
