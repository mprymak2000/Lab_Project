import { Save, X, Trash2, UserX } from 'lucide-react';
import ExpandPlasmidRow from "./BagCardInlineRow/ExpandPlasmidRow.jsx";

const BagCardInlineRow = ({
    plasmid,
    isExpanded,
    isMovingBag,
    isUpdating,
    updatedRecord,
    movedRecord,
    onViewDetails,
    onContextMenu,
    onSaveEdit,
    onDeleteClick,
    onCancelEdit,
    onFieldChange,
    onDragEnd,
    bagName,
    availableBags = [],
    onCheckIO
}) => {

    // Check if any samples are checked out
    const hasCheckedOut = plasmid.samples.some(s => s.is_checked_out);

    //operation type is either 'edit' or 'move'
    const renderSaveButton = (isValid, opType) => (
        <button
            onClick={() => onSaveEdit(opType)}
            disabled={!isValid}
            className={`p-1 rounded ${
                isValid
                    ? 'text-green-600 hover:bg-green-200'
                    : 'text-gray-400 cursor-not-allowed'
            }`}
        >
            <Save size={18} />
        </button>
    );

    //operation type is either 'edit' or 'move'
    const renderCancelButton = (opType) => (
        <button
            onClick={() => onCancelEdit(opType)}
            className="text-gray-600 hover:bg-gray-300 p-1 rounded"
        >
            <X size={18} />
        </button>
    );

    const handleDragStart = (e) => {
        // Don't allow dragging while editing
        if (isUpdating || isMovingBag) {
            e.preventDefault();
            return;
        }

        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/json', JSON.stringify({
            plasmid: plasmid.toAPIPayload(),
            sourceBag: bagName
        }));
    };

    return (
        <div
            className={`transition-colors duration-200 border-b border-gray-100 last:border-b-0 text-xs`}
            draggable={!isUpdating}
            onDragStart={handleDragStart}
            onDragEnd={onDragEnd}
            onDoubleClick={(e) => {
                e.preventDefault();
                onViewDetails(plasmid.getFullId());
            }}
            onContextMenu={(e) => onContextMenu(e, plasmid)}
        >
            {/* Main line with ID and volume */}
            <div className={`flex items-center justify-between px-4 py-2 ${!isUpdating ? 'cursor-move' : 'cursor-pointer'} ${(isExpanded || isMovingBag) ? 'shadow-md' : ''} ${!isUpdating ? 'hover:bg-indigo-50' : ''}`}>
                <div className="flex items-center space-x-3 justify-center sm:justify-start">
                    {/* ID */}
                    <span className="font-mono font-semibold text-blue-700 bg-indigo-100 px-2 py-1 rounded text-xs mr-4 overflow-hidden w-16 text-center">
                        {plasmid.getFullId()}
                    </span>

                    {/* Total Volume */}
                    <div className="flex items-center gap-1 w-16 justify-center">
                        <span className="text-green-600 font-medium">
                            {plasmid.total_volume > 0 ? `${plasmid.total_volume} mL` : '—'}
                        </span>
                    </div>

                    {/* Collapsed notes */}
                    {!isUpdating && !isExpanded && (
                        <span className="text-gray-600 text-xs truncate flex-shrink min-w-0 max-w-30 whitespace-nowrap">
                            {plasmid.notes || '—'}
                        </span>
                    )}
                </div>

                {/* Right side - checkout indicator when not updating/expanded */}
                {!isUpdating && !isExpanded && hasCheckedOut && (
                    <UserX size={14} className="text-red-500 flex-shrink-0" title="Sample(s) checked out" />
                )}

                {/* Action buttons when editing */}
                {isUpdating && (
                    <div className="flex items-center space-x-1">
                        {renderSaveButton(updatedRecord?.isValid(),'edit')}
                        <button onClick={() => onDeleteClick(plasmid)} className="text-red-600 hover:bg-red-200 p-1 rounded">
                            <Trash2 size={18} />
                        </button>
                        {renderCancelButton('edit')}
                    </div>
                )}

                {/* Hide button when expanded (not editing) */}
                {!isUpdating && isExpanded && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onViewDetails(null);
                        }}
                        className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 p-1 rounded transition-colors"
                        title="Hide details"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Expanded content below */}
            {isUpdating ? (
                <div className="w-full px-4 py-2 bg-indigo-50/30 mt-1">
                    <ExpandPlasmidRow
                        samples={updatedRecord.samples}
                        isUpdating={true}
                        onSamplesChange={(newSamples) => onFieldChange('samples', newSamples)}
                        notes={updatedRecord.notes}
                        onNotesChange={(value) => onFieldChange('notes', value)}
                        dateAdded={plasmid.date_added}
                    />
                </div>
            ) : isExpanded && (
                <div className="w-full px-4 py-2 bg-indigo-50/30 mt-1">
                    <ExpandPlasmidRow
                        samples={plasmid.samples}
                        notes={plasmid.notes}
                        dateAdded={plasmid.date_added}
                        isMovingBag={isMovingBag}
                        movedRecord={movedRecord}
                        availableBags={availableBags}
                        record={plasmid}
                        onCheckIO={(newSamples) => onCheckIO(plasmid, newSamples)}
                        onFieldChange={(field, value) => {
                            if (field === 'save') onSaveEdit();
                            else if (field === 'cancel') onCancelEdit();
                            else onFieldChange(field, value);
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export default BagCardInlineRow;