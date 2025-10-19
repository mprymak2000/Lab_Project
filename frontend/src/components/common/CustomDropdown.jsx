import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const CustomDropdown = ({ value, onChange, onBlur, options, placeholder = "Select", className = "", hasError = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                if (onBlur) onBlur();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onBlur]);

    const handleSelect = (optionValue) => {
        onChange({ target: { value: optionValue } });
        setIsOpen(false);
        if (onBlur) onBlur();
    };

    const displayValue = options.find(opt => opt.value === value)?.label || placeholder;

    return (
        <div ref={dropdownRef} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`${className} flex items-center justify-between ${hasError ? 'bg-rose-50 border-rose-400 focus:ring-rose-200' : 'bg-white border-gray-200 hover:border-indigo-300 focus:ring-indigo-200'}`}
            >
                <span className="truncate">{displayValue}</span>
                <ChevronDown size={14} className={`ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-[140px] overflow-y-auto">
                    {options.filter(opt => opt.value !== '' && opt.label !== placeholder).map((option) => (
                        <div
                            key={option.value}
                            onClick={() => handleSelect(option.value)}
                            className={`px-2 py-1.5 text-sm cursor-pointer hover:bg-indigo-100 ${value === option.value ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'}`}
                        >
                            {option.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomDropdown;