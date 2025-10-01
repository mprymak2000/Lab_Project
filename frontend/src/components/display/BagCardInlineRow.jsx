import { Save, X, Trash2 } from 'lucide-react';
import ExpandPlasmidRow from "./ExpandPlasmidRow.jsx";

const BagCardInlineRow = ({
    plasmid,
    isEditing,
    isExpanded,
    tempEditingRecord,
    onViewDetails,
    onContextMenu,
    onSaveEdit,
    onDeleteClick,
    onCancelEdit,
    onFieldChange
}) => {
    return (
        <div
            className={`flex items-center justify-between px-4 py-2 hover:bg-gray-50 transition-colors duration-200 border-b border-gray-100 last:border-b-0 text-xs cursor-pointer ${isEditing ? 'bg-blue-50' : ''}`}
            onDoubleClick={(e) => {
                e.preventDefault();
                onViewDetails(plasmid.getFullId());
            }}
            onContextMenu={(e) => onContextMenu(e, plasmid)}
        >
            <div className="flex items-center space-x-3 flex-wrap overflow-hidden justify-center sm:justify-start">
                {/* ID */}
                <span className="font-mono font-semibold text-blue-700 bg-indigo-100 px-2 py-1 rounded text-xs mr-4 overflow-hidden w-16 text-center">
                    {plasmid.getFullId()}
                </span>

                {/* Total Volume */}
                <span className="text-green-600 font-medium w-16 text-center">
                    {plasmid.total_volume > 0 ? `${plasmid.total_volume} mL` : '—'}
                </span>

                {/* Action buttons when editing */}
                {isEditing && (
                    <div className="flex items-center ml-auto -mr-0.5">
                        <button 
                            onClick={onSaveEdit} 
                            disabled={!tempEditingRecord?.isValid()}
                            className={`p-1 rounded ${
                                tempEditingRecord?.isValid() 
                                    ? 'text-green-600 hover:bg-green-200' 
                                    : 'text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            <Save size={14} />
                        </button>
                        <button onClick={() => onDeleteClick(plasmid)} className="text-red-600 hover:bg-red-200 p-1 rounded">
                            <Trash2 size={14} />
                        </button>
                        <button onClick={onCancelEdit} className="text-gray-600 hover:bg-gray-300 p-1 rounded">
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
                            onChange={(e) => onFieldChange('notes', e.target.value)}
                            placeholder="Notes"
                        />
                        <div className="w-full px-4 py-2">
                            <ExpandPlasmidRow
                                samples={tempEditingRecord.samples || []}
                                isEditing={true}
                                onSamplesChange={(newSamples) => {
                                    onFieldChange('samples', newSamples);
                                }}/>
                        </div>
                    </>
                ) : ( isExpanded ? (
                        <div className="w-full px-4 py-2">
                            <span className="text-gray-600 text-xs mb-2 px-2 block">Notes: {plasmid.notes || "—"}</span>
                            <ExpandPlasmidRow samples={plasmid.samples || []}/>
                        </div>
                        ) : (
                        <span className="text-gray-600 text-xs truncate flex-shrink min-w-0 max-w-30 whitespace-nowrap">
                            {plasmid.notes || '—'}
                        </span>
                    ))
                )}
            </div>
        </div>
    );
};

export default BagCardInlineRow;