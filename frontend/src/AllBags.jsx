import React, {useState, useEffect} from 'react'
import BagCard from "./BagCard.jsx";
import {PlasmidRecord} from "./utils/PlasmidRecord.js";

const AllBags = (onOpen, onClose) => {

    {/*state*/}
    const [data, setData] = useState({});
    const [sortBy, setSortBy] = useState('id');     // Default sort by 'id'
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
                throw new Error(data.error || 'Failed to fetch bags');
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
                
                convertedData[bagName] = plasmids.map(plasmid => 
                    new PlasmidRecord({
                        id: `${plasmid.lot}-${plasmid.sublot}`,
                        lot: plasmid.lot,
                        sublot: plasmid.sublot,
                        vol1: plasmid.vol1 || '',
                        vol2: plasmid.vol2 || '',  // vol2 is already a comma-separated string from backend
                        notes: plasmid.notes || '',
                        date_added: plasmid.date_added || ''
                    })
                );
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
    }, []);

    const dummyBagData = {
        'C1': [
            new PlasmidRecord({ id: '1247-3', lot: 1247, sublot: '3', vol1: '15mL', vol2: '10mL', notes: 'High purity prep', date_added: '2024-08-15' }),
            new PlasmidRecord({ id: '2891-7', lot: 2891, sublot: '7', vol1: '12mL', vol2: '', notes: '', date_added: '2024-08-20' }),
            new PlasmidRecord({ id: '3456-12', lot: 3456, sublot: '12', vol1: '8mL', vol2: '5mL', notes: 'For transfection', date_added: '2024-08-22' })
        ],
        'C2': [
            new PlasmidRecord({ id: '4782-1', lot: 4782, sublot: '1', vol1: '20mL', vol2: '15mL', notes: 'Backup prep', date_added: '2024-08-10' }),
            new PlasmidRecord({ id: '1834-15', lot: 1834, sublot: '15', vol1: '10mL', vol2: '', notes: 'Low yield', date_added: '2024-08-25' })
        ],
        'C3': [
            new PlasmidRecord({ id: '2156-8', lot: 2156, sublot: '8', vol1: '18mL', vol2: '12mL', notes: '', date_added: '2024-08-18' }),
            new PlasmidRecord({ id: '4893-2', lot: 4893, sublot: '2', vol1: '6mL', vol2: '', notes: 'Test construct', date_added: '2024-08-28' }),
            new PlasmidRecord({ id: '1672-19', lot: 1672, sublot: '19', vol1: '14mL', vol2: '8mL', notes: 'Ready for use', date_added: '2024-08-30' }),
            new PlasmidRecord({ id: '3245-6', lot: 3245, sublot: '6', vol1: '22mL', vol2: '18mL', notes: 'Large prep', date_added: '2024-08-12' })
        ],
        'C4': [
            new PlasmidRecord({ id: '4567-11', lot: 4567, sublot: '11', vol1: '16mL', vol2: '', notes: 'Control vector', date_added: '2024-08-05' }),
            new PlasmidRecord({ id: '2789-3', lot: 2789, sublot: '3', vol1: '9mL', vol2: '6mL', notes: '', date_added: '2024-08-27' })
        ]
    };





    const sortedBags = Object.entries(data).sort((a,b) => {
        return a[0].localeCompare(b[0]);
        //todo: Add other sorting logic here
    })


    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                    All Bags
                </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedBags.map(([bagName, plasmids]) => (
                    <BagCard
                        key={bagName}
                        bagName={bagName}
                        recordsPassed={plasmids}
                        onBagDataChanged={(updatedPlasmids) => {
                            setData(prev => ({...prev, [bagName]: updatedPlasmids}));
                        }}
                    />
                ))}
            </div>
        </div>
    )
}
export default AllBags
