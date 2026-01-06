
import React from 'react';

// Helper component for input with stylish spinners
export const InputWithSpinners: React.FC<{
    value: string;
    placeholder?: string;
    onChange: (val: string) => void;
    min?: number;
    className?: string;
    title?: string;
}> = ({ value, placeholder, onChange, min, className, title }) => {
    const handleStep = (step: number) => {
        const currentVal = parseInt(value, 10);
        let nextVal = isNaN(currentVal) ? (min || 1) : currentVal + step;
        if (min !== undefined && nextVal < min) nextVal = min;
        onChange(nextVal.toString());
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === '') {
            onChange('');
            return;
        }
        const num = parseInt(val, 10);
        if (!isNaN(num) && min !== undefined && num < min) {
             return; 
        }
        onChange(val);
    };

    return (
        <div className={`relative flex items-center bg-gray-800 rounded border border-gray-600 h-7 ${className}`} title={title}>
             <input
                type="number"
                min={min}
                value={value}
                placeholder={placeholder}
                onChange={handleChange}
                className="appearance-none w-full h-full bg-transparent text-xs text-white text-center focus:outline-none px-1 placeholder-gray-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
            />
             <div className="flex flex-col h-full border-l border-gray-600 w-4 flex-shrink-0">
                <button 
                    className="h-1/2 flex items-center justify-center hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                    onClick={(e) => { e.stopPropagation(); handleStep(1); }}
                >
                    <svg width="8" height="4" viewBox="0 0 8 4" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 0L8 4H0L4 0Z" fill="currentColor"/></svg>
                </button>
                <button 
                    className="h-1/2 flex items-center justify-center hover:bg-gray-700 text-gray-400 hover:text-white transition-colors border-t border-gray-600"
                    onClick={(e) => { e.stopPropagation(); handleStep(-1); }}
                >
                    <svg width="8" height="4" viewBox="0 0 8 4" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4L0 0H8L4 4Z" fill="currentColor"/></svg>
                </button>
             </div>
        </div>
    );
};
