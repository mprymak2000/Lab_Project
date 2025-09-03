import React, {useRef, useState} from 'react'
import PlasmidRecordInput from "./PlasmidRecordInput.jsx";

//TODO: same record validation (lot-sublot no duplicates).
//TODO: (OPTIONAL): vol2 only turns to volume 1; pass up field errors

const AddPlasmidModal = ({isOpen, onClose}) => {

    const [recordsData, setRecordsData] = useState([{lot: '', sublot: '', vol1: '', vol2: '', notes: ''}]);
    const [recordValidations, setRecordValidations] = useState([false]);

    const addRecord = () => {
        setRecordsData([...recordsData, {lot: '', sublot: '', vol1: '', vol2: '', notes: ''}])
        setRecordValidations([...recordValidations, false]);
    }

    const deleteRecord = (recordIndex) => {
        const newRecords = recordsData.slice(0, recordIndex).concat(recordsData.slice(recordIndex + 1));
        const newValidations = recordValidations.slice(0, recordIndex).concat(recordValidations.slice(recordIndex + 1));
        setRecordsData(newRecords);
        setRecordValidations(newValidations);
    }

    const updateRecord = (recordIndex, field, value) => {
        const newRecords = [...recordsData];
        newRecords[recordIndex][field] = value;
        setRecordsData(newRecords);
    }

    const handleRecordValidation = (recordIndex, isValid) => {
        const newValidations = [...recordValidations];
        newValidations[recordIndex] = isValid;
        setRecordValidations(newValidations);
    }

    const allRecordsValid = recordValidations.every(isValid => isValid);
    
    const handleCancel = () => {
        if (window.confirm("Are you sure you want to cancel? All changes will be lost.")) {
            onClose();
        }
    }
    
    const handleSave = () => {
        console.log("recordValidations:", recordValidations);
        console.log("allRecordsValid:", allRecordsValid);
        if (recordsData.length === 0)
            console.log("There are no records to save");
        else if (!allRecordsValid) {
            console.log("One or more records contains unwanted input or has empty fields");
            recordValidations.forEach((isValid, index) => {
                if (!isValid) {
                    console.log(`Record ${index + 1} is invalid`);
                }
            });
        }

        if (window.confirm("Are you sure you want to save these records?")) {
        // TODO: Implement save logic
        console.log("you did it you son of a bitch!")
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
                            onDataChange = {(field, value) => updateRecord(index, field, value)}
                            onValidationChange = {(isValid) => handleRecordValidation(index, isValid)}
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
