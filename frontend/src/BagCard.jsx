import {useEffect, useState} from "react";
import {PlasmidRecord} from "./utils/PlasmidRecord.js";
import { Save, X, Trash2 } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog.jsx';

const BagCard = ({bagName, recordsPassed, onBagDataChanged}) => {

    const [isCollapsed, setIsCollapsed] = useState(true); // Track collapsed state of bags
    const [sortBy, setSortBy] = useState('id')
    const [editingRecord, setEditingRecord] = useState(null);
    const [tempEditingRecord, setTempEditingRecord] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);
    const [contextMenuRecord, setContextMenuRecord] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState(null);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);

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

    const handleAddPlasmid = () => {
        const updatedPlasmids = [...recordsPassed, new PlasmidRecord({lot: '',sublot: '', vol1: ''})];
        onBagDataChanged(updatedPlasmids);
    }

    const handleEditRecord = (targetRecord) => {
        setEditingRecord(targetRecord);
        setTempEditingRecord(new PlasmidRecord({...targetRecord}));
    }
    const handleFieldChange = (field, value) => {
        setTempEditingRecord(prev => new PlasmidRecord({...prev, [field]: value}));
    }


    const handleCancelEdit = () => {
        setEditingRecord(null);
        setTempEditingRecord(null);
    }

    const handleSaveEdit = () => {
        if (editingRecord?.getFullId() === tempEditingRecord?.getFullId() &&
            editingRecord?.vol1 === tempEditingRecord?.vol1 &&
            editingRecord?.vol2 === tempEditingRecord?.vol2 &&
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
        if (sortBy === 'vol1') return parseFloat(b.vol1) - parseFloat(a.vol1);
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
                        {record?.vol1 || '—'}
                    </div>
                    <div className={`font-mono font-semibold px-2 py-1 rounded text-xs whitespace-nowrap w-16 text-center ${bgColor} ${textColor}`}>
                        {record?.vol2 || '—'}
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
        <div key={bagName} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl hover:scale-105 transition-all duration-300 flex flex-col transform-gpu">

            {/* Bag Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
                <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <h3 className="text-xl font-bold text-gray-800 ml-3">{bagName}</h3>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium ml-auto">
                        {recordsPassed.length} plasmids
                    </span>
                </div>
            </div>

            <div className={`flex-1 pt-2 pb-2 ${isCollapsed ? 'max-h-80 overflow-y-auto' : ''}`}>
                {sortedPlasmids.map ((p) => {
                    const isEditing = editingRecord?.getFullId() === p.getFullId();
                    
                    return (
                        <div
                            key={p.getFullId()}
                            className={`flex items-center justify-between px-4 py-2 hover:bg-gray-50 transition-colors duration-200 border-b border-gray-100 last:border-b-0 text-xs cursor-pointer ${isEditing ? 'bg-blue-50' : ''}`}
                            onDoubleClick={() => handleEditRecord(p)}
                            onContextMenu={(e) => handleContextMenu(e, p)}
                        >
                            <div className="flex items-center space-x-3 flex-wrap">
                                {/* ID */}
                                <span className="font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded text-xs mr-4 whitespace-nowrap w-16 text-center">
                                    {p.getFullId()}
                                </span>


                                {/* Volume 1 */}
                                {isEditing ? (
                                    <input
                                        className="w-10 h-6 px-2 py-1 font-medium bg-white text-xs shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder-gray-400 rounded border border-transparent"
                                        value={tempEditingRecord ? tempEditingRecord.vol1 : ''}
                                        onChange={(e) => handleFieldChange('vol1', e.target.value)}
                                    />
                                ) : (
                                    <span className="text-green-600 font-medium w-10">{p.vol1}</span>
                                )}

                                {/* Volume 2 */}
                                {isEditing ? (
                                    <input
                                        className="w-10 h-6 px-2 py-1 font-medium bg-white text-xs shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder-gray-400 rounded border border-transparent"
                                        value={tempEditingRecord ? tempEditingRecord.vol2 : ''}
                                        onChange={(e) => handleFieldChange('vol2', e.target.value)}
                                    />
                                ) : (
                                    <span className="text-green-600 font-medium w-10">{p.vol2 || '—'}</span>
                                )}

                                {/* Action buttons when editing */}
                                {isEditing && (
                                    <div className="flex items-center ml-auto -mr-0.5">
                                        <button onClick={handleSaveEdit} className="text-green-600 hover:bg-green-200 p-1 rounded">
                                            <Save size={14} />
                                        </button>
                                        <button onClick={handleCancelEdit} className="text-gray-600 hover:bg-gray-300 p-1 rounded">
                                            <X size={14} />
                                        </button>
                                        <button onClick={() => handleDeleteClick(p)} className="text-red-600 hover:bg-red-200 p-1 rounded">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}

                                {/* Notes */}
                                {isEditing ? (
                                    <input
                                        className="w-full h-6 px-2 py-1 mt-2 bg-white text-xs shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder-gray-400 rounded border border-transparent"
                                        value={tempEditingRecord ? tempEditingRecord.notes : ''}
                                        onChange={(e) => handleFieldChange('notes', e.target.value)}
                                        placeholder="Notes"
                                    />
                                ) : (
                                    <span className="text-gray-600 text-xs truncate max-w-32 hidden sm:block">
                                        {p.notes || '—'}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/*Expand/Collapse Button*/}
            <div
                className="px-4 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer transition-colors"
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