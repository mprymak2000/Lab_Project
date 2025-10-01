import {useEffect, useState} from "react";
import {PlasmidRecord} from "../../utils/PlasmidRecord.js";
import ConfirmDialog, { PlasmidRecordPreview } from '../common/ConfirmDialog.jsx';
import AddBagCardRow from "./AddBagCardRow.jsx";
import BagCardInlineRow from "./BagCardInlineRow.jsx";
import ContextMenu from '../common/ContextMenu.jsx';

const BagCard = ({bagName, recordsPassed, onBagDataChanged}) => {

    const [isCollapsed, setIsCollapsed] = useState(true); // Track collapsed state of bags
    const [sortBy, setSortBy] = useState('id')
    const [expandedRecord, setExpandedRecord] = useState(null);
    const [originalRecord, setOriginalRecord] = useState(null);
    const [tempEditingRecord, setTempEditingRecord] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);
    const [contextMenuRecord, setContextMenuRecord] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState(null);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [showAddRow, setShowAddRow] = useState(false);
    const [saveStatus, setSaveStatus] = useState({ type: null, message: '' }); // 'success', 'error', or null
    const [deleteStatus, setDeleteStatus] = useState({ type: null, message: '' });

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

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
                if (originalRecord) {
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
    }, [originalRecord, expandedRecord])

    const handleAddedRecord = (newRecord) => {
        const updatedPlasmids = [...recordsPassed, newRecord];
        onBagDataChanged(updatedPlasmids);
    }

    const handleDeleteClick = (targetRecord) => {
        setRecordToDelete(targetRecord);
        setShowDeleteConfirm(true);
    }

    const confirmDelete = async () => {
        setDeleteStatus({ type: null, message: '' });
        try {
            const payload = recordToDelete.toAPIPayload();
            console.log("Sending to API:", payload);

            const response = await fetch(`${API_BASE_URL}/api/delete`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || "Failed to delete plasmid record");
            }

            console.log("API Response:", result);

            // Update local state only after successful database delete
            const updatedPlasmids = recordsPassed.filter(p => p.getFullId() !== recordToDelete.getFullId());
            onBagDataChanged(updatedPlasmids);

            // Show success message
            setDeleteStatus({
                type: 'success',
                message: `Successfully deleted ${recordToDelete.getFullId()} from ${bagName}.`
            });

            // Clear editing state if delete was called in edit mode
            if (originalRecord) setOriginalRecord(null);
            if (tempEditingRecord) setTempEditingRecord(null);

        } catch (error) {
            console.error('Failed to delete plasmid:', error);
            setDeleteStatus({
                type: 'error',
                message: error.message || 'Failed to delete.'
            });

        } //showDeleteConfirm, DeleteStatus and recordToDelete state is cleared
          // after user clicks ok in confirmation dialog
    }

    const handleViewDetails = (targetRecordId) => {
        if (originalRecord?.getFullId() === targetRecordId) {
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


    const handleEditRecord = (targetRecord) => {
        setOriginalRecord(targetRecord);
        setTempEditingRecord(new PlasmidRecord({...targetRecord}));
        setExpandedRecord(targetRecord.getFullId());
    }
    const handleFieldChange = (field, value) => {
        setTempEditingRecord(prev => new PlasmidRecord({...prev, [field]: value}));
    }


    const handleCancelEdit = () => {
        setOriginalRecord(null);
        setTempEditingRecord(null);
    }

    const handleSaveEdit = () => {
        // Validate the entire record before saving
        const errors = tempEditingRecord.getValidationErrors();
        if (errors.length > 0) {
            // Record is invalid, don't proceed with save
            console.log('Record is invalid, cannot save. Validation errors:', errors);
            return;
        }
        
        if (originalRecord?.equals(tempEditingRecord)) {
            // No changes detected, just exit editing mode
            setOriginalRecord(null);
            setTempEditingRecord(null);
            return;
        }
        setShowSaveConfirm(true);
    }

    const confirmEditSave = async () => {
        setSaveStatus({ type: null, message: '' });

        try {
            // Call API to modify the record in database
            const payload = tempEditingRecord.toAPIPayload();
            console.log("Sending to API:", payload);
            
            const response = await fetch(`${API_BASE_URL}/api/modify`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Failed to delete plasmid record');
            }

            console.log("API Response:", result);

            // Update local state only after successful database save
            const updatedPlasmids = recordsPassed.map(p => {
                if (p.getFullId() === originalRecord.getFullId()) {
                    return tempEditingRecord;
                }
                return p;
            });
            onBagDataChanged(updatedPlasmids);
            
            // Show success message
            setSaveStatus({
                type: 'success',
                message: `Successfully saved changes to ${originalRecord.getFullId()}!`
            });

            // Clear editing state (done editing, viewing mode)
            setOriginalRecord(null);
            setTempEditingRecord(null);
        }
        catch (error) {
            console.error('Failed to modify plasmid:', error);
            
            // Show error message
            setSaveStatus({
                type: 'error',
                message: error.message || 'Failed to save changes'
            });
        }
        //showSaveConfirm, SaveStatus  state is cleared
        // after user clicks ok in confirmation dialog
    }

    const sortedPlasmids = [...recordsPassed].sort((a, b) => {
        if (sortBy === 'id') return a.getFullId().localeCompare(b.getFullId(), undefined, {numeric: true});
        if (sortBy === 'volume') return parseFloat(b.total_volume) - parseFloat(a.total_volume);
        if (sortBy === 'date') return new Date(b.date_added) - new Date(a.date_added);
        return 0;
    });

    const toggleBag = () => {
        setIsCollapsed(prevState => !prevState);
    }


    return (
    <>
        <div key={bagName} className={`bg-white max-w-100 rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col transform-gpu w-full ${isCollapsed ? 'hover:scale-105' : ''}`}>

            {/* Bag Header */}
            <div className="bg-indigo-300 px-6 py-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <h3 className="text-[90px] font-bold text-white -ml-7.5 -mr-5 -mt-15 -mb-13 tracking-tighter">{bagName}</h3>
                    </div>

                    {/* Sort dropdown */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="mr-2 px-1 py-0.5 bg-indigo-100 text-gray-700 rounded-md transition-all duration-200 text-xs font-medium border border-gray-200 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 w-24"
                    >
                        <option value="id">Sort by ID</option>
                        <option value="volume">Sort by Volume</option>
                        <option value="date">Sort by Date</option>
                    </select>

                    {/*Number of plasmids in bag*/}
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-sm whitespace-nowrap font-small border border-indigo-200">
                        {recordsPassed.length} plasmids
                    </span>
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
                        isEditing={originalRecord?.getFullId() === p.getFullId()}
                        isExpanded={expandedRecord === p.getFullId()}
                        tempEditingRecord={tempEditingRecord}
                        onViewDetails={handleViewDetails}
                        onContextMenu={handleContextMenu}
                        onSaveEdit={handleSaveEdit}
                        onDeleteClick={handleDeleteClick}
                        onCancelEdit={handleCancelEdit}
                        onFieldChange={handleFieldChange}
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
                    onClick: () => handleEditRecord(contextMenuRecord)
                },
                {
                    label: 'Delete',
                    onClick: () => handleDeleteClick(contextMenuRecord),
                    className: 'text-red-600'
                },
                {
                    label: 'Add Record',
                    onClick: () => setShowAddRow(true)
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
            onConfirm={deleteStatus.type ? () => {
                setShowDeleteConfirm(false);
                setDeleteStatus({ type: null, message: '' });
                setRecordToDelete(null);
            } : confirmDelete}
            onCancel={() => setShowDeleteConfirm(false)}
            title={deleteStatus.type ? 
                (deleteStatus.type === 'success' ? 'Delete Successful' : 'Delete Failed') : 
                `Delete Plasmid Record in ${bagName}`
            }
            message={deleteStatus.type ? 
                deleteStatus.message : 
                `Are you sure you want to delete plasmid ${recordToDelete?.getFullId()}? This action cannot be undone.`
            }
            confirmText={deleteStatus.type ? "OK" : "Delete"}
            cancelText={deleteStatus.type ? "" : "Cancel"}
            type={deleteStatus.type ? deleteStatus.type : "danger"}
            current={deleteStatus.type ? "" : <PlasmidRecordPreview record={recordToDelete} label="Original" bgColor="bg-red-200" textColor="text-red-700" layout="not-stacked" showLabel={false} />}
        />

        {/* Save Confirmation Dialog */}
        <ConfirmDialog
            isOpen={showSaveConfirm}
            onConfirm={saveStatus.type ? () => {
                setShowSaveConfirm(false)
                setSaveStatus({ type: null, message: '' });
            } : confirmEditSave}
            onCancel={() => setShowSaveConfirm(false)}
            title={saveStatus.type ? 
                (saveStatus.type === 'success' ? 'Save Successful' : 'Save Failed') : 
                `Save Changes in ${bagName}`
            }
            message={saveStatus.type ? 
                saveStatus.message : 
                `Are you sure you want to save the changes to plasmid ${originalRecord?.getFullId()}?`
            }
            confirmText={saveStatus.type ? "OK" : "Save Changes"}
            cancelText={saveStatus.type ? "" : "Cancel"}
            type={saveStatus.type ? saveStatus.type : "success"}
            prev={saveStatus.type ? "" : <PlasmidRecordPreview record={originalRecord} label="Original" bgColor="bg-gray-200" textColor="text-gray-700" layout="stacked" showLabel={true} otherRecord={tempEditingRecord} />}
            current={saveStatus.type ? "" : <PlasmidRecordPreview record={tempEditingRecord} label="Updated" bgColor="bg-green-200" textColor="text-green-700" layout="stacked" showLabel={true} otherRecord={originalRecord} />}
        />
    </>

  );
};

export default BagCard;