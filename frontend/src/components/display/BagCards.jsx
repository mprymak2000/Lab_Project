import React, {useEffect, useState} from 'react'
import BagCard from "./BagCard.jsx";

const BagCards = ({isOpen, onClose, data}) => {

    if(!isOpen) return null;

    // state
    const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [localData, setLocalData] = useState({});

    useEffect(() => {
        setLocalData(data);
    }, [data]);

    const sortedBags = Object.entries(localData).sort((a, b) => {
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

    const handleAddBag = () => {
        const newBagName = `C${Object.entries(localData).length+1}`; //total number of bags present + 1
        setLocalData({...localData, [newBagName]:[]})
    }


    return (
        <div>
            <div className="flex justify-end items-center mt-2 mb-8">
                <div className="flex items-center gap-3">
                    <button
                        className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg flex items-center gap-2"
                        onClick={handleAddBag}
                    >
                        <span className="text-sm font-bold">+</span>
                        Add New Bag
                    </button>
                    <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors text-sm font-medium"
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
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(325px,1fr))] gap-8 items-start">
                {sortedBags.map(([bagName, plasmids]) => (
                    <BagCard
                        key={bagName}
                        bagName={bagName}
                        recordsPassed={plasmids}
                        onBagDataChanged={(updatedPlasmids) => {
                            setLocalData(prev => ({...prev, [bagName]: updatedPlasmids}));
                        }}
                    />
                ))}
            </div>
        </div>
    )
}
export default BagCards
