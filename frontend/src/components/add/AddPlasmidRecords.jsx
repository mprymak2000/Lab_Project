import React, {useState, useEffect} from 'react'
import {PlasmidRecord} from "../../utils/PlasmidRecord.js";
import ConfirmDialog, { PlasmidRecordPreview } from '../common/ConfirmDialog.jsx';
import { saveToDb } from '../../utils/api.js';
import InputPlasmidRow from './AddPlasmidRecords/InputPlasmidRow.jsx';

const AddPlasmidRecords = ({ onUnsavedChangesCheck, onNavigationRequested, onRefreshRecords, availableBags }) => {

    const [recordsData, setRecordsData] = useState([new PlasmidRecord({})]);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [showNavigationConfirm, setShowNavigationConfirm] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState(null);
    const [saveStatus, setSaveStatus] = useState({ type: null, message: '' }); // 'success', 'error', or null

    // Check if there are unsaved changes
    const hasUnsavedChanges = () => {
        // If array is empty, no unsaved changes
        if (recordsData.length === 0) return false;
        
        // If there's more than one empty record, or if any record has data
        if (recordsData.length > 1) return true;
        
        const firstRecord = recordsData[0];
        return firstRecord.lot || firstRecord.sublot || firstRecord.bag || 
               firstRecord.notes || (firstRecord.samples && firstRecord.samples.some(v => v.volume));
    }

    // Handle navigation requests from parent
    const handleNavigationRequest = (destination) => {
        if (hasUnsavedChanges()) {
            setPendingNavigation(destination);
            setShowNavigationConfirm(true);
        } else {
            // No unsaved changes, allow navigation immediately
            if (onNavigationRequested) {
                onNavigationRequested(destination);
            }
        }
    };

    // Pass the function up to parent whenever it changes
    useEffect(() => {
        if (onUnsavedChangesCheck) {
            onUnsavedChangesCheck(handleNavigationRequest);
        }
    }, [recordsData, onUnsavedChangesCheck]);

    const addRecord = () => {
        setRecordsData([...recordsData, new PlasmidRecord({})])
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
        setShowClearConfirm(true);
    }

    const confirmCancel = () => {
        setRecordsData([new PlasmidRecord({})]);
        setShowClearConfirm(false);
    }
    
    const confirmNavigation = () => {
        setShowNavigationConfirm(false);
        if (pendingNavigation && onNavigationRequested) {
            onNavigationRequested(pendingNavigation);
        }
        setPendingNavigation(null);
    }
    
    const cancelNavigation = () => {
        setShowNavigationConfirm(false);
        setPendingNavigation(null);
    }
    
    const handleSave = () => {
        if (recordsData.length === 0) {
            console.log("There are no records to save");
            return;
        }

        // Validate string inputs
        const allErrors = recordsData.map((record, index) => ({
            index: index + 1,
            errors: record.getValidationErrors()
        })).filter(result => result.errors.length > 0);
        
        if (allErrors.length > 0) {
            console.log("One or more records contains validation errors");
            allErrors.forEach((result) => {
                console.log(`Record ${result.index} validation errors:`, result.errors);
            });
            return;
        }

        setShowSaveConfirm(true);
    }

    const confirmSave = async ()=> {
        console.log("Saving records:", recordsData);
        
        try {
            // Saving in backend here (imported global function)
            await saveToDb(recordsData);

            console.log('Plasmid(s) sent for saving');
            setSaveStatus({
                type: 'success',
                message: `Successfully saved ${recordsData.length} plasmid record${recordsData.length === 1 ? '' : 's'}!`
            });
            
            // Clear the form on success
            setRecordsData([new PlasmidRecord({})]);
            //trigger data refresh in parent
            onRefreshRecords();
        }
        catch (err) {
            console.error('Failed to save records:', err);
            const errorMessage = err.message || 'An unexpected error occured. Failed to save records. (dev reference: AddPlasmidRecords, confirmSave())';
            setSaveStatus({
                type: 'error',
                message: `Unexpected Error: ${errorMessage} (dev reference: AddPlasmidRecords, confirmSave())`
            });
        }
        //saveStatus and showSaveConfirm are cleared in confirm dialog when 'OK' is clicked
    }

    return (
        <>
            {/* Main Container */}
            <div className="max-w-6xl mx-5">
                {/* Header Section */}
                <div className="mb-15 mt-10 -ml-12">
                    <div className="inline-block px-5 py-3 rounded-r-xl shadow-[0_4px_12px_rgba(251,146,60,0.25)]" style={{backgroundImage: 'linear-gradient(to right, rgb(251 166 96), rgb(253 184 120))'}}>
                        <h1 className=" ml-5 text-2xl font-bold text-white mb-1">Add New Plasmid Records</h1>
                        <p className="ml-5 text-white text-sm font-medium">Create and organize new plasmid entries for laboratory storage</p>
                    </div>
                </div>

                {/* Records Section w/ header */}
                     {/* header */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                    <div className="bg-gradient-to-r from-indigo-400 via-indigo-400 via-70% to-blue-400 px-6 py-4 border-b border-slate-200">
                        <h2 className="text-lg font-bold text-white">Plasmid Entries</h2>
                        <p className="text-sm font-medium text-white mt-1">
                            {recordsData.length} record{recordsData.length !== 1 ? 's' : ''} ready for processing
                        </p>
                    </div>
                    
                    <div className="p-6 py-5 pb-15">
                        {/* Records List */}
                        <div className="space-y-4 mb-6">
                            {recordsData.map((record, index) => (
                                <InputPlasmidRow
                                    key={index}
                                    data = {record}
                                    onDataChange = {(updatedRecord) => updateRecord(index, updatedRecord)}
                                    onDelete = {() => deleteRecord(index)}
                                    availableBags={availableBags}
                                />
                            ))}
                        </div>
                        
                        {/* Add Another Record Button */}
                        <button
                            className="w-full px-4 py-3 border-2 border-dashed border-slate-300 text-slate-600 rounded-lg hover:border-indigo-400 hover:text-indigo-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 text-sm font-medium"
                            onClick={addRecord}
                        >
                            <span className="inline-flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Add Another Record
                            </span>
                        </button>
                    </div>
                </div>
                
                {/* Action Bar */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-6 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-6">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <div className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse"></div>
                                <span>{recordsData.filter(r => r.getValidationErrors().length === 0).length}/{recordsData.length} records ready to save</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                                <span>{recordsData.filter(r => r.getValidationErrors().length !== 0).length}/{recordsData.length} not ready</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <button
                                onClick={handleCancel}
                                disabled={!hasUnsavedChanges()}
                                className={`px-6 py-2 rounded-lg transition-all duration-200 font-medium ${
                                    !hasUnsavedChanges() 
                                        ? 'border border-slate-300 text-slate-400 cursor-not-allowed'
                                        : 'border border-rose-500 text-rose-600 hover:bg-rose-500 hover:text-white hover:shadow-lg hover:shadow-rose-500/25'
                                }`}
                            >
                                Clear All
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={recordsData.length === 0 || recordsData.some(record => record.getValidationErrors().length > 0)}
                                className={`px-6 py-2 rounded-lg transition-all duration-200 font-medium ${
                                    recordsData.length === 0 || recordsData.some(record => record.getValidationErrors().length > 0)
                                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-500/25'
                                }`}
                            >
                                Save Records
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Clear all Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showClearConfirm}
                onConfirm={confirmCancel}
                onCancel={() => setShowClearConfirm(false)}
                title="Clear New Records"
                message="Are you sure you want to clear all new records? All changes will be lost."
                confirmText="Yes, Clear"
                cancelText="Continue Editing"
                type="danger"
            />

            {/* Save Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showSaveConfirm}
                //if save op not confirmed yet, call confirm save. if it ran (status exists), clear state and exit on success, dont exit on error)
                onConfirm={saveStatus.type ? () => {
                    setShowSaveConfirm(false)
                    setSaveStatus({ type: null, message: '' });
                    if (saveStatus.type === 'success')
                        onNavigationRequested?.('allBags');
                } : confirmSave}
                onCancel={() => setShowSaveConfirm(false)}
                title={saveStatus.type ? 
                    (saveStatus.type === 'success' ? 'Save Successful' : 'Save Failed') : 
                    'Save Records'
                }
                message={saveStatus.type ? 
                    saveStatus.message : 
                    `Are you sure you want to save ${recordsData.length} plasmid record${recordsData.length === 1 ? '' : 's'}?`
                }
                confirmText={saveStatus.type ? "OK" : "Save Records"}
                cancelText={saveStatus.type ? "" : "Continue Editing"}
                type={saveStatus.type ? saveStatus.type : "success"}
                current={saveStatus.type ? "" : 
                    <div className="grid grid-cols-2 gap-4 gap-x-10 max-h-60 overflow-y-auto">
                        {Object.entries(
                            recordsData.reduce((groups, record, index) => {
                                const bagName = record.bag || 'No Bag';
                                if (!groups[bagName]) groups[bagName] = [];
                                groups[bagName].push({ record, originalIndex: index });
                                return groups;
                            }, {})
                        ).map(([bagName, records]) => (
                            <div key={bagName} className="space-y-1">
                                <div className="pl-1 text-xs font-semibold text-gray-600 mb-1">
                                    {bagName}:
                                </div>
                                <div className="space-y-0">
                                    {records.map(({ record, originalIndex }) => (
                                        <PlasmidRecordPreview 
                                            key={originalIndex}
                                            record={record} 
                                            bgColor="bg-blue-200" 
                                            textColor="text-blue-700" 
                                            layout="not-stacked" 
                                            showLabel={false}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                }
            />

            {/* Navigation Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showNavigationConfirm}
                onConfirm={confirmNavigation}
                onCancel={cancelNavigation}
                title="Leave Add Plasmids Form"
                message="You have unsaved changes. Are you sure you want to leave?"
                confirmText="Yes, Leave"
                cancelText="Stay Here"
                type="danger"
            />
        </>
    )
}

export default AddPlasmidRecords
