import React from 'react'

const LoadingSpinner = ({ message = "Loading..." }) => {
    return (
        <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-indigo-600 font-medium">{message}</p>
            </div>
        </div>
    )
}

export default LoadingSpinner