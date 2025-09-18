import React, {useState} from 'react'
import {PlasmidRecord} from './utils/PlasmidRecord.js'

const SamplesView = ({samples, isEditing = false, onSamplesChange}) => {
    const [volumeErrors, setVolumeErrors] = useState([]);
    
    const handleVolumeChange = (index, e) => {
        const value = e.target.value;
        const error = new PlasmidRecord({}).validateVolume(value);
        const newErrors = [...volumeErrors];
        newErrors[index] = error;
        setVolumeErrors(newErrors);

        const newSamples = [...samples];
        const oldSample = newSamples[index];
        newSamples[index] = {...oldSample, volume: value === "" ? null : value};
        onSamplesChange(newSamples);
    }
    
    const handleVolumeBlur = (index, e) => {
        const value = e.target.value;
        
        // Auto-add .0 to whole numbers for clarity (same as PlasmidRecordInput)
        if (value && !value.includes('.') && /^\d+$/.test(value)) {
            e.target.value = value + '.0';
        }
        
        // Auto-remove empty volumes (except the first one)
        if (!value && index > 0) {
            handleDeleteVolume(index);
        }
    }
    
    const handleAddVolume = () => {
        if (samples.length >= 3) return;
        const now = new Date().toISOString();
        const newSamples = [...samples, { volume: null, date_created: now, date_modified: now}];
        onSamplesChange(newSamples);
    }
    
    const handleDeleteVolume = (index) => {
        if (samples.length <= 1) return;
        const newSamples = samples.filter((_, i) => i !== index);
        const newErrors = volumeErrors.filter((_, i) => i !== index);
        setVolumeErrors(newErrors);
        onSamplesChange(newSamples);
    }
    
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                month: 'numeric',
                day: 'numeric',
                year: '2-digit'
            });
        } catch {
            return dateString;
        }
    };

    return (
        <div>
            <div className="grid grid-cols-3 gap-4 text-xs font-semibold text-gray-600  pb-1">
                <div>Volume</div>
                <div>Created</div>
                <div>Modified</div>
            </div>
            {samples.map((sample, index) => (
                <div key={index} className={`grid grid-cols-3 gap-4 text-xs text-gray-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors `}>
                    <div className="relative">
                        {isEditing ? (
                            <>
                                <input
                                    className={`w-full ${samples.length > 1 ? 'pr-4' : ''} h-6 px-2 py-1 bg-white text-xs shadow-sm ${volumeErrors[index] ? 'focus:ring-2 focus:ring-red-500 focus:outline-none ring-2 ring-red-500' : 'focus:ring-2 focus:ring-blue-400 focus:outline-none'} placeholder-gray-400 rounded border border-transparent`}
                                    value={sample.volume === null ? '' : sample.volume}
                                    onChange={(e) => handleVolumeChange(index, e)}
                                    onBlur={(e) => handleVolumeBlur(index, e)}
                                    placeholder="Volume"
                                />
                                {/* Delete Volume Button - embedded inside input */}
                                {samples.length > 1 && (
                                    <button
                                        type="button"
                                         className="absolute right-0 top-0 w-4 h-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white focus:outline-none flex items-center justify-center text-xs rounded-r"
                                        onClick={() => handleDeleteVolume(index)}
                                    >
                                        ×
                                    </button>
                                )}
                            </>
                        ) : (
                            `${sample.volume} mL`
                        )}
                    </div>
                    <div>{formatDate(sample.date_created)}</div>
                    <div>{formatDate(sample.date_modified)}</div>
                </div>
            ))}
            
            {/* Add Volume Input */}
            {isEditing && samples.length < 3 && (
                <div className="grid grid-cols-3 gap-4 text-xs text-gray-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors">
                    <div>
                        <input
                            className="w-full h-6 px-2 py-1 text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder-gray-400 rounded border border-dashed border-gray-300 hover:border-blue-400 cursor-pointer"
                            placeholder="+ mL"
                            onClick={handleAddVolume}
                            onFocus={handleAddVolume}
                            readOnly
                        />
                    </div>
                    <div></div>
                    <div></div>
                </div>
            )}
            
            {/* Error messages */}
            {isEditing && volumeErrors.some(err => err !== '' && err !== undefined) && (
                <div className="px-2 py-1 text-xs text-red-500">
                    {volumeErrors.find(err => err !== '' && err !== undefined)}
                </div>
            )}
        </div>
    )
}
export default SamplesView

