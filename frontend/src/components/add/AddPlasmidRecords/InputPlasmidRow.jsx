import React from 'react';
import { usePlasmidRecordInput } from '../../../hooks/usePlasmidRecordInput.js';
import { AlertTriangle } from 'lucide-react';
import CustomDropdown from '../../common/CustomDropdown.jsx';

const InputPlasmidRow = ({data, onDataChange, onDelete, onSave, availableBags = []}) => {
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
        hasErrors,
        conflictWarning,
        isCheckingConflicts,
        validateAllFields
    } = usePlasmidRecordInput(data, onDataChange, onDelete, onSave);

    const handleRecordBlur = (e) => {
        // Only trigger if focus is leaving the entire record container
        if (!e.currentTarget.contains(e.relatedTarget)) {
            // Validate all fields and update error states
            validateAllFields();
        }
    };

    return (
        <div
            className={`rounded-lg p-3 shadow-sm border border-slate-200 hover:shadow-md transition-all duration-200 ${data.isValid() ? 'bg-green-50' : 'bg-indigo-50'}`}
            onBlur={handleRecordBlur}
        >
            {/* Input Row */}
            <div className="rounded px-2 text-sm flex flex-wrap gap-4 items-center">
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
                                className="py-2 w-8 h-8 text-gray-500 hover:text-indigo-600 hover:bg-indigo-100 border border-dashed border-gray-500 hover:border-indigo-400 focus:ring-2 focus:ring-blue-400 focus:outline-none rounded flex items-center justify-center text-lg font-semibold"
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
                            className="px-3 py-1 border border-dashed border-gray-500 text-gray-500 text-s rounded hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 transition-colors whitespace-nowrap"
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
                <div className="flex items-center gap-2 flex-shrink-0 min-w-[150px] justify-end">
                    <span className="text-indigo-400 text-3xl flex items-center justify-center mr-4">→</span>
                    <CustomDropdown
                        value={data.bag}
                        onChange={handleBagChange}
                        onBlur={handleBagBlur}
                        options={[
                            { value: '', label: 'Bag' },
                            { value: `C${availableBags.length + 1}`, label: `+C${availableBags.length + 1}` },
                            ...availableBags.slice().reverse().map(bag => ({ value: bag, label: bag }))
                        ]}
                        placeholder="Bag"
                        className="px-2 py-1 text-gray-700 rounded-md transition-all duration-200 text-sm font-medium border focus:outline-none focus:ring-2 w-20"
                        hasError={bagError}
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
                <div className="w-full text-s text-rose-500 pt-2 px-2 order-last font-medium">
                    {lotError || sublotError || bagError || volumeErrors[0] || volumeErrors[1] || volumeErrors[2]}
                </div>
            )}

            {/*Conflict warning*/}
            {conflictWarning && (
                <div className="w-full text-s text-yellow-600 px-2 py-1 mt-2 font-medium flex items-center gap-1">
                    {isCheckingConflicts ? (
                        <div className="w-3 h-3 border border-yellow-500 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                    ) : (
                        <AlertTriangle size={18} className="flex-shrink-0" />
                    )}
                    <span>{conflictWarning}</span>
                </div>
            )}
        </div>
    )
}

export default InputPlasmidRow;