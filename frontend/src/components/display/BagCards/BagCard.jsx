import {useEffect, useState} from "react";
import {PlasmidRecord} from "../../../utils/PlasmidRecord.js";
import ConfirmDialog, { PlasmidRecordPreview } from '../../common/ConfirmDialog.jsx';
import AddBagCardRow from "./BagCard/AddBagCardRow.jsx";
import BagCardInlineRow from "./BagCard/BagCardInlineRow.jsx";
import ContextMenu from '../../common/ContextMenu.jsx';
import { sortPlasmids } from '../../../utils/sortingUtils.js';
import { deletePlasmid, editPlasmid } from '../../../utils/api.js';

const BagCard = ({bagName, recordsPassed, availableBags = [], onBagRecordsChanged, onBagRecordMoved}) => {

    const [isCollapsed, setIsCollapsed] = useState(true); // Track collapsed state of bags
    const [sortBy, setSortBy] = useState('id')
    const [expandedRecord, setExpandedRecord] = useState(null);
    // editOperation: null | { type: 'update', original, modified } | { type: 'move', original, modified }
    const [editOperation, setEditOperation] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);
    const [contextMenuRecord, setContextMenuRecord] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState(null);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [showAddRow, setShowAddRow] = useState(false);
    // saveStatus: null | { type: 'success', message } | { type: 'error', message }
    const [saveStatus, setSaveStatus] = useState(null);
    // deleteStatus: null | { type: 'success', message } | { type: 'error', message }
    const [deleteStatus, setDeleteStatus] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);

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
                if (editOperation) {
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
    }, [editOperation, expandedRecord])


    //////////////////////////   ADD  ////////////////////////////////
    const handleAddedRecord = (newRecord) => {
        const updatedPlasmids = [...recordsPassed, newRecord];
        onBagRecordsChanged(updatedPlasmids);
    }

    ////////////////////////   DELETE   ////////////////////////////////
    const handleDeleteClick = (targetRecord) => {
        setRecordToDelete(targetRecord);
        setShowDeleteConfirm(true);
    }

    const confirmDelete = async () => {
        setDeleteStatus(null);
        try {
            await deletePlasmid(recordToDelete);

            // Update local state only after successful database delete
            const updatedPlasmids = recordsPassed.filter(p => p.getFullId() !== recordToDelete.getFullId());
            onBagRecordsChanged(updatedPlasmids);

            // Show success message
            setDeleteStatus({
                type: 'success',
                message: `Successfully deleted ${recordToDelete.getFullId()} from ${bagName}.`
            });

            // Clear editing state if delete was called in edit mode
            if (editOperation) setEditOperation(null);

        } catch (error) {
            console.error('Failed to delete record:', error);
            setDeleteStatus({
                type: 'error',
                message: error.message || 'Failed to delete.'
            });

        } //showDeleteConfirm, DeleteStatus and recordToDelete state is cleared...
          // ...after user clicks ok in confirmation dialog
    }

    ///////////////////////////////////////   EDIT   ///////////////////////////////////////
    /////// edit: update OR move bag are separate ops and mutually exclusive  ///////////////
    // editOperation stores both the original and modified record with operation type //
    // discriminated union ensures only one operation can be active at a time //

    const handleEditRecord = (targetRecord, mode = 'update') => {
        setExpandedRecord(targetRecord.getFullId());
        if (mode === 'update') {
            // Expand record to show all editable fields
            setEditOperation({
                type: 'update',
                original: targetRecord,
                modified: new PlasmidRecord({...targetRecord})
            });
        } else if (mode === 'move') {
            setEditOperation({
                type: 'move',
                original: targetRecord,
                modified: new PlasmidRecord({...targetRecord})
            });
        }
    }

    const handleFieldChange = (field, value) => {
        if (!editOperation) return;
        setEditOperation(prev => ({
            ...prev,
            modified: new PlasmidRecord({...prev.modified, [field]: value})
        }));
    }

    const handleCancelEdit = () => {
        setEditOperation(null);
    }

    const handleEditSave = () => {
        if (!editOperation) return;

        // Validate the entire record before saving
        const errors = editOperation.modified.getValidationErrors();
        if (errors.length > 0) {
            console.log('Record is invalid, cannot save. Validation errors:', errors);
            return;
        }

        // Check if no changes were made
        if (editOperation.original.equals(editOperation.modified)) {
            handleCancelEdit();
            return;
        }

        setShowSaveConfirm(true);
    }

    // Called when user confirms save in confirmation dialog
    const confirmEditSave = async () => {
        if (!editOperation) return;

        setSaveStatus(null);

        try {
            await editPlasmid(editOperation.modified, editOperation.original);

            // Update local state only after successful database save
            let updatedPlasmids;
            if (editOperation.type === 'move') {
                // Remove the record from current bag since it's moved to a different bag
                updatedPlasmids = recordsPassed.filter(p => p.getFullId() !== editOperation.modified.getFullId());
                // Call the move callback to handle moving record between bags
                onBagRecordMoved(updatedPlasmids, editOperation.modified);
            } else {
                // Update the record in place for regular edits
                updatedPlasmids = recordsPassed.map(p => {
                    if (p.getFullId() === editOperation.modified.getFullId()) {
                        return editOperation.modified;
                    }
                    return p;
                });
                onBagRecordsChanged(updatedPlasmids);
            }

            // Show success message
            setSaveStatus({
                type: 'success',
                message: `Successfully saved changes to ${editOperation.modified.getFullId()}!`
            });

            // Clear editing state
            handleCancelEdit();
        }
        catch (error) {
            console.error('Failed to modify record:', error);
            setSaveStatus({
                type: 'error',
                message: error.message || 'Failed to save changes'
            });
        }
    }

    /////////////////////////   EXPAND     ////////////////////////////////
    /// first double click expands, second triggers edit mode /////////////
    const handleViewDetails = (targetRecordId) => {
        // If null is passed, collapse the expanded record
        if (targetRecordId === null) {
            setExpandedRecord(null);
            return;
        }

        if (editOperation?.type === 'update' && editOperation.modified.getFullId() === targetRecordId) {
            // Already editing, do nothing on double-click
            return;
        }

        if (expandedRecord === targetRecordId) {
            // Already expanded, second double-click starts editing
            const record = recordsPassed.find(p => p.getFullId() === targetRecordId);
            handleEditRecord(record, 'update');
        } else {
            // Not expanded, first double-click expands
            setExpandedRecord(targetRecordId);
        }
    }

    ///////////////////// CHECK OUT & CHECK IN //////////////////////////


    ///////////////////// OTHER //////////////////////////
    const sortedPlasmids = sortPlasmids(recordsPassed, sortBy);

    const toggleBag = () => {
        setIsCollapsed(prevState => !prevState);
    }

    ///////////////////// DRAG AND DROP //////////////////////////
    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    const handleDragEnter = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    }

    const handleDragLeave = (e) => {
        // Only set to false if we're leaving the bag card itself, not a child element
        if (e.currentTarget === e.target) {
            setIsDragOver(false);
        }
    }

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);

        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            const { plasmid, sourceBag } = data;

            // Don't do anything if dropping into the same bag
            if (sourceBag === bagName) {
                return;
            }

            // Create PlasmidRecord instance with updated bag
            const movedPlasmid = new PlasmidRecord({...plasmid, bag: bagName});

            // Create edit operation for move and show confirmation dialog
            setEditOperation({
                type: 'move',
                original: new PlasmidRecord(plasmid),
                modified: movedPlasmid
            });
            setShowSaveConfirm(true);

        } catch (error) {
            console.error('Failed to handle drop:', error);
        }
    }

    const handleDragEnd = () => {
        // Clear drag over state when drag ends (handles cases where dragLeave doesn't fire)
        setIsDragOver(false);
    }

    const handleCheckIO = (plasmid, newSamples) => {
        const updatedPlasmid = new PlasmidRecord({...plasmid, samples: newSamples});
        const updatedPlasmids = recordsPassed.map(rec => rec.getFullId() === plasmid.getFullId() ? updatedPlasmid : rec);
        onBagRecordsChanged(updatedPlasmids);
    }

    return (
    <>
        <div
            key={bagName}
            className={`bg-white max-w-100 rounded-xl shadow-lg border overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col transform-gpu min-w-80 ${isCollapsed ? 'hover:scale-105' : ''} ${isDragOver ? 'border-blue-500 border-4 bg-blue-50' : 'border-gray-100'}`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >

            {/* Bag Header */}
            <div className="bg-gradient-to-r from-indigo-400 via-indigo-400 via-70% to-blue-400 px-6 py-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <h3 className="text-[90px] font-bold text-white -ml-7.5 -mr-5 -mt-15 -mb-13 tracking-tighter">{bagName}</h3>
                    </div>

                    {/* Sort dropdown */}
                    <div className="flex flex-nowrap gap-2 mr-2 -ml-2">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="shadow-sm mr-2 px-1 py-0.5 -ml-1 bg-indigo-100 text-indigo-700 rounded-md transition-all duration-200 text-xs font-medium border border-gray-200 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 w-24"
                        >
                            <option value="id">Sort by ID</option>
                            <option value="volume">Sort by Volume</option>
                            <option value="date">Sort by Date</option>
                        </select>

                        {/*Number of plasmids in bag*/}
                        <span className="mr-1 -ml-1 shadow-sm font-medium bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-sm whitespace-nowrap font-small border border-indigo-200">
                        {recordsPassed.length} plasmids
                    </span>
                    </div>
                </div>
            </div>
            {/* END: Bag Header */}

            {/* Add Record Area */}
            <div className="px-4 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50">
                <AddBagCardRow
                    bagName={bagName}
                    onRecordAdded={handleAddedRecord}
                    forceOpen={showAddRow}
                    onClose={() => setShowAddRow(false)}
                />
            </div>

            {/*Main table with inline Plasmid rows*/}
            <div className={`flex-1 ${isCollapsed ? 'max-h-80 overflow-y-auto' : ''}`}>
                {sortedPlasmids.map((p) => (
                    <BagCardInlineRow
                        key={p.getFullId()}
                        plasmid={p}
                        isExpanded={expandedRecord === p.getFullId()}
                        isMovingBag={editOperation?.type === 'move' && editOperation.modified.getFullId() === p.getFullId()}
                        isUpdating={editOperation?.type === 'update' && editOperation.modified.getFullId() === p.getFullId()}
                        updatedRecord={editOperation?.type === 'update' ? editOperation.modified : null}
                        movedRecord={editOperation?.type === 'move' ? editOperation.modified : null}
                        onViewDetails={handleViewDetails}
                        onContextMenu={handleContextMenu}
                        onSaveEdit={handleEditSave}
                        onDeleteClick={handleDeleteClick}
                        onCancelEdit={handleCancelEdit}
                        onFieldChange={handleFieldChange}
                        onDragEnd={handleDragEnd}
                        bagName={bagName}
                        availableBags={availableBags}
                        onCheckIO={handleCheckIO}
                    />
                ))}
            </div>

            {/*BagCard footer: Expand/Collapse Button*/}
            <div
                className="px-4 py-1 bg-gradient-to-r from-slate-50 to-indigo-50 text-slate-700 hover:from-indigo-50 hover:to-purple-50 cursor-pointer transition-all duration-200 text-center border-t border-slate-100 font-medium"
                onClick={toggleBag}
            >
                {recordsPassed.length > 8 && (isCollapsed? "Show More" : "Hide")}
            </div>
        </div>

        {/*contextMenu is a state variable that's null or holds position*/}
        <ContextMenu
            isOpen={!!contextMenu}
            position={contextMenu || { x: 0, y: 0 }}
            items={[
                {
                    label: expandedRecord === contextMenuRecord?.getFullId() ? 'Hide samples' : 'View samples',
                    onClick: () => setExpandedRecord(prev => prev === contextMenuRecord.getFullId() ? null : contextMenuRecord.getFullId())
                },
                {
                    label: 'Edit',
                    onClick: () => handleEditRecord(contextMenuRecord, 'update')
                },
                {
                    label: 'Delete',
                    onClick: () => handleDeleteClick(contextMenuRecord),
                    className: 'text-red-600'
                },
                {
                    label: 'Add Record',
                    onClick: () => setShowAddRow(true)
                },
                {
                    label: 'Move Bag',
                    onClick: () => handleEditRecord(contextMenuRecord, 'move')
                }
            ]}
            onClose={() => {
                setContextMenu(null);
                setContextMenuRecord(null);
            }}
        />



        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
            isOpen={showDeleteConfirm}
            //delete not confirmed/started? run the delete function. it ran (theres status)? user clicks ok to clear state.
            onConfirm={deleteStatus ? () => {
                setShowDeleteConfirm(false);
                setDeleteStatus(null);
                setRecordToDelete(null);
            } : confirmDelete}
            onCancel={() => setShowDeleteConfirm(false)}
            title={deleteStatus ?
                (deleteStatus.type === 'success' ? 'Delete Successful' : 'Delete Failed') :
                `Delete Plasmid Record in ${bagName}`
            }
            message={deleteStatus ?
                deleteStatus.message :
                `Are you sure you want to delete plasmid ${recordToDelete?.getFullId()}? This action cannot be undone.`
            }
            confirmText={deleteStatus ? "OK" : "Delete"}
            cancelText={deleteStatus ? "" : "Cancel"}
            type={deleteStatus ? deleteStatus.type : "danger"}
            current={deleteStatus ? "" : <PlasmidRecordPreview record={recordToDelete} label="Original" bgColor="bg-red-200" textColor="text-red-700" layout="not-stacked" showLabel={false} />}
        />

        {/* Save Confirmation Dialog */}
        <ConfirmDialog
            isOpen={showSaveConfirm}
            onConfirm={saveStatus ? () => {
                setShowSaveConfirm(false)
                setSaveStatus(null);
            } : confirmEditSave}
            onCancel={() => setShowSaveConfirm(false)} //doesnt exit update or move mode
            title={saveStatus ?
                (saveStatus.type === 'success' ? 'Save Successful' : 'Save Failed') :
                editOperation?.type === 'move' ? `Move Plasmid to Different Bag` : `Save Changes in ${bagName}`
            }
            message={saveStatus ?
                saveStatus.message :
                editOperation?.type === 'move'
                    ? `Move ${editOperation?.original.getFullId()} from ${editOperation?.original.bag} to ${editOperation?.modified.bag}?`
                    : `Are you sure you want to save the changes to plasmid ${editOperation?.original.getFullId()}?`
            }
            confirmText={saveStatus ? "OK" : editOperation?.type === 'move' ? "Move" : "Save Changes"}
            cancelText={saveStatus ? "" : "Cancel"}
            type={saveStatus ? saveStatus.type : "success"}
            prev={saveStatus || editOperation?.type === 'move' ? "" : <PlasmidRecordPreview record={editOperation?.original} label="Original" bgColor="bg-gray-200" textColor="text-gray-700" layout="stacked" showLabel={true} otherRecord={editOperation?.modified} />}
            current={saveStatus ? "" : editOperation?.type === 'move' ? (
                <div className="flex items-center justify-center gap-6 py-3">
                    <div className="flex flex-col items-center gap-2">
                        <div className="font-mono font-semibold text-blue-700 bg-blue-100 text-sm px-3 py-1 rounded">
                            {editOperation?.original.getFullId()}
                        </div>
                        <div className="font-mono font-semibold text-sm px-3 py-1 bg-red-100 text-red-700 rounded">
                            {editOperation?.original.bag}
                        </div>
                    </div>
                    <div className="text-2xl text-gray-400">→</div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="font-mono font-semibold text-blue-700 bg-blue-100 text-sm px-3 py-1 rounded">
                            {editOperation?.modified.getFullId()}
                        </div>
                        <div className="font-mono font-semibold text-sm px-3 py-1 bg-green-100 text-green-700 rounded">
                            {editOperation?.modified.bag}
                        </div>
                    </div>
                </div>
            ) : <PlasmidRecordPreview record={editOperation?.modified} label="Updated" bgColor="bg-green-200" textColor="text-green-700" layout="stacked" showLabel={true} otherRecord={editOperation?.original} />}
        />
    </>

  );
};

export default BagCard;