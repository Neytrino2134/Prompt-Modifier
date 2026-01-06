
import React from 'react';

// Helper component for input with stylish spinners
export const InputWithSpinners: React.FC<{
    value: string;
    onChange: (val: string) => void;
    min?: number;
    className?: string;
    placeholder?: string;
    title?: string;
}> = ({ value, onChange, min, className, placeholder, title }) => {
    const handleStep = (step: number) => {
        const currentVal = parseInt(value, 10);
        let nextVal = isNaN(currentVal) ? (min || 0) : currentVal + step;
        if (min !== undefined && nextVal < min) nextVal = min;
        onChange(nextVal.toString());
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === '') {
             // Allow clearing if needed, or handle in parent
             onChange(''); 
             return;
        }
        const num = parseInt(val, 10);
        if (isNaN(num)) return; // Reject non-numbers
        
        onChange(val);
    };
    
    return (
        <div className={`flex items-center bg-gray-600 rounded px-1 h-5 ${className}`} title={title}>
             <input
                type="number"
                min={min}
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                className="w-6 bg-transparent text-[10px] text-white text-center border-none p-0 focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
            />
             <div className="flex flex-col h-full ml-0.5 -mr-0.5">
                <button 
                    className="h-2.5 flex items-center justify-center hover:text-white text-gray-300 transition-colors"
                    onClick={(e) => { e.stopPropagation(); handleStep(1); }}
                >
                    <svg width="6" height="3" viewBox="0 0 8 4" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 0L8 4H0L4 0Z" fill="currentColor"/></svg>
                </button>
                <button 
                    className="h-2.5 flex items-center justify-center hover:text-white text-gray-300 transition-colors"
                    onClick={(e) => { e.stopPropagation(); handleStep(-1); }}
                >
                    <svg width="6" height="3" viewBox="0 0 8 4" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4L0 0H8L4 4Z" fill="currentColor"/></svg>
                </button>
             </div>
        </div>
    );
};
