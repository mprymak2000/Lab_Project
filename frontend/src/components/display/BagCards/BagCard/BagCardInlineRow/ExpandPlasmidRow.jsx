import React, {useState} from 'react'
import {PlasmidRecord} from '../../../../../utils/PlasmidRecord.js'
import { Save, X, LogOut, LogIn } from 'lucide-react';
import CustomDropdown from '../../../../common/CustomDropdown.jsx';
import { checkIn, checkOut } from '../../../../../utils/api.js';

const ExpandPlasmidRow = ({
    samples,
    isUpdating = false,
    onSamplesChange,
    notes = '',
    onNotesChange,
    dateAdded = '',
    isMovingBag = false,
    movedRecord,
    availableBags = [],
    onFieldChange,
    record,
    onCheckIO
}) => {
    const [volumeErrors, setVolumeErrors] = useState([]);
    const [bagError, setBagError] = useState('');

    const handleVolumeChange = (index, e) => {
        const value = e.target.value;

        // Only allow digits and decimal point
        if (!/^\d*\.?\d*$/.test(value)) return;

        const error = new PlasmidRecord({}).validateVolume(value);
        const newErrors = [...volumeErrors];
        newErrors[index] = error;
        setVolumeErrors(newErrors);

        const newSamples = [...samples];
        const oldSample = newSamples[index];
        newSamples[index] = {...oldSample,
            volume: value === "" ? null : value,
            date_created: oldSample.date_created !== "" ? oldSample.date_created : new Date().toISOString(),
            date_modified: new Date().toISOString()};
        onSamplesChange(newSamples);
    }

    const handleVolumeBlur = (index, e) => {
        const value = e.target.value;

        // Format if no errors
        if (value && !volumeErrors[index]) {
            let formattedValue = value;
            // Add .0 to whole numbers (e.g., "3" -> "3.0")
            if (!value.includes('.') && /^\d+$/.test(value)) {
                formattedValue = value + '.0';
            }
            // Add trailing 0 if ends with decimal point (e.g., "5." -> "5.0")
            else if (value.endsWith('.')) {
                formattedValue = value + '0';
            }

            // Update if we formatted something
            if (formattedValue !== value) {
                e.target.value = formattedValue;
                handleVolumeChange(index, e);
            }
        }

        // Auto-remove empty volumes (except the first one)
        if (!value && index > 0) {
            handleDeleteVolume(index);
        }
    }

    const handleAddVolume = () => {
        const now = new Date().toISOString();
        const newSamples = [...samples, { volume: null, date_created: now, date_modified: now }];
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
        if (!dateString) return '—';
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

    const formatDateAdded = (dateString) => {
        if (!dateString) return '—';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                month: 'short',
                day: '2-digit',
                year: 'numeric'
            });
        } catch {
            return dateString;
        }
    };

    const handleBagChange = (e) => {
        const value = e.target.value;
        const error = movedRecord?.validateBag(value);
        setBagError(error || '');
        onFieldChange?.('bag', value);
    };

    const handleCheckoutToggle = async (index) => {
        const sample = samples[index];

        try {
            if (sample.is_checked_out) {
                // Check in
                await checkIn(record, index);

                // Update local state
                const newSamples = [...samples];
                newSamples[index] = {
                    ...sample,
                    is_checked_out: false,
                    checked_in_at: new Date().toISOString()
                };
                onCheckIO(newSamples);
            } else {
                // Check out - prompt for username
                const userName = localStorage.getItem('labUserName') || prompt('Enter your name:');
                if (!userName) return; // Cancelled

                // Save name for future use
                localStorage.setItem('labUserName', userName);

                await checkOut(record, index, userName);

                // Update local state
                const newSamples = [...samples];
                newSamples[index] = {
                    ...sample,
                    is_checked_out: true,
                    checked_out_by: userName,
                    checked_out_at: new Date().toISOString()
                };
                onCheckIO(newSamples);
            }
        } catch (error) {
            console.error('Checkout/checkin failed:', error);
            alert(`Failed to ${sample.is_checked_out ? 'check in' : 'check out'} sample: ${error.message}`);
        }
    };

    const renderSaveButton = () => (
        <button
            onClick={() => onFieldChange?.('save')}
            disabled={!movedRecord?.isValid()}
            className={`p-1 rounded ${
                movedRecord?.isValid()
                    ? 'text-green-600 hover:bg-green-200'
                    : 'text-gray-400 cursor-not-allowed'
            }`}
        >
            <Save size={18} />
        </button>
    );

    const renderCancelButton = () => (
        <button
            onClick={() => onFieldChange?.('cancel')}
            className="text-gray-600 hover:bg-gray-300 p-1 rounded"
        >
            <X size={18} />
        </button>
    );

    const renderMoveBagInput = () => (
        <>
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-xs font-semibold">Move to bag:</span>
                    <CustomDropdown
                        value={movedRecord?.bag || ''}
                        onChange={handleBagChange}
                        options={[
                            { value: '', label: 'Bag' },
                            { value: `C${availableBags.length + 1}`, label: `+C${availableBags.length + 1}` },
                            ...availableBags.slice().reverse().map(bag => ({ value: bag, label: bag }))
                        ]}
                        placeholder="Bag"
                        className="px-2 py-1 text-gray-700 rounded-md transition-all duration-200 text-xs font-medium border focus:outline-none focus:ring-2 w-20"
                        hasError={!!bagError}
                    />
                </div>
                <div className="flex items-center gap-1">
                    {renderSaveButton()}
                    {renderCancelButton()}
                </div>
            </div>
            {bagError && (
                <div className="px-2 py-1 text-xs text-red-500">{bagError}</div>
            )}
        </>
    );

    return (
        <div>
            {/* Move Bag Section */}
            {isMovingBag && (
                <div className="px-2 pb-3">
                    {renderMoveBagInput()}
                </div>
            )}

            {/* Date Added */}
            <span className="text-gray-600 text-xs mb-2 px-2 block">
                <span className="font-semibold">Date Added:</span> {formatDateAdded(dateAdded)}
            </span>

            {/* Notes */}
            {isUpdating ? (
                <input
                    className="w-full h-6 px-2 py-1 mb-2 mx-2 bg-white text-xs shadow-sm focus:outline-blue-400 placeholder-gray-400 rounded border border-transparent"
                    value={notes}
                    onChange={(e) => onNotesChange?.(e.target.value)}
                    placeholder="Notes"
                    style={{width: 'calc(100% - 16px)'}}
                />
            ) : (
                <span className="text-gray-600 text-xs mb-2 px-2 block">
                    <span className="font-semibold">Notes:</span> {notes || "—"}
                </span>
            )}

            {/* Volumes Section */}
            <div className={`grid ${isUpdating ? 'grid-cols-3' : 'grid-cols-[1fr_1fr_1fr_auto]'} gap-4 text-xs font-semibold text-gray-600 px-2 pb-1`}>
                <div>Volume</div>
                <div>Created</div>
                <div>Modified</div>
                {!isUpdating && <div className="w-5"></div>}
            </div>
            {samples.map((sample, index) => (
                <div key={index} className={`flex items-center grid ${isUpdating ? 'grid-cols-3' : 'grid-cols-[1fr_1fr_1fr_auto]'} gap-4 text-xs text-gray-600 px-2 py-1 rounded transition-colors ml-px ${isUpdating ? 'items-center' : 'hover:bg-indigo-100'}`}>
                    <div className="relative">
                        {isUpdating ? (
                            <>
                                <input
                                    className={`w-full ${samples.length > 1 ? 'pr-4' : ''} h-6 px-2 py-1 bg-white text-xs shadow-sm ${volumeErrors[index] ? 'focus:ring-2 focus:ring-red-500 focus:outline-none ring-2 ring-red-500' : 'focus:ring-2 focus:ring-blue-400 focus:outline-none'} placeholder-gray-400 rounded border border-transparent`}
                                    value={sample.volume == null ? '' : sample.volume}
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
                            sample.volume != null ? `${sample.volume} mL` : `—`
                        )}
                    </div>
                    <div>{formatDate(sample.date_created)}</div>
                    <div>{formatDate(sample.date_modified)}</div>
                    {!isUpdating && !isMovingBag && (
                        <div>
                            <button
                                onClick={() => handleCheckoutToggle(index)}
                                className={`flex items-center p-1 rounded transition-colors ${
                                    sample.is_checked_out
                                        ? 'text-orange-600 hover:bg-orange-100'
                                        : 'text-green-600 hover:bg-green-100'
                                }`}
                                title={sample.is_checked_out ? `Checked out by ${sample.checked_out_by}` : 'Check out sample'}
                            >
                                {sample.is_checked_out ? <LogIn size={14} /> : <LogOut size={14} />}
                            </button>
                        </div>
                    )}
                </div>
            ))}
            
            {/* Add Volume Input */}
            {isUpdating && (
                <div className="grid grid-cols-3 gap-4 text-xs text-gray-600 px-2 py-1 rounded transition-colors">
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
            {isUpdating && volumeErrors.some(err => err !== '' && err !== undefined) && (
                <div className="px-2 py-1 text-xs text-red-500">
                    {volumeErrors.find(err => err !== '' && err !== undefined)}
                </div>
            )}
        </div>
    )
}
export default ExpandPlasmidRow

