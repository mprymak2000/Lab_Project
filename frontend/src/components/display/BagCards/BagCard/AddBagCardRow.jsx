import React, { useState, useEffect } from 'react'
import { usePlasmidRecordInput } from '../../../../hooks/usePlasmidRecordInput.js'
import { Save, X, AlertTriangle } from 'lucide-react'
import { PlasmidRecord } from '../../../../utils/PlasmidRecord.js'
import { saveToDb } from "../../../../utils/api.js";

const AddBagCardRow = ({ bagName, onRecordAdded, forceOpen, onClose}) => {
    const [newRecord, setNewRecord] = useState(null);
    const [showResultMessage, setShowResultMessage] = useState(false);
    const [saveStatus, setSaveStatus] = useState({ type: null, message: '' }); // 'success', 'error', or null
    const [isSaving, setIsSaving] = useState(false);

    //Force open is so user can right click add record. just additional functionality. kinda redundant
    useEffect(() => {
        if (forceOpen) {
            setNewRecord(new PlasmidRecord({
                bag: bagName,
                samples: [{volume: null, date_created: new Date().toISOString(), date_modified: new Date().toISOString()}]
            }))
        }
    }, [forceOpen, bagName]);

    const handleAddPlasmid = () => {
        setNewRecord(new PlasmidRecord({ 
            bag: bagName,
            // initializing volume for instant user response
            // b/c no refresh triggered (doesnt pull from database instantly)
            samples: [{volume: null, date_created: new Date().toISOString(), date_modified: new Date().toISOString()}]
        }));
    };

    // /API/ADD endpoint used here
    const handleAddRecordSave = async () => {
        setIsSaving(true);
        setSaveStatus({ type: null, message: '' });

        try {
            // Validate first
            const errors = newRecord.getValidationErrors();
            if (errors.length > 0) {
                throw new Error(errors.join(', '));
            }

            // Save to database //api/add
            await saveToDb(newRecord);

            // Only update local state AFTER successful database save
            onRecordAdded(newRecord);

            // change to success state
            setSaveStatus({
                type: 'success',
                message: `Successfully saved ${newRecord.getFullId()}!`
            });

        } catch (err) {
            // update status state to error
            setSaveStatus({
                type: 'error',
                message: err.message || 'Failed to save record'
            });
        } finally {
            setIsSaving(false);
            setNewRecord(null);
            // show success/error for 3 seconds, then clear state
            setShowResultMessage(true);
            setTimeout(() => {
                setShowResultMessage(false);
                setSaveStatus({ type: null, message: '' });
            }, 3000);

        }
    };

    const handleAddRecordCancel = () => {
        setNewRecord(null);
        onClose();
    };


    // 3 possibilities for this component: show add button, show input form or show success/error message (for 3 sec)

    // If we have a new record being added, show the inlined input form
    if (newRecord) {
        return <AddBagCardRowForm 
            data={newRecord}
            onDataChange={setNewRecord}
            onSave={handleAddRecordSave}
            onCancel={handleAddRecordCancel}
        />;
    }

    // If new rec save attempted, show  message (3 seconds from save function)
    if (showResultMessage && saveStatus.type) {
        const isSuccess = saveStatus.type === 'success';
        return (
            <div className={`flex items-center justify-center py-2 px-3 text-xs rounded-md ${
                isSuccess
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
            }`}>
                <span className="mr-1">{isSuccess ? '✓' : '✗'}</span>
                <span>{saveStatus.message}</span>
            </div>
        );
    }

    // Default: show add button
    return (
        <div className="flex items-center justify-center py-2 px-3 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs cursor-pointer transition-colors rounded-md"
             onClick={handleAddPlasmid}>
            <span className="mr-1">+</span>
            <span>Add record</span>
        </div>
    );
};

