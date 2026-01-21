
import React from 'react';

export const InputWithSpinners: React.FC<{
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    className?: string;
    onFocus?: () => void;
    readOnly?: boolean;
    onCopy?: () => void;
}> = ({ value, onChange, placeholder, className, onFocus, readOnly, onCopy }) => {
    const handleStep = (step: number) => {
        const num = parseInt(value.replace(/[^0-9]/g, ''), 10) || 0;
        let prefix = value.replace(/[0-9]/g, '');

        // Force migration from Character- to Entity-
        if (prefix === 'Character-' || !prefix || prefix.trim() === '') {
            prefix = 'Entity-';
        }

        onChange(`${prefix}${Math.max(1, num + step)}`);
    };

    return (
        <div className={`flex items-center bg-gray-700 rounded-md border border-gray-600 h-[32px] overflow-hidden group hover:border-gray-500 transition-colors ${className} relative`}>
            <input
                type="text"
                value={value}
                onChange={(e) => !readOnly && onChange(e.target.value)}
                placeholder={placeholder}
                onFocus={onFocus}
                readOnly={readOnly}
                className={`w-full h-full bg-transparent text-sm text-white px-2 focus:outline-none border-none min-w-0 ${readOnly ? 'cursor-default select-none' : ''}`}
                onMouseDown={e => e.stopPropagation()}
            />

            {onCopy && (
                <button
                    className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center bg-gray-800 border border-gray-600 rounded text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-gray-700 hover:text-white"
                    onClick={(e) => { e.stopPropagation(); onCopy(); }}
                    title="Copy Index"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </button>
            )}

            <div className="flex flex-col h-full border-l border-gray-600 w-5 flex-shrink-0 bg-gray-800 z-20">
                <button
                    className="h-1/2 flex items-center justify-center hover:bg-cyan-600 text-gray-400 hover:text-white transition-colors active:bg-cyan-700"
                    onClick={(e) => { e.stopPropagation(); handleStep(1); }}
                >
                    <svg width="6" height="3" viewBox="0 0 8 4" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 0L8 4H0L4 0Z" fill="currentColor" /></svg>
                </button>
                <button
                    className="h-1/2 flex items-center justify-center hover:bg-cyan-600 text-gray-400 hover:text-white transition-colors border-t border-gray-600 active:bg-cyan-700"
                    onClick={(e) => { e.stopPropagation(); handleStep(-1); }}
                >
                    <svg width="6" height="3" viewBox="0 0 8 4" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4L0 0H8L4 4Z" fill="currentColor" /></svg>
                </button>
            </div>
        </div>
    );
};
