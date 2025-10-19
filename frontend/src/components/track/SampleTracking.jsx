import React, {useState, useEffect} from 'react'
import { getCheckedOutRecords } from '../../utils/api.js';
import {PlasmidRecord} from "../../utils/PlasmidRecord.js";
import {checkIn} from "../../utils/api.js";
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import ConfirmDialog, { PlasmidRecordPreview } from '../common/ConfirmDialog.jsx';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { sortBagNames, sortPlasmidIds } from '../../utils/sortingUtils.js';

const SampleTracking = () => {

    const [records, setRecords] = useState({});
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [checkingIn, setCheckingIn] = useState(false);
    const [json, setJson] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'bag', direction: 'asc' });
    const [openDialogId, setOpenDialogId] = useState(null);
    const [dialogVolume, setDialogVolume] = useState('');
    const [dialogVolumeError, setDialogVolumeError] = useState(null);
    const [dialogMessage, setDialogMessage] = useState({ type: null, text: '' });

    const fetchCheckedOutRecords = async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await getCheckedOutRecords();
            console.log("Checked Out Records API Result:", result);
            setJson(result);
            const convertedBags = {};
            if (result) {
                for (const [bag, records] of Object.entries(result)) {
                    convertedBags[bag] = records.map(record => {
                        return new PlasmidRecord({...record, bag: bag})
                    });
                }
            }
            setRecords(convertedBags);

        } catch (error) {
            console.error("Error fetching checked out records:", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }

    // Sorting logic using your existing utilities
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Create sorted flat list of samples for display
    const getSortedSamples = () => {
        const samples = [];

        // Flatten all samples with their context
        Object.entries(records).forEach(([bagName, plasmids]) => {
            plasmids.forEach((plasmid) => {
                plasmid.samples.filter(sample => sample.is_checked_out).forEach((sample) => {
                    const actualSampleIndex = plasmid.samples.indexOf(sample);
                    samples.push({
                        bagName,
                        plasmid,
                        sample,
                        actualSampleIndex,
                        plasmidId: `${plasmid.lot}-${plasmid.sublot}`
                    });
                });
            });
        });

        return samples.sort((a, b) => {
            let result = 0;

            if (sortConfig.key === 'bag') {
                result = sortBagNames(a.bagName, b.bagName);
                // Secondary sort by plasmid ID
                if (result === 0) {
                    result = sortPlasmidIds(a.plasmidId, b.plasmidId);
                }
            } else if (sortConfig.key === 'plasmidId') {
                result = sortPlasmidIds(a.plasmidId, b.plasmidId);
                // Secondary sort by bag name
                if (result === 0) {
                    result = sortBagNames(a.bagName, b.bagName);
                }
            }

            return sortConfig.direction === 'desc' ? -result : result;
        });
    };

    // Dialog-specific volume handlers that only update local state
    const handleDialogVolumeChange = (e) => {
        const value = e.target.value;

        // Only allow digits and decimal point
        if (!/^\d*\.?\d*$/.test(value)) return;

        const error = PlasmidRecord.staticValidateVolume(value);
        setDialogVolumeError(error);
        setDialogVolume(value);
    }

    const handleDialogVolumeBlur = (e) => {
        const value = e.target.value;

        // Format if no errors
        if (value) {
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
                setDialogVolume(formattedValue);
            }
        }
    }

    const confirmCheckIn = async (record, sampleIndex) => {
        // Validate the volume before proceeding
        if (dialogVolumeError) {
            return; // Don't proceed if there's a validation error
        }

        console.log('Starting check-in process for:', record.lot, record.sublot, 'sample index:', sampleIndex);
        setCheckingIn(true);
        setDialogMessage({ type: null, text: '' });

        try {
            // Update the record with the dialog volume before checking in
            const newSamples = [...record.samples];
            const oldSample = newSamples[sampleIndex];
            newSamples[sampleIndex] = {
                ...oldSample,
                volume: dialogVolume === "" ? null : dialogVolume,
                date_created: oldSample.date_created !== "" ? oldSample.date_created : new Date().toISOString(),
                date_modified: new Date().toISOString()
            };

            const updatedRecord = new PlasmidRecord({...record, samples: newSamples});

            await checkIn(updatedRecord, sampleIndex);

            // Show success message
            setDialogMessage({ type: 'success', text: 'Sample successfully checked in!' });

        } catch (error) {
            console.error("Error checking-in sample:", error);
            setDialogMessage({ type: 'error', text: `Failed to check in sample: ${error.message}` });
        } finally {
            setCheckingIn(false);
        }
    }

    const handleSuccessOk = (record, sampleIndex) => {
        // Update local state
        setRecords(prevRecords => {
            const newRecords = { ...prevRecords };
            const bagRecords = [...newRecords[record.bag]];
            const recordIndex = bagRecords.findIndex(r =>
                r.lot === record.lot && r.sublot === record.sublot
            );

            if (recordIndex !== -1) {
                const updatedPlasmid = { ...bagRecords[recordIndex] };
                // Update the specific sample with new volume and mark as checked in
                updatedPlasmid.samples = updatedPlasmid.samples.map((sample, index) => {
                    if (index === sampleIndex) {
                        // Update with new volume and mark as checked back in
                        return {
                            ...sample,
                            volume: dialogVolume === "" ? null : dialogVolume,
                            date_modified: new Date().toISOString(),
                            is_checked_out: false
                        };
                    }
                    return sample;
                });

                // Only remove if no checked-out samples remain
                const checkedOutSamples = updatedPlasmid.samples.filter(s => s.is_checked_out);
                if (checkedOutSamples.length === 0) {
                    // Remove plasmid entirely if no checked-out samples left
                    bagRecords.splice(recordIndex, 1);
                } else {
                    bagRecords[recordIndex] = updatedPlasmid;
                }

                if (bagRecords.length === 0 || bagRecords.every(p => p.samples.every(s => !s.is_checked_out))) {
                    // Remove bag entirely if no checked-out samples left
                    delete newRecords[record.bag];
                } else {
                    newRecords[record.bag] = bagRecords;
                }
            }

            return newRecords;
        });

        // Close dialog
        setOpenDialogId(null);
        setDialogVolume('');
        setDialogVolumeError(null);
        setDialogMessage({ type: null, text: '' });
    }

    // Fetch data when component mounts
    useEffect(() => {
        fetchCheckedOutRecords();
    }, []);

    return (
        <div className="mx-5">
            {/* Header Section */}
            <div className="mb-15 mt-10 -ml-11">
                <div className="inline-block pl-10 px-5 py-3 shadow-[0_4px_12px_rgba(251,146,60,0.25)] rounded-r-xl" style={{backgroundImage: 'linear-gradient(to right, rgb(251 166 96), rgb(253 184 120))'}}>
                    <h1 className="text-2xl font-bold text-white mb-1">Sample Access Manager</h1>
                    <p className="text-white text-sm font-medium">
                        View all checked out samples and their history, manage them and check them back in.
                    </p>
                </div>
            </div>

            {/* Loading Spinner */}
            {loading && <LoadingSpinner message="Fetching records..." />}

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-red-800 font-medium">Error: {error}</p>
                    <button
                        onClick={fetchCheckedOutRecords}
                        className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* No Records Message */}
            {!loading && !error && records && Object.keys(records).length === 0 && (
                <div className="text-center py-12">
                    <div className="flex flex-col items-center gap-4">
                        <svg className="w-16 h-16 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <p className="text-gray-600 text-lg font-medium">No checked out samples found</p>
                        <p className="text-gray-500 text-sm">All samples are currently in storage</p>
                    </div>
                </div>
            )}

            {/* Records Display - Modern Table View */}
            {!loading && !error && records && Object.keys(records).length > 0 && (
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    {/* Summary Header */}
                    <div className="bg-gradient-to-r from-indigo-400 via-indigo-400 via-70% to-blue-400 px-6 py-4 shadow-[0_5px_5px_-1px_rgba(0,0,0,0.7)]">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-50">Checked Out Samples</h3>
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-semibold text-gray-50">
                                    {Object.values(records).reduce((total, plasmids) =>
                                        total + plasmids.reduce((sum, p) => sum + p.samples.filter(s => s.is_checked_out).length, 0), 0
                                    )} samples across {Object.keys(records).length} bags
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Responsive Table Container */}
                    <div className="overflow-x-auto">
                        <div className="min-w-fit">
                            {/* Table Header */}
                            <div className="bg-orange-300/80">
                                <div className="px-6 py-3 grid grid-cols-[60px_100px_90px_70px_80px_80px_80px] md:grid-cols-[1fr_2fr_2fr_1.8fr_1.5fr_0.9fr_2.5fr] gap-2 md:gap-4 items-center text-xs font-medium text-slate-700 uppercase tracking-wide">
                                    {/* Sortable Bag Column */}
                                    <button
                                        className="flex items-center gap-1 hover:text-slate-800 transition-colors text-center justify-center"
                                        onClick={() => handleSort('bag')}
                                    >
                                        Bag
                                        {sortConfig.key === 'bag' && (
                                            sortConfig.direction === 'asc' ?
                                            <ChevronUp size={12} /> :
                                            <ChevronDown size={12} />
                                        )}
                                    </button>

                                    {/* Sortable Plasmid ID Column */}
                                    <button
                                        className="flex items-center gap-1 hover:text-slate-800 transition-colors text-center justify-center"
                                        onClick={() => handleSort('plasmidId')}
                                    >
                                        Plasmid ID
                                        {sortConfig.key === 'plasmidId' && (
                                            sortConfig.direction === 'asc' ?
                                            <ChevronUp size={12} /> :
                                            <ChevronDown size={12} />
                                        )}
                                    </button>

                                    <div className="text-center">Date Created</div>
                                    <div className="text-center">Volume</div>
                                    <div className="text-center">Checked Out At</div>
                                    <div className="text-center">By</div>
                                    <div className="text-center">Action</div>
                                </div>
                            </div>

                            {/* Table Content */}
                            <div className="divide-y divide-slate-100">
                                {getSortedSamples().map(({ bagName, plasmid, sample, actualSampleIndex }) => (
                                    <div key={`${bagName}-${plasmid.lot}-${plasmid.sublot}-${actualSampleIndex}`}
                                         className="px-6 py-3 hover:bg-indigo-50 transition-colors">
                                        <div className="grid grid-cols-[60px_100px_90px_70px_80px_80px_80px] md:grid-cols-[1fr_2fr_2fr_1.8fr_1.5fr_0.9fr_2.5fr] gap-2 md:gap-4 items-center">
                                            {/* Bag */}
                                            <div className="text-center">
                                                <span className="font-mono font-bold text-amber-600 bg-orange-100 px-2 py-1 rounded text-sm">
                                                    {bagName}
                                                </span>
                                            </div>

                                            {/* Plasmid ID */}
                                            <div className="text-center">
                                                <span className="font-mono font-semibold text-blue-800 bg-blue-100 px-2 py-1 rounded text-sm">
                                                    {plasmid.lot}-{plasmid.sublot}
                                                </span>
                                            </div>

                                            {/* Date Created */}
                                            <div className="text-sm text-slate-600 text-center">
                                                {new Date(sample.date_created).toLocaleDateString()}
                                            </div>

                                            {/* Volume */}
                                            <div className="text-sm font-medium text-blue-700 text-center">
                                                {sample.volume}mL
                                            </div>

                                            {/* Checked Out At */}
                                            <div className="text-xs text-red-600 text-center">
                                                {sample.checked_out_at ? (
                                                    <div>
                                                        <div>{new Date(sample.checked_out_at).toLocaleDateString()}</div>
                                                        <div>{new Date(sample.checked_out_at).toLocaleTimeString()}</div>
                                                    </div>
                                                ) : '-'}
                                            </div>

                                            {/* Checked Out By */}
                                            <div className="text-sm text-red-600 text-center">
                                                {sample.checked_out_by}
                                            </div>

                                            {/* Action */}
                                            <div className="text-center">
                                                <button
                                                    className="shadow-md px-3 py-1.5 bg-green-500 hover:bg-white hover:text-green-600 hover:shadow-none hover:outline-2 hover:outline-green-600 text-white rounded-md transition-all duration-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-200"
                                                    onClick={() => {
                                                        setOpenDialogId(`${bagName}-${plasmid.lot}-${plasmid.sublot}-${actualSampleIndex}`);
                                                        setDialogVolume(sample.volume == null ? '' : sample.volume);
                                                        setDialogVolumeError(null);
                                                        setDialogMessage({ type: null, text: '' });
                                                    }}
                                                >
                                                    Check In
                                                </button>
                                            </div>

                                            {/* Confirm Check-In Dialog */}
                                            {openDialogId === `${bagName}-${plasmid.lot}-${plasmid.sublot}-${actualSampleIndex}` && (
                                                <ConfirmDialog
                                                    isOpen={true}
                                                    type={dialogMessage.type}
                                                    successMessage={dialogMessage.text}
                                                    onConfirm={() => {
                                                        if (dialogMessage.type === 'success') {
                                                            handleSuccessOk(plasmid, actualSampleIndex);
                                                        } else {
                                                            confirmCheckIn(plasmid, actualSampleIndex);
                                                        }
                                                    }}
                                                    onCancel={() => {
                                                        setOpenDialogId(null);
                                                        setDialogVolume('');
                                                        setDialogVolumeError(null);
                                                        setDialogMessage({ type: null, text: '' });
                                                    }}
                                                    title={dialogMessage.type === 'success' ? "Success" : "Confirm Volume"}
                                                    message={dialogMessage.type === 'success' ? `${dialogMessage.text}` : "Please input the new volume (mL) for this sample:"}
                                                    confirmText={dialogMessage.type === 'success' ? "OK" : "Check In"}
                                                    cancelText={dialogMessage.type === 'success' ? null : "Cancel"}
                                                    current={
                                                        dialogMessage.type !== 'success' && (
                                                            <div className="w-48 space-y-2">
                                                                <div className="flex justify-center">
                                                                    <div className="relative">
                                                                        <input
                                                                            type="text"
                                                                            className={`w-20 h-10 px-3 pr-8 py-2 bg-white text-sm shadow-sm rounded-md border-2 transition-all duration-200 text-center ${
                                                                                dialogVolumeError
                                                                                    ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-200'
                                                                                    : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                                                                            } placeholder-gray-400 focus:outline-none`}
                                                                            value={dialogVolume}
                                                                            onChange={handleDialogVolumeChange}
                                                                            onBlur={handleDialogVolumeBlur}
                                                                            placeholder="0.0"
                                                                            disabled={checkingIn}
                                                                        />
                                                                        <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs font-medium pointer-events-none">
                                                                            mL
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                {dialogVolumeError && (
                                                                    <div className="text-center">
                                                                        <div className="text-red-600 text-xs font-medium">
                                                                            {dialogVolumeError}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {dialogMessage.text && dialogMessage.type === 'error' && (
                                                                    <div className="text-center">
                                                                        <div className="text-red-600 text-sm font-medium">
                                                                            {dialogMessage.text}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    }
                                                />
                                                )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
export default SampleTracking
