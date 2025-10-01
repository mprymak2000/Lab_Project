import React, {useState, useEffect, useMemo, useCallback} from 'react'
import {PlasmidRecord} from "../../utils/PlasmidRecord.js";
import { usePlasmidRecordInput } from '../../hooks/usePlasmidRecordInput.js';
import ConfirmDialog, { PlasmidRecordPreview } from '../common/ConfirmDialog.jsx';
import saveToDb from '../../utils/saveToDb.js';

//TODO: same record validation (lot-sublot no duplicates).

const AddPlasmidRecords = ({ onUnsavedChangesCheck, onNavigationRequested, onRefreshData }) => {

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
            onRefreshData();
        }
        catch (err) {
            console.error('Failed to save records:', err);
            const errorMessage = err.message || 'Failed to save records';
            setSaveStatus({
                type: 'error',
                message: errorMessage
            });
        }
        //saveStatus and showSaveConfirm are cleared in confirm dialog when 'OK' is clicked
    }

    return (
        <>
            {/* Main Container */}
            <div className="max-w-6xl mx-auto">
                {/* Header Section */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">Add New Plasmid Records</h1>
                    <p className="text-slate-600">Create and organize new plasmid entries for laboratory storage</p>
                </div>

                {/* Records Section */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                    <div className="bg-gradient-to-r from-indigo-100 via-blue-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-800">Plasmid Entries</h2>
                        <p className="text-sm text-slate-600 mt-1">
                            {recordsData.length} record{recordsData.length !== 1 ? 's' : ''} ready for processing
                        </p>
                    </div>
                    
                    <div className="p-6">
                        {/* Records List */}
                        <div className="space-y-4 mb-6">
                            {recordsData.map((record, index) => (
                                <InputPlasmidRow
                                    key={index}
                                    data = {record}
                                    onDataChange = {(updatedRecord) => updateRecord(index, updatedRecord)}
                                    onDelete = {() => deleteRecord(index)}
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
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <div className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse"></div>
                                <span>{recordsData.filter(r => r.getValidationErrors().length === 0).length}/{recordsData.length} records ready to save</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                                <span>{recordsData.filter(r => r.getValidationErrors().length !== 0).length}/{recordsData.length} not ready</span>
                            </div>
                        </div>
                        
                        <div className="flex gap-4">
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

{/*Reusing input plasmid logic using the hook. custom render jsx*/}
const InputPlasmidRow = ({data, onDataChange, onDelete, onSave}) => {
    const [conflictWarning, setConflictWarning] = useState('');
    const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

    const {
        lotRef,
        sublotRef,
        sublotError,
        lotError,
        volumeErrors,
        bagError,
        showNotes,
        setShowNotes,
        handleLotChange,
        handleSublotChange,
        handleSublotKeyDown,
        handleVolumeChange,
        handleVolumeBlur,
        addVolumeInput,
        deleteVolumeInput,
        handleBagChange,
        handleBagBlur,
        handleNotesChange,
        hasErrors
    } = usePlasmidRecordInput(data, onDataChange, onDelete, onSave);

    // Debounced conflict checking function
    const checkForConflicts = useCallback(
        useMemo(() => {
            let timeoutId;
            return async (lot, sublot, currentBag) => {
                if (timeoutId) clearTimeout(timeoutId);
                
                timeoutId = setTimeout(async () => {
                    console.log('Conflict check triggered:', { lot, sublot, currentBag });
                    if (lot && sublot && currentBag) {
                        setIsCheckingConflicts(true);
                        console.log('Starting conflict check for:', `${lot}-${sublot}`, 'in bag:', currentBag);
                        try {
                            const response = await fetch(`${API_BASE_URL}/api/search`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ plasmid_collection: `${lot}-${sublot}` })
                            });
                            
                            if (response.ok) {
                                const result = await response.json();
                                console.log('Search result:', result);
                                
                                if (result.summary && result.summary.found > 0 && result.summary.bags) {
                                    const existingBags = Object.keys(result.summary.bags);
                                    console.log('Existing bags found:', existingBags);
                                    console.log('Current bag (comparing):', currentBag.toUpperCase());
                                    const conflictBags = existingBags.filter(bag => bag !== currentBag.toUpperCase());
                                    console.log('Conflict bags:', conflictBags);
                                    
                                    if (conflictBags.length > 0) {
                                        const warningMsg = `⚠️ Plasmid ${lot}-${sublot} already exists in bag(s): ${conflictBags.join(', ')}`;
                                        console.log('Setting warning:', warningMsg);
                                        setConflictWarning(warningMsg);
                                    } else {
                                        console.log('No conflicts, clearing warning');
                                        setConflictWarning('');
                                    }
                                } else {
                                    console.log('No plasmids found, clearing warning');
                                    setConflictWarning('');
                                }
                            }
                        } catch (error) {
                            console.error('Error checking for conflicts:', error);
                            // Don't show error to user, just clear any existing warning
                            setConflictWarning('');
                        } finally {
                            setIsCheckingConflicts(false);
                        }
                    } else {
                        setConflictWarning('');
                        setIsCheckingConflicts(false);
                    }
                }, 500);
            };
        }, [API_BASE_URL]),
        []
    );

    // Check for conflicts whenever lot, sublot, or bag changes
    useEffect(() => {
        if (data.lot && data.sublot && data.bag && !lotError && !sublotError && !bagError) {
            checkForConflicts(data.lot, data.sublot, data.bag);
        } else {
            setConflictWarning('');
            setIsCheckingConflicts(false);
        }
    }, [data.lot, data.sublot, data.bag, lotError, sublotError, bagError, checkForConflicts]);

    return (
        <div className="bg-gradient-to-r from-blue-100 via-indigo-75 to-slate-100 rounded-lg p-3 shadow-sm border border-slate-200 hover:shadow-md transition-all duration-200">
            {/* Input Row */}
            <div className="rounded px-2 text-sm flex gap-4 items-center">
                {/* Left Container: Lot/Sublot/Volumes/Notes */}
                <div className="flex flex-wrap items-center gap-6 gap-y-2 flex-1 min-w-0">
                    {/* Lot-Sublot */}
                    <div className="flex items-center gap-1">
                        <input
                            className={`w-20 px-1 py-1 bg-white text-s shadow-sm ${lotError ? 'focus:ring-1 focus:ring-red-500' : 'focus:ring-2 focus:ring-blue-400'} focus:outline-none placeholder-gray-400 rounded border ${lotError ? 'border-red-500' : 'border-transparent'}`}
                            placeholder="Lot"
                            ref={lotRef}
                            value={data.lot}
                            onChange={handleLotChange}
                            maxLength={4}
                        />
                        <span className="text-gray-400 text-s">-</span>
                        <input
                            className={`w-16 px-1 py-1 bg-white text-s shadow-sm ${sublotError ? 'focus:ring-1 focus:ring-red-500' : 'focus:ring-2 focus:ring-blue-400'} focus:outline-none placeholder-gray-400 rounded border ${sublotError ? 'border-red-500' : 'border-transparent'}`}
                            placeholder="Sublot"
                            ref={sublotRef}
                            value={data.sublot}
                            onKeyDown={handleSublotKeyDown}
                            onChange={handleSublotChange}
                        />
                    </div>

                    {/* Volume Inputs */}
                    <div className="flex items-center gap-1">
                        {(data.samples).map((volume, index) => (
                            <div key={index} className="relative">
                                <input
                                    className={`w-12 px-1 py-1 ${data.samples.length > 1 ? 'pr-4' : ''} bg-white text-s shadow-sm ${volumeErrors[index] ? 'focus:ring-1 focus:ring-red-500' : 'focus:ring-2 focus:ring-blue-400'} focus:outline-none placeholder-gray-400 rounded border ${volumeErrors[index] ? 'border-red-500' : 'border-transparent'}`}
                                    placeholder={"mL"}
                                    value={volume.volume === null ? '' : volume.volume}
                                    autoFocus={index === data.samples.length - 1 && index > 0}
                                    onChange={(e) => handleVolumeChange(index, e)}
                                    onBlur={(e) => handleVolumeBlur(index, e)}
                                />
                                {/* Delete Volume Button - embedded inside input */}
                                {data.samples.length > 1 && (
                                    <button
                                        type="button"
                                        className={`absolute right-0 top-0 w-4 h-full rounded-r bg-red-50 text-red-500 hover:bg-red-500 hover:text-white focus:outline-none focus:ring-2 ${volumeErrors[index] ? 'focus:ring-red-500 border-t border-r border-b border-red-500' : 'focus:ring-blue-400'} flex items-center justify-center text-xs`}
                                        onClick={() => deleteVolumeInput(index)}
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        ))}

                        {/* Add Volume Button */}
                        {(data.samples).length < 3 && (
                            <button
                                type="button"
                                className="py-2 w-8 h-8 text-gray-400 hover:text-blue-500 hover:bg-blue-50 border border-gray-300 hover:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:outline-none rounded flex items-center justify-center text-lg font-semibold"
                                onClick={addVolumeInput}
                            >
                                +
                            </button>
                        )}
                    </div>

                    {/* Notes Button/Input */}
                    {!showNotes ? (
                        <button
                            type="button"
                            className="px-3 py-1 border border-dashed border-gray-300 text-gray-500 text-s rounded hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            onClick={() => setShowNotes(true)}
                        >
                            + Notes
                        </button>
                    ) : (
                        <input
                            className="flex-1 min-w-32 px-1 py-1 bg-white text-s shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder-gray-400 rounded border border-transparent"
                            placeholder="Notes (optional)"
                            value={data.notes}
                            autoFocus
                            onChange={(e) => handleNotesChange(e.target.value)}
                            onBlur={() => {
                                if (!data.notes) setShowNotes(false);
                            }}
                        />
                    )}
                </div>

                {/* Right Container: Bag, Delete */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-indigo-400 text-3xl flex items-center justify-center mr-4">→</span>
                    <input
                        className={`w-16 px-2 py-1.5 bg-white text-sm shadow-sm ${bagError ? 'focus:ring-2 focus:ring-rose-400 border-rose-400 bg-rose-50' : 'focus:ring-2 focus:ring-indigo-400 border-slate-200 focus:border-indigo-300'} focus:outline-none placeholder-slate-400 rounded-md border transition-all duration-200`}
                        placeholder="Bag"
                        value={data.bag}
                        onChange={handleBagChange}
                        onBlur={handleBagBlur}
                    />

                    {/* Delete Button */}
                    <button
                        type="button"
                        className="px-2 py-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-300 focus:ring-2 focus:ring-rose-400 focus:outline-none rounded-md transition-all duration-200"
                        onClick={onDelete}
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>
            {/*Error messages*/}
            {hasErrors && (
                <div className="w-full text-xs text-rose-500 pt-2 px-2 order-last font-medium">
                    {lotError || sublotError || bagError || volumeErrors[0] || volumeErrors[1] || volumeErrors[2]}
                </div>
            )}
            
            {/*Conflict warning*/}
            {conflictWarning && (
                <div className="w-full text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-2 mt-2 font-medium flex items-center gap-1">
                    {isCheckingConflicts && (
                        <div className="w-3 h-3 border border-amber-500 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                    )}
                    <span>{conflictWarning}</span>
                </div>
            )}
        </div>
    )
}

export default AddPlasmidRecords
