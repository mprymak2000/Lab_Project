import React, {useState, useEffect, useRef} from 'react'
import BagCard from "./BagCard.jsx";
import {PlasmidRecord} from "./utils/PlasmidRecord.js";

const AllBags = (onOpen, onClose) => {

    // state
    const [data, setData] = useState({});
    const [sortBy, setSortBy] = useState('id');     // Default sort by 'id'
    const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';


    const import_all = async () => {
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
                    return new PlasmidRecord({
                        lot: plasmid.lot,
                        sublot: plasmid.sublot,
                        bag: bagName,
                        volumes: plasmid.volumes || [{ volume: null, date_created: "", date_modified: ""}],
                        notes: plasmid.notes || '',
                        date_added: plasmid.date_added || ''
                    });
                });
            }
            
            setData(convertedData)
        }
        catch (err) {
            setError(err.message);
            console.error('Error fetching bags:', err);
        } finally { setLoading(false); }
    }

    useEffect(() => {
        import_all();
    }, [API_BASE_URL]);

    const dummyBagData = {
        'C1': [
            new PlasmidRecord({ lot: 1247, sublot: 3, bag: 'C1', volumes: [{ volume: 15.0, date_created: "2024-08-15T10:00:00", date_modified: "2024-08-15T10:00:00"}, { volume: 10.0, date_created: "2024-08-15T10:00:00", date_modified: "2024-08-15T10:00:00"}], notes: 'High purity prep', date_added: '2024-08-15' }),
            new PlasmidRecord({ lot: 2891, sublot: 7, bag: 'C1', volumes: [{ volume: 12.0, date_created: "2024-08-20T10:00:00", date_modified: "2024-08-20T10:00:00"}], notes: '', date_added: '2024-08-20' }),
            new PlasmidRecord({ lot: 3456, sublot: 12, bag: 'C1', volumes: [{ volume: 8.0, date_created: "2024-08-22T10:00:00", date_modified: "2024-08-22T10:00:00"}, { volume: 5.0, date_created: "2024-08-22T10:00:00", date_modified: "2024-08-22T10:00:00"}], notes: 'For transfection', date_added: '2024-08-22' })
        ],
        'C2': [
            new PlasmidRecord({ lot: 4782, sublot: 1, bag: 'C2', volumes: [{ volume: 20.0, date_created: "2024-08-10T10:00:00", date_modified: "2024-08-10T10:00:00"}, { volume: 15.0, date_created: "2024-08-10T10:00:00", date_modified: "2024-08-10T10:00:00"}], notes: 'Backup prep', date_added: '2024-08-10' }),
            new PlasmidRecord({ lot: 1834, sublot: 15, bag: 'C2', volumes: [{ volume: 10.0, date_created: "2024-08-25T10:00:00", date_modified: "2024-08-25T10:00:00"}], notes: 'Low yield', date_added: '2024-08-25' })
        ],
        'C3': [
            new PlasmidRecord({ lot: 2156, sublot: 8, bag: 'C3', volumes: [{ volume: 18.0, date_created: "2024-08-18T10:00:00", date_modified: "2024-08-18T10:00:00"}, { volume: 12.0, date_created: "2024-08-18T10:00:00", date_modified: "2024-08-18T10:00:00"}], notes: '', date_added: '2024-08-18' }),
            new PlasmidRecord({ lot: 4893, sublot: 2, bag: 'C3', volumes: [{ volume: 6.0, date_created: "2024-08-28T10:00:00", date_modified: "2024-08-28T10:00:00"}], notes: 'Test construct', date_added: '2024-08-28' }),
            new PlasmidRecord({ lot: 1672, sublot: 19, bag: 'C3', volumes: [{ volume: 14.0, date_created: "2024-08-30T10:00:00", date_modified: "2024-08-30T10:00:00"}, { volume: 8.0, date_created: "2024-08-30T10:00:00", date_modified: "2024-08-30T10:00:00"}], notes: 'Ready for use', date_added: '2024-08-30' }),
            new PlasmidRecord({ lot: 3245, sublot: 6, bag: 'C3', volumes: [{ volume: 22.0, date_created: "2024-08-12T10:00:00", date_modified: "2024-08-12T10:00:00"}, { volume: 18.0, date_created: "2024-08-12T10:00:00", date_modified: "2024-08-12T10:00:00"}], notes: 'Large prep', date_added: '2024-08-12' })
        ],
        'C4': [
            new PlasmidRecord({ lot: 4567, sublot: 11, bag: 'C4', volumes: [{ volume: 16.0, date_created: "2024-08-05T10:00:00", date_modified: "2024-08-05T10:00:00"}], notes: 'Control vector', date_added: '2024-08-05' }),
            new PlasmidRecord({ lot: 2789, sublot: 3, bag: 'C4', volumes: [{ volume: 9.0, date_created: "2024-08-27T10:00:00", date_modified: "2024-08-27T10:00:00"}, { volume: 6.0, date_created: "2024-08-27T10:00:00", date_modified: "2024-08-27T10:00:00"}], notes: '', date_added: '2024-08-27' })
        ]
    };





    const sortedBags = Object.entries(data).sort((a, b) => {
        // Natural sort for bag names: C1, C2, C3... C10, C11, C12
        const bagA = a[0];
        const bagB = b[0];
        
        const matchA = bagA.match(/^([A-Za-z]+)(\d+)$/);
        const matchB = bagB.match(/^([A-Za-z]+)(\d+)$/);
        
        let result = 0;
        if (matchA && matchB) {
            const letterA = matchA[1].toUpperCase();
            const letterB = matchB[1].toUpperCase();
            const numberA = parseInt(matchA[2]);
            const numberB = parseInt(matchB[2]);
            
            if (letterA === letterB) {
                result = numberA - numberB;
            } else {
                result = letterA.localeCompare(letterB);
            }
        } else {
            result = bagA.localeCompare(bagB);
        }
        
        return sortOrder === 'desc' ? -result : result;
    })


    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                    All Bags
                </h2>
                <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors text-sm font-medium"
                >
                    Sort: {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        {sortOrder === 'asc' ? (
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        ) : (
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        )}
                    </svg>
                </button>
            </div>
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-6">
                {sortedBags.map(([bagName, plasmids]) => (
                    <div key={bagName} className="break-inside-avoid mb-6">
                        <BagCard
                            bagName={bagName}
                            recordsPassed={plasmids}
                            onBagDataChanged={(updatedPlasmids) => {
                                setData(prev => ({...prev, [bagName]: updatedPlasmids}));
                            }}
                        />
                    </div>
                ))}
            </div>
        </div>
    )
}
export default AllBags
