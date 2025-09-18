import React, {useRef, useState} from 'react'
import {PlasmidRecord} from './utils/PlasmidRecord.js'

const PlasmidRecordInput = ({data, onDataChange, onDelete}) => {

    const lotRef = useRef(null);
    const sublotRef = useRef(null);

    const [sublotError, setSublotError] = useState('');
    const [lotError, setLotError] = useState('');
    const [volumeErrors, setVolumeErrors] = useState(['', '', '']);
    const [bagError, setBagError] = useState('');
    const [showNotes, setShowNotes] = useState(false);


    const handleLotChange = (e) => {
        const value = e.target.value;
        const error = data.validateLot(value);
        setLotError(error);

        const updatedRecord = new PlasmidRecord({...data, lot: value});
        onDataChange(updatedRecord);

        if (value.length === 4) sublotRef.current.focus();
    }




    const handleSublotChange = (e) => {
        const value = e.target.value;
        const error = data.validateSublot(value);
        setSublotError(error);

        const updatedRecord = new PlasmidRecord({...data, sublot: value});
        onDataChange(updatedRecord);
    }


    const handleSublotKeyDown = (e) => {
        if (e.key === 'Backspace' && data.sublot === '') lotRef.current.focus();
    }

    const handleVolumeChange = (index, e) => {
        const value = e.target.value;
        const error = data.validateVolume(value);
        const newErrors = [...volumeErrors];
        newErrors[index] = error;
        setVolumeErrors(newErrors);

        const newVolumes = [...data.volumes];
        const oldVolume = newVolumes[index];
        newVolumes[index] = {...oldVolume, volume: value === "" ? null : value};

        const updatedRecord = new PlasmidRecord({...data, volumes: newVolumes});
        onDataChange(updatedRecord);
    }

    // ADDS extra field for volume input, max 3
    const addVolumeInput = () => {
        if (data.volumes.length >= 3) return;

        const newVolumes = [...data.volumes, { volume: null, date_created: "", date_modified: ""}];
        const updatedRecord = new PlasmidRecord({...data, volumes: newVolumes});
        onDataChange(updatedRecord);
    }

    const handleVolumeBlur = (index, e) => {
        const value = e.target.value;

        // Auto-add .0 to whole numbers for clarity
        if (value && !value.includes('.') && /^\d+$/.test(value)) {
            e.target.value = value + '.0';
        }

        // Auto-remove empty volumes (except the first one)
        if (!value && index > 0) {
            deleteVolumeInput(index);
        }
    }

    // DELETES a volume input, minimum 1
    const deleteVolumeInput = (index) => {
        if (data.volumes.length <= 1) return; // Keep at least one volume

        const newVolumes = data.volumes.filter((_, i) => i !== index);
        const newErrors = volumeErrors.filter((_, i) => i !== index);
        setVolumeErrors(newErrors);

        const updatedRecord = new PlasmidRecord({...data, volumes: newVolumes});
        onDataChange(updatedRecord);
    }



    const handleBagChange = (e) => {
        const value = e.target.value;
        const error = data.validateBag(value);
        setBagError(error);

        const updatedRecord = new PlasmidRecord({...data, bag: value});
        onDataChange(updatedRecord);
    }



    return (
        <div className="bg-blue-50 rounded-lg p-2 shadow-sm">
            {/* Input Row for Lot/Sublot/Volumes */}
            <div className="bg-blue-50 rounded px-2 flex flex-wrap items-center gap-6 gap-y-2 text-sm">

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
                    {(data.volumes).map((volume, index) => (
                        <div key={index} className="relative">
                            <input
                                className={`w-14 px-1 py-1 ${data.volumes.length > 1 ? 'pr-4' : ''} bg-white text-s shadow-sm ${volumeErrors[index] ? 'focus:ring-1 focus:ring-red-500' : 'focus:ring-2 focus:ring-blue-400'} focus:outline-none placeholder-gray-400 rounded border ${volumeErrors[index] ? 'border-red-500' : 'border-transparent'}`}
                                placeholder={`Vol ${index + 1}`}
                                value={volume.volume === null ? '' : volume.volume}
                                autoFocus={index === data.volumes.length - 1 && index > 0}
                                onChange={(e) => handleVolumeChange(index, e)}
                                onBlur={(e) => handleVolumeBlur(index, e)}
                            />
                            {/* Delete Volume Button - embedded inside input */}
                            {data.volumes.length > 1 && (
                                <button
                                    type="button"
                                    className="absolute right-0 top-0 w-4 h-full bg-red-50  text-red-500 hover:bg-red-500 hover:text-white focus:outline-none flex items-center justify-center text-xs"
                                    onClick={() => deleteVolumeInput(index)}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    ))}

                    {/* Add Volume Button */}
                    {(data.volumes).length < 3 && (
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
                    <div className="relative flex-1 min-w-[150px]">
                        <input
                            className="w-full px-1 py-1 pr-4 bg-white text-s shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder-gray-400 rounded border border-transparent"
                            placeholder="Notes (optional)"
                            value={data.notes}
                            autoFocus
                            onChange={(e) => {
                                const updatedRecord = new PlasmidRecord({...data, notes: e.target.value});
                                onDataChange(updatedRecord);
                            }}
                            onBlur={() => {
                                if (!data.notes) setShowNotes(false);
                            }}
                        />
                        <button
                            type="button"
                            className="absolute right-0 top-0 w-4 h-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white focus:outline-none flex items-center justify-center text-xs rounded-r"
                            onClick={() => {
                                const updatedRecord = new PlasmidRecord({...data, notes: ''});
                                onDataChange(updatedRecord);
                                setShowNotes(false);
                            }}
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* Arrow & Bag */}
                <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-lg">→</span>
                    <input
                        className={`w-16 px-1 py-1 bg-white text-s shadow-sm ${bagError ? 'focus:ring-1 focus:ring-red-500' : 'focus:ring-2 focus:ring-blue-400'} focus:outline-none placeholder-gray-400 rounded border ${bagError ? 'border-red-500' : 'border-transparent'}`}
                        placeholder="Bag"
                        value={data.bag}
                        onChange={handleBagChange}
                    />
                </div>

                {/* Action Buttons */}
                <button
                    type="button"
                    className="px-2 py-2 text-gray-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-500 focus:ring-2 focus:ring-red-500 focus:outline-none rounded transition-colors"
                    onClick={onDelete}
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                </button>


                {/*Error messages*/}
                {(lotError || sublotError || bagError || volumeErrors.find(err => err !== '')) && (
                    <div className="w-full text-xs text-red-500 px-2 order-last">
                        {lotError || sublotError || bagError || volumeErrors[0] || volumeErrors[1] || volumeErrors[2]}
                    </div>
                )}
            </div>
        </div>
          )
}
export default PlasmidRecordInput
