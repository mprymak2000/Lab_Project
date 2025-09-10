import React from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const ConfirmDialog = ({ 
    isOpen, 
    onConfirm, 
    onCancel, 
    title, 
    message, 
    confirmText = "Confirm",
    cancelText = "Cancel",
    type = "warning", // warning, danger, success
    prev,
    current
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'danger':
                return <XCircle className="w-6 h-6 text-red-500" />;
            case 'success':
                return <CheckCircle className="w-6 h-6 text-green-500" />;
            case 'warning':
            default:
                return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
        }
    };

    const getButtonStyles = () => {
        switch (type) {
            case 'danger':
                return "bg-red-600 hover:bg-red-700 focus:ring-red-500";
            case 'success':
                return "bg-green-600 hover:bg-green-700 focus:ring-green-500";
            case 'warning':
            default:
                return "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500";
        }
    };

    return (
        <>
            {/* Dialog */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                <div 
                    className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100 opacity-100"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header with Icon */}
                    <div className="flex items-center gap-4 p-6 pb-4">
                        {getIcon()}
                        <h3 className="text-xl font-bold text-gray-900">
                            {title}
                        </h3>
                    </div>

                    {/* Message */}
                    <div className="px-6 pb-6">
                        <p className="text-gray-600 text-sm leading-relaxed">
                            {message}
                        </p>
                    </div>

                    {/* Previous and Current Values */}
                    {(prev || current) && (
                        <div className="p-3 px-6 pb-4 bg-gray-50 rounded-lg mx-6">
                            <div className="flex items-center justify-center gap-4">
                                {prev}
                                {prev && current && <div className="text-gray-400 text-3xl mt-3">→</div>}
                                {current}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 p-6 pt-6 justify-end">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`px-4 py-2 text-white rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${getButtonStyles()}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ConfirmDialog;