import React, {useEffect, useRef, useState} from 'react'
import {PlasmidRecord} from './utils/PlasmidRecord.js'

const PlasmidRecordInput = ({data, onDataChange, onDelete}) => {

    const lotRef = useRef(null);
    const sublotRef = useRef(null);
    const vol1Ref = useRef(null);

    const [sublotError, setSublotError] = useState('');
    const [lotError, setLotError] = useState('');
    const [vol1Error, setVol1Error] = useState('');
    const [vol2Error, setVol2Error] = useState('');


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

    const handleVol1Change = (e) => {
        const value = e.target.value;
        const error = data.validateVol1(value);
        setVol1Error(error);

        const updatedRecord = new PlasmidRecord({...data, vol1: value});
        onDataChange(updatedRecord);
    }


    const handleVol2Change = (e) => {
        const value = e.target.value;
        const error = data.validateVol2(value);
        setVol2Error(error);

        const updatedRecord = new PlasmidRecord({...data, vol2: value});
        onDataChange(updatedRecord);
    }

    const handleVolBlur = (vol, e) => {
        const value = e.target.value;
        if (value && !value.includes('.') && /^\d+$/.test(value)) {
            const updatedRecord = new PlasmidRecord({...data, [vol]: value + '.0'});
            onDataChange(updatedRecord);
        }
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
                    onChange = {(e) => {
                        const updatedRecord = new PlasmidRecord({...data, notes: e.target.value});
                        onDataChange(updatedRecord);
                    }}
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