const AddBagCardRowForm = ({ data, onDataChange, onSave, onCancel }) => {
    const {
        lotRef,
        sublotRef,
        sublotError,
        lotError,
        volumeErrors,
        showNotes,
        setShowNotes,
        handleLotChange,
        handleSublotChange,
        handleSublotKeyDown,
        handleVolumeChange,
        handleVolumeBlur,
        addVolumeInput,
        deleteVolumeInput,
        handleNotesChange,
        hasErrors,
        isValid,
        conflictWarning,
        isCheckingConflicts,
        validateAllFields,
    } = usePlasmidRecordInput(data, onDataChange, onCancel, onSave);

    const handleFormBlur = (e) => {
        // Only trigger if focus is leaving the entire form
        if (!e.currentTarget.contains(e.relatedTarget)) {
            validateAllFields();
        }
    };

    return (
        <div
            className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 shadow-md"
            onBlur={handleFormBlur}
        >
            <div className="space-y-3">
                {/* Row 1: Lot - Sublot */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-16">Id:</span>
                    <div className="flex items-center gap-1">
                        <input
                            ref={lotRef}
                            className={`w-16 h-6 px-2 py-1 bg-white text-xs shadow-sm rounded border focus:outline-none focus:ring-2 ${
                                lotError 
                                    ? 'border-red-500 focus:ring-red-500' 
                                    : 'border-gray-300 focus:ring-blue-400'
                            }`}
                            placeholder="Lot"
                            value={data.lot}
                            onChange={handleLotChange}
                            maxLength={4}
                        />
                        <span className="text-gray-400 text-xs">-</span>
                        <input
                            ref={sublotRef}
                            className={`w-16 h-6 px-2 py-1 bg-white text-xs shadow-sm rounded border focus:outline-none focus:ring-2 ${
                                sublotError 
                                    ? 'border-red-500 focus:ring-red-500' 
                                    : 'border-gray-300 focus:ring-blue-400'
                            }`}
                            placeholder="Sublot"
                            value={data.sublot}
                            onChange={handleSublotChange}
                            onKeyDown={handleSublotKeyDown}
                        />
                    </div>
                </div>

                {/* Row 2: Volumes */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-16">Volumes:</span>
                    <div className="flex items-center gap-1">
                        {data.samples.map((sample, index) => (
                            <div key={index} className="relative">
                                <input
                                    className={`w-14 h-6 px-2 py-1 ${data.samples.length > 1 ? 'pr-5' : ''} bg-white text-xs shadow-sm rounded border focus:outline-none focus:ring-2 ${volumeErrors[index] ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-400'}`}
                                    placeholder={`Vol ${index + 1}`}
                                    value={sample.volume === null ? '' : sample.volume}
                                    onChange={(e) => handleVolumeChange(index, e)}
                                    onBlur={(e) => handleVolumeBlur(index, e)}
                                />
                                {data.samples.length > 1 && (
                                    <button
                                        type="button"
                                        className={`absolute right-0 top-0.5 w-4 h-5.5 rounded-r bg-red-50 text-red-500 hover:bg-red-500 hover:text-white focus:outline-none focus:ring-2 ${volumeErrors[index] ? 'focus:ring-red-500 border-r border-red-500' : 'focus:ring-blue-400 focus:border-t focus:border-r focus:border-b focus:border-blue-400'} flex items-center justify-center text-xs`}
                                        onClick={() => deleteVolumeInput(index)}
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        ))}
                        
                        {data.samples.length < 3 && (
                            <button
                                type="button"
                                className="w-6 h-6 text-gray-400 hover:text-blue-500 hover:bg-blue-50 border border-gray-300 hover:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:outline-none rounded text-xs font-semibold flex items-center justify-center"
                                onClick={addVolumeInput}
                            >
                                +
                            </button>
                        )}
                    </div>
                </div>

                {/* Row 3: Notes */}
                <div className="flex items-start gap-2">
                    <span className="text-xs text-gray-600 w-16 pt-1">Notes:</span>
                    <div className="flex-1">
                        {!showNotes ? (
                            <button
                                type="button"
                                className="px-2 py-1 text-xs text-gray-500 border border-dashed border-gray-300 rounded hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50"
                                onClick={() => setShowNotes(true)}
                            >
                                + Add notes
                            </button>
                        ) : (
                            <input
                                className="w-full h-6 px-2 py-1 bg-white text-xs shadow-sm rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                placeholder="Enter notes..."
                                value={data.notes}
                                onChange={(e) => handleNotesChange(e.target.value)}
                                onBlur={() => {
                                    if (!data.notes) setShowNotes(false);
                                }}
                                autoFocus
                            />
                        )}
                    </div>
                </div>

                {/* Action Buttons and Error Messages */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200">
                    {/* Error Messages */}
                    <div className="flex-1 space-y-1">
                        {hasErrors && (
                            <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                                {lotError || sublotError || volumeErrors.find(err => err !== '')}
                            </div>
                        )}
                        {conflictWarning && (
                            <div className="text-xs text-yellow-600 px-2 py-1 font-medium flex items-center gap-1">
                                {isCheckingConflicts ? (
                                    <div className="w-3 h-3 border border-yellow-500 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                                ) : (
                                    <AlertTriangle size={16} className="flex-shrink-0" />
                                )}
                                <span>{conflictWarning}</span>
                            </div>
                        )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => onSave && onSave(data)}
                            disabled={!isValid || hasErrors}
                            className={`rounded text-xs font-medium w-6 h-6 flex items-center justify-center ${
                                isValid && !hasErrors
                                    ? 'text-green-600 hover:bg-green-100 enabled:hover:bg-green-200'
                                    : 'text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            <Save size={20} />
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="text-gray-600 hover:bg-gray-300 rounded text-xs font-medium w-6 h-6 flex items-center justify-center"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AddBagCardRow