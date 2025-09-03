import React, {useEffect, useRef, useState} from 'react'

const PlasmidRecordInput = ({onValidationChange, onDataChange, data, onDelete}) => {

    const lotRef = useRef(null);
    const sublotRef = useRef(null);
    const vol1Ref = useRef(null);


    const [notes, setNotes] = useState('');

    const [sublotError, setSublotError] = useState('');
    const [lotError, setLotError] = useState('');
    const [vol1Error, setVol1Error] = useState('');
    const [vol2Error, setVol2Error] = useState('');

    useEffect(() => {
        const recordIsValid = (
            data.lot !== "" && data.sublot !== "" && data.vol1 !== "" && !lotError && !sublotError && !vol1Error && !vol2Error
        );
        onValidationChange(recordIsValid);
    }, [data.lot, data.sublot, data.vol1, data.vol2, lotError, sublotError, vol1Error, vol2Error]);

    const handleLotChange = (e) => {
        const value = e.target.value;
        if (/[^a-zA-Z0-9]/.test(value)) {
            setLotError("Lot: this field only accepts numbers (or letters)");
            setTimeout(() => setLotError(""), 3000);
            return;
        }
        if (value === "0" || /^0+/.test(value)) {
            setLotError("Lot: this field cannot be zero or have leading zeros");
            return;
        } else if (value === "")
            setLotError("Lot: this field cannot be empty");
        else setLotError("");
        onDataChange('lot', value);

        if (value.length === 4) {
            sublotRef.current.focus();
        }
    }

    const handleSublotChange = (e) => {
        const value = e.target.value;
        if (/[^a-zA-Z0-9]/.test(value)) {
            setSublotError("Sublot: this field only accepts numbers (or letters)");
            setTimeout(() => setSublotError(""), 3000);
            return;
        }
        if (value === "0" || /^0+/.test(value)) {
            setSublotError("Sublot: this field cannot be zero or have leading zeros");
            return;
        }
        if(value==="")
            setSublotError("Sublot: this field cannot be empty");
        else setSublotError("");
        onDataChange('sublot', value);
    }

    const handleSublotKeyDown = (e) => {
        if (e.key === 'Backspace' && data.sublot === '')
            lotRef.current.focus();
    }

    const handleVol1Change = (e) => {
        const value = e.target.value;
        if (!/^\d*\.?\d*$/.test(value) || value === '.') {
            setVol1Error("Volume 1: this field only accepts numbers");
            return;
        }
        if (value === "0" || /^0+(?!\.)/.test(value) || /^0+\.0+$/.test(value)) {
            setVol1Error("Volume 1: this field cannot be zero or have leading zeros");
        } else if (value === "") {
            setVol1Error("Volume 1: this field cannot be empty");
        } else {
            setVol1Error("");
        }

        onDataChange('vol1', value);
    }

    const handleVolBlur = (vol, e) => {
        const value = e.target.value;
        if (value && !value.includes('.') && /^\d+$/.test(value)) {
            onDataChange(vol, value + '.0');
        }
    }

    const handleVol2Change = (e) => {
        const value = e.target.value;
        if (value !== "" && (!/^\d*\.?\d*$/.test(value) || value === '.')) {
            setVol2Error("Volume 2: this field only accepts numbers");
            setTimeout(() => setVol2Error(""), 3000);
            return;
        }
        if (value === "0" || /^0+(?!\.)/.test(value) || /^0+\.0+$/.test(value)) {
            setVol2Error("Volume 2: this field cannot be zero or have leading zeros");
        } else {
            setVol2Error("");
        }
        onDataChange('vol2', value);
    }


    return (
        <div className="bg-blue-50 rounded-lg p-2 shadow-sm">
            {/* Input Row for Lot/Sublot/Volumes */}
            <div className="bg-blue-50 rounded px-2 flex flex-wrap items-center gap-6 gap-y-2 text-sm">

                <div className="flex items-center gap-1">
                    {/*Lot*/}
                    <input
                        className={`w-20 px-2 py-2 bg-white text-s shadow-sm ${lotError ? 'focus:ring-1 focus:ring-red-500' : 'focus:ring-2 focus:ring-blue-400'} focus:outline-none placeholder-gray-400 rounded border ${lotError ? 'border-red-500' : 'border-transparent'}`}
                        placeholder="Lot"
                        ref = {lotRef}
                        value={data.lot}
                        onChange={handleLotChange}
                        maxLength={4}
                    />
                    <span className="text-gray-400 text-s">-</span>
                    {/*Sublot*/}
                    <input
                        className={`w-16 px-2 py-2 bg-white text-s shadow-sm ${sublotError ? 'focus:ring-1 focus:ring-red-500' : 'focus:ring-2 focus:ring-blue-400'} focus:outline-none placeholder-gray-400 rounded border ${sublotError ? 'border-red-500' : 'border-transparent'}`}
                        placeholder="Sublot"
                        ref = {sublotRef}
                        value = {data.sublot}
                        onKeyDown={handleSublotKeyDown}
                        onChange={handleSublotChange}
                    />
                </div>

                <div className="flex items-center gap-1">
                    {/*Volume 1*/}
                    <input
                        className={`w-12 px-2 py-2 bg-white text-s shadow-sm ${vol1Error ? 'focus:ring-1 focus:ring-red-500' : 'focus:ring-2 focus:ring-blue-400'} focus:outline-none placeholder-gray-400 rounded border ${vol1Error ? 'border-red-500' : 'border-transparent'}`}
                        placeholder="Vol 1"
                        value = {data.vol1}
                        onChange={handleVol1Change}
                        onBlur = {(e) => handleVolBlur('vol1', e)}
                    />
                    <span className="w-1"></span>
                    {/*Volume 2*/}
                    <input
                        className={`w-12 px-2 py-2 bg-white text-s shadow-sm ${vol2Error ? 'focus:ring-1 focus:ring-red-500' : 'focus:ring-2 focus:ring-blue-400'} focus:outline-none placeholder-gray-400 rounded border ${vol2Error ? 'border-red-500' : 'border-transparent'}`}
                        placeholder="Vol 2"
                        value = {data.vol2}
                        onChange={handleVol2Change}
                        onBlur = {(e) => handleVolBlur('vol2', e)}
                    />
                </div>

                {/*Trash*/}
                <button
                    className="px-2 py-2 text-gray-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-500 focus:ring-2 focus:ring-red-500 focus:outline-none rounded transition-colors ml-auto sm:ml-0 order-1 sm:order-3 sm:ml-auto"
                    onClick={onDelete}
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                </button>

                {/*Notes*/}
                <input
                    className="flex-1 min-w-[150px] px-2 py-2 bg-white text-s shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder-gray-400 rounded order-2 sm:order-1"
                    placeholder="Notes: ex. Endo Free"
                    value = {data.notes}
                    onChange = {(e) => onDataChange('notes', e.target.value)}
                />


                {/*Error messages*/}
                {(lotError || sublotError || vol1Error || vol2Error) && (
                    <div className="w-full text-xs text-red-500 px-2 order-last">
                        {lotError || sublotError || vol1Error || vol2Error}
                    </div>
                )}
            </div>
        </div>
          )
}
export default PlasmidRecordInput
