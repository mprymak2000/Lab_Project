import {useEffect, useState} from "react";
import {PlasmidRecord} from "./utils/PlasmidRecord.js";
import { Save, X, Trash2 } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog.jsx';
import SamplesView from "./SamplesView.jsx";
import PlasmidRecordInput from "./PlasmidRecordInput.jsx";

const BagCard = ({bagName, recordsPassed, onBagDataChanged}) => {

    const [isCollapsed, setIsCollapsed] = useState(true); // Track collapsed state of bags
    const [sortBy, setSortBy] = useState('id')
    const [expandedRecord, setExpandedRecord] = useState(null);
    const [editingRecord, setEditingRecord] = useState(null);
    const [tempEditingRecord, setTempEditingRecord] = useState(null);
    const [editingRecordSamples, setEditingRecordSamples] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);
    const [contextMenuRecord, setContextMenuRecord] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState(null);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [isAddingRecord, setIsAddingRecord] = useState(false);
    const [newRecord, setNewRecord] = useState(null);


    const handleContextMenu = (e, record) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenuRecord(record);
        setContextMenu({x: e.clientX, y: e.clientY});
    }

    useEffect(() => {
        const handleClickOutside = () => {
            setContextMenu(null);
            setContextMenuRecord(null);
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, [])

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (editingRecord) {
                    // Exit editing mode (like cancel)
                    handleCancelEdit();
                } else if (expandedRecord) {
                    // Exit expanded mode
                    setExpandedRecord(null);
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [editingRecord, expandedRecord])

    const handleDeleteRecord = (targetRecord) => {
        const updatedPlasmids = recordsPassed.filter(p => p.getFullId() !== targetRecord.getFullId());
        onBagDataChanged(updatedPlasmids)
    }

    const handleDeleteClick = (targetRecord) => {
        setRecordToDelete(targetRecord);
        setShowDeleteConfirm(true);
    }

    const confirmDelete = () => {
        if (recordToDelete) {
            handleDeleteRecord(recordToDelete);
        }
        setShowDeleteConfirm(false);
        setRecordToDelete(null);
    }

    const handleViewDetails = (targetRecordId) => {
        if (editingRecord?.getFullId() === targetRecordId) {
            // Already editing, do nothing on double-click
            return;
        }
        
        if (expandedRecord === targetRecordId) {
            // Already expanded, second double-click starts editing
            const record = recordsPassed.find(p => p.getFullId() === targetRecordId);
            handleEditRecord(record);
        } else {
            // Not expanded, first double-click expands
            setExpandedRecord(targetRecordId);
        }
    }

    const handleAddPlasmid = () => {
        setIsAddingRecord(true);
        setNewRecord(new PlasmidRecord({lot: '', sublot: '', bag: bagName, volumes: [{ volume: null, date_created: "", date_modified: ""}]}));
    }

    const handleAddRecordSave = (record) => {
        if (record.isValid()) {
            const updatedPlasmids = [...recordsPassed, record];
            onBagDataChanged(updatedPlasmids);
            setIsAddingRecord(false);
            setNewRecord(null);
        }
    }

    const handleAddRecordCancel = () => {
        setIsAddingRecord(false);
        setNewRecord(null);
    }

    const handleEditRecord = (targetRecord) => {
        setEditingRecord(targetRecord);
        setTempEditingRecord(new PlasmidRecord({...targetRecord}));
        setExpandedRecord(targetRecord.getFullId()); 
    }
    const handleFieldChange = (field, value) => {
        setTempEditingRecord(prev => new PlasmidRecord({...prev, [field]: value}));
    }


    const handleCancelEdit = () => {
        setEditingRecord(null);
        setTempEditingRecord(null);
    }

    const handleSaveEdit = () => {
        // Validate the entire record before saving
        if (!tempEditingRecord.isValid()) {
            // Record is invalid, don't proceed with save
            console.log('Record is invalid, cannot save:', tempEditingRecord);
            return;
        }
        
        if (editingRecord?.getFullId() === tempEditingRecord?.getFullId() &&
            JSON.stringify(editingRecord?.volumes) === JSON.stringify(tempEditingRecord?.volumes) &&
            editingRecord?.notes === tempEditingRecord?.notes) {
            // No changes detected, just exit editing mode
            setEditingRecord(null);
            setTempEditingRecord(null);
            return;
        }
        setShowSaveConfirm(true);
    }

    const confirmSave = () => {
        const updatedPlasmids = recordsPassed.map(p => {
            if (p.getFullId() === editingRecord.getFullId()) {
                return tempEditingRecord;
            }
            return p;
        });

        onBagDataChanged(updatedPlasmids);
        setEditingRecord(null);
        setTempEditingRecord(null);
        setShowSaveConfirm(false);
    }

    const sortedPlasmids = [...recordsPassed].sort((a, b) => {
        if (sortBy === 'id') return a.getFullId().localeCompare(b.getFullId());
        if (sortBy === 'vol1') return parseFloat(b.total_volume) - parseFloat(a.total_volume);
        if (sortBy === 'date') return new Date(b.date_added) - new Date(a.date_added);
        return 0;
    });

    const toggleBag = () => {
        setIsCollapsed(prevState => !prevState);
    }

    const renderPlasmidRecord = (record, label, bgColor, textColor, layout = 'stacked', showLabel = true, otherRecord = null) => {
        const notesChanged = otherRecord && (record?.notes !== otherRecord?.notes);

        return (
            <div className="p-3">
                {showLabel && <div className={`text-xs font-semibold mb-2 ${textColor}`}>{label}</div>}
                <div className={layout === 'stacked' ? 'space-y-2' : 'flex gap-2'}>
                    <div className={`font-mono font-semibold px-2 py-1 rounded text-xs whitespace-nowrap w-16 text-center ${bgColor} ${textColor}`}>
                        <span>{record?.getFullId()}</span>
                    </div>
                    <div className={`font-mono font-semibold px-2 py-1 rounded text-xs whitespace-nowrap w-16 text-center ${bgColor} ${textColor}`}>
                        {`${record?.total_volume}mL` || '—'}
                    </div>
                    {notesChanged && (
                        <div className={`font-mono font-semibold px-2 py-1 rounded text-xs whitespace-nowrap w-20 text-center ${bgColor} ${textColor}`}>
                            {label === "Original" ? "Note" : "New Note"}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
    <>
        <div key={bagName} className={`bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col transform-gpu min-w-80 ${isCollapsed ? 'hover:scale-105' : ''}`}>

            {/* Bag Header */}
            <div className="bg-gradient-to-r from-blue-100 to-indigo-100 px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <h3 className="text-xl font-bold text-gray-800 ml-3">{bagName}</h3>
                    </div>

                    {/* Sort dropdown */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-1 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors text-xs font-medium border-none focus:outline-none focus:ring-1 focus:ring-blue-400 w-24"
                    >
                        <option value="id">Sort by ID</option>
                        <option value="vol1">Sort by Volume</option>
                        <option value="date">Sort by Date</option>
                    </select>

                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                        {recordsPassed.length} plasmids
                    </span>
                </div>
            </div>

            <div className={`flex-1 ${isCollapsed ? 'max-h-80 overflow-y-auto' : ''}`}>
                {/* Add Record Area */}
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    {isAddingRecord && newRecord ? (
                        <div className="flex items-start gap-3">
                            <div className="flex-1 [&_input]:!h-6 [&_input]:!px-2 [&_input]:!py-1 [&_input]:!bg-white [&_input]:!text-xs [&_input]:!shadow-sm [&_input]:!focus:outline-blue-400 [&_input]:!placeholder-gray-400 [&_input]:!rounded [&_input]:!border [&_input]:!border-transparent [&_.bg-blue-50]:!bg-transparent [&_.bg-blue-50]:!p-0 [&_.bg-blue-50]:!shadow-none [&_.bg-blue-50]:!rounded-none [&_div.flex.items-center.gap-2:has(input[placeholder='Bag'])]:!hidden [&_input[placeholder='Lot']]:!w-16 [&_input[placeholder='Sublot']]:!w-16 [&_button.px-2.py-2]:!hidden [&_.bg-blue-50.rounded.px-2.flex.flex-wrap.items-center.gap-6.gap-y-2.text-sm]:!flex-col [&_.bg-blue-50.rounded.px-2.flex.flex-wrap.items-center.gap-6.gap-y-2.text-sm]:!items-start [&_button.py-2.w-8.h-8]:!w-6 [&_button.py-2.w-8.h-8]:!h-6 [&_button.py-2.w-8.h-8]:!py-1 [&_button.px-3.py-1]:!px-2 [&_button.px-3.py-1]:!py-1 [&_div.relative.flex-1.min-w-\\[150px\\]]:!w-full [&_div.relative.flex-1.min-w-\\[150px\\]]:!flex-1 [&_div.relative.flex-1.min-w-\\[150px\\]]:!order-last [&_div.relative.flex-1.min-w-\\[150px\\]]:!basis-full">
                                <PlasmidRecordInput
                                    data={newRecord}
                                    onDataChange={setNewRecord}
                                    onDelete={() => {}}
                                />
                            </div>
                            <div className="flex flex-col gap-1 pt-1">
                                <button 
                                    onClick={() => handleAddRecordSave(newRecord)} 
t                                    className="text-green-600 hover:bg-green-200 p-2 rounded text-xs font-medium w-9 h-9 flex items-center justify-center"
                                >
                                    <Save size={16} />
                                </button>
                                <button 
                                    onClick={handleAddRecordCancel} 
                                    className="text-gray-600 hover:bg-gray-300 p-2 rounded text-xs font-medium w-9 h-9 flex items-center justify-center"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center text-gray-500 text-xs cursor-pointer hover:text-blue-600 transition-colors" onClick={handleAddPlasmid}>
                            <span className="mr-2">+</span>
                            <span>Add new plasmid record</span>
                        </div>
                    )}
                </div>
                
                {sortedPlasmids.map ((p) => {
                    const isEditing = editingRecord?.getFullId() === p.getFullId();
                    const isExpanded = expandedRecord === p.getFullId();
                    return (

                        <div
                            key={p.getFullId()}
                            className={`flex items-center justify-between px-4 py-2 hover:bg-gray-50 transition-colors duration-200 border-b border-gray-100 last:border-b-0 text-xs cursor-pointer ${isEditing ? 'bg-blue-50' : ''}`}
                            onDoubleClick={(e) => {
                                e.preventDefault();
                                handleViewDetails(p.getFullId());
                            }}
                            onContextMenu={(e) => handleContextMenu(e, p)}
                        >
                            <div className="flex items-center space-x-3 flex-wrap overflow-hidden justify-center sm:justify-start">
                                {/* ID */}
                                <span className="font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded text-xs mr-4 whitespace-nowrap w-16 text-center">
                                    {p.getFullId()}
                                </span>

                                {/* Total Volume */}
                                <span className="text-green-600 font-medium w-16 text-center">
                                    {p.total_volume ? `${p.total_volume} mL` : '—'}
                                </span>

                                {/* Action buttons when editing */}
                                {isEditing && (
                                    <div className="flex items-center ml-auto -mr-0.5">
                                        <button onClick={handleSaveEdit} className="text-green-600 hover:bg-green-200 p-1 rounded">
                                            <Save size={14} />
                                        </button>
                                        <button onClick={() => handleDeleteClick(p)} className="text-red-600 hover:bg-red-200 p-1 rounded">
                                            <Trash2 size={14} />
                                        </button>
                                        <button onClick={handleCancelEdit} className="text-gray-600 hover:bg-gray-300 p-1 rounded">
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}

                                {/* Notes */}

                                {(isEditing ? (
                                    <>
                                        <input
                                            className="w-full h-6 px-2 py-1 mt-2 bg-white text-xs shadow-sm focus:outline-blue-400 placeholder-gray-400 rounded border border-transparent"
                                            value={tempEditingRecord ? tempEditingRecord.notes : ''}
                                            onChange={(e) => handleFieldChange('notes', e.target.value)}
                                            placeholder="Notes"
                                        />
                                        <div className="w-full px-4 py-2">
                                            <SamplesView
                                                samples={tempEditingRecord.volumes || []}
                                                isEditing={true}
                                                onSamplesChange={(newVolumes) => {
                                                    handleFieldChange('volumes', newVolumes);
                                                }}/>
                                        </div>
                                    </>
                                ) : ( isExpanded ? (
                                        <div className="w-full px-4 py-2">
                                            <span className="text-gray-600 text-xs mb-2 block">Notes: {p.notes || " —"}</span>
                                            <SamplesView samples={p.volumes || []}/>
                                        </div>
                                        ) : (
                                        <span className="text-gray-600 text-xs truncate flex-shrink min-w-0 max-w-28 whitespace-nowrap">
                                            {p.notes || '—'}
                                        </span>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/*Expand/Collapse Button*/}
            <div
                className="px-4 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer transition-colors text-center"
                onClick={toggleBag}
            >
                {isCollapsed? "Show More" : "Hide"}
            </div>
        </div>

        {/* Context Menu - rendered outside the card */}
        {contextMenu && (
            <div
                className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50"
                style={{ left: contextMenu.x, top: contextMenu.y }}
                onClick={(e) => e.stopPropagation()}
                onMouseLeave={() => {
                    setContextMenu(null);
                    setContextMenuRecord(null);
                }}
            >
                <div
                    onClick={() => {
                        handleEditRecord(contextMenuRecord);
                        setContextMenu(null);
                    }}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2 text-sm"
                >
                    Edit
                </div>
                <div
                    onClick={() => {
                        handleDeleteClick(contextMenuRecord);
                        setContextMenu(null);
                    }}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-red-600 flex items-center gap-2 text-sm"
                >
                    Delete
                </div>
            </div>
        )}



        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
            isOpen={showDeleteConfirm}
            onConfirm={confirmDelete}
            onCancel={() => setShowDeleteConfirm(false)}
            title="Delete Plasmid Record"
            message={`Are you sure you want to delete plasmid ${recordToDelete?.getFullId()}? This action cannot be undone.`}
            confirmText="Delete"
            cancelText="Cancel"
            type="danger"
            current = {renderPlasmidRecord(editingRecord, "Original", "bg-red-200", "text-red-700", "not-stacked", false)}
        />

        {/* Save Confirmation Dialog */}

        <ConfirmDialog
            isOpen={showSaveConfirm}
            onConfirm={confirmSave}
            onCancel={() => setShowSaveConfirm(false)}
            title="Save Changes"
            message={`Are you sure you want to save the changes to plasmid ${editingRecord?.getFullId()}?`}
            confirmText="Save Changes"
            cancelText="Cancel"
            type="success"
            prev={renderPlasmidRecord(editingRecord, "Original", "bg-gray-200", "text-gray-700", "stacked", true, tempEditingRecord)}
            current={renderPlasmidRecord(tempEditingRecord, "Updated", "bg-green-200", "text-green-700", "stacked", true, editingRecord)}

        />
    </>

  );
};

export default BagCard;