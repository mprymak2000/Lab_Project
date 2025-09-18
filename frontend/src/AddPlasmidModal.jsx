import React, {useState} from 'react'
import PlasmidRecordInput from "./PlasmidRecordInput.jsx";
import {PlasmidRecord} from "./utils/PlasmidRecord.js";

//TODO: same record validation (lot-sublot no duplicates).

const AddPlasmidModal = ({isOpen, onClose}) => {

    const [recordsData, setRecordsData] = useState(
        [new PlasmidRecord({lot: '', sublot: '', bag: '', volumes: [{volume: null, date_created: '', date_modified: ''}]})]);
//    const [recordValidations, setRecordValidations] = useState([false]);

    const addRecord = () => {
        setRecordsData([...recordsData, new PlasmidRecord({lot: '', sublot: '', bag: '', volumes: ['']})])
    }

    const deleteRecord = (recordIndex) => {
        const newRecords = recordsData.slice(0, recordIndex).concat(recordsData.slice(recordIndex + 1));
        setRecordsData(newRecords);
    }

    const updateRecord = (recordIndex, updatedRecord) => {
        const newRecords = [...recordsData];
        newRecords[recordIndex] = updatedRecord;
        setRecordsData(newRecords);
    }

    
    const handleCancel = () => {
        if (window.confirm("Are you sure you want to cancel? All changes will be lost.")) {
            onClose();
        }
    }
    
    const handleSave = () => {
        if (recordsData.length === 0) {
            console.log("There are no records to save");
            return;
        }

        // Cast values to proper types before validation
        const castedRecords = recordsData.map(record => {
            return new PlasmidRecord({
                lot: parseInt(record.lot) || record.lot, // Cast to int if possible
                sublot: parseInt(record.sublot) || record.sublot, // Cast to int if possible
                bag: record.bag, // Keep as string
                volumes: record.volumes.map(vol => {
                    if (typeof vol === 'string') {
                        return {
                            volume: parseFloat(vol),
                            date_created: new Date().toISOString(),
                            date_modified: new Date().toISOString()
                        };
                    } else if (typeof vol === 'object' && vol.volume) {
                        return {
                            volume: parseFloat(vol.volume),
                            date_created: vol.date_created,
                            date_modified: vol.date_modified
                        };
                    }
                    return vol;
                }).filter(vol => vol.volume > 0), // Remove empty volumes
                notes: record.notes || '' // Keep as string
            });
        });

        // Validate cast records
        const allValid = castedRecords.every(record => record.isValid());
        
        if (!allValid) {
            console.log("One or more records contains unwanted input or has empty fields");
            castedRecords.forEach((record, index) => {
                if (!record.isValid()) {
                    console.log(`Record ${index + 1} is invalid`);
                }
            });
            return;
        }

        if (window.confirm("Are you sure you want to save these records?")) {
            // TODO: Implement save logic with castedRecords
            console.log("Saving records:", castedRecords);
            onClose();
        }
    }


    if (!isOpen) return null;
    return (
        <>
            {/* Backdrop with blur */}
            <div className="fixed inset-0 backdrop-blur-xs z-40"></div>
            
            {/* Modal */}
            <div
                className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-xl shadow-2xl w-[95%] max-w-2xl z-50"
                onClick={(e) => e.stopPropagation()}>
                <h2 className="text-lg font-semibold mb-4 text-gray-800">Add Plasmid Record(s)</h2>


                {/* Records with spacing */}
                <div className="space-y-4 mb-4">
                    {recordsData.map((record, index) => (
                        <PlasmidRecordInput
                            key={index}
                            data = {record}
                            onDataChange = {(updatedRecord) => updateRecord(index, updatedRecord)}
                            onDelete = {() => deleteRecord(index)}
                        />
                    ))}
                </div>
                
                {/* Add Another Record Button */}
                <button
                    className="w-full px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    onClick={addRecord}
                >
                    + Add Another Record
                </button>
                <div className="mt-4 flex gap-2">
                    <button 
                        onClick={handleCancel}
                        className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Save
                    </button>
                </div>
            </div>
        </>
    )
}
export default AddPlasmidModal
