import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';

export interface CustomSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
  description?: string;
}

export interface CustomSelectProps {
  options: CustomSelectOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  title?: string;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  direction?: 'up' | 'down' | 'auto';
  renderTriggerContent?: (selectedOption?: CustomSelectOption, selectedLabel?: string) => React.ReactNode;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  disabled,
  id,
  title,
  className,
  buttonClassName,
  dropdownClassName,
  direction = 'auto',
  renderTriggerContent
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [computedDirection, setComputedDirection] = useState<'up' | 'down'>('down');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<(HTMLLIElement | null)[]>([]);

  const selectedOption = options.find(opt => opt.value === value);
  const selectedLabel = selectedOption?.label || value;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    // Use capture phase to detect clicks even if propagation is stopped by a parent
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (direction === 'up') {
        setComputedDirection('up');
      } else if (direction === 'down') {
        setComputedDirection('down');
      } else if (wrapperRef.current) {
        // Auto calculate based on viewport space
        const rect = wrapperRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        if (spaceBelow < 220 && spaceAbove > spaceBelow) {
          setComputedDirection('up');
        } else {
          setComputedDirection('down');
        }
      }

      const selectedIdx = options.findIndex(opt => opt.value === value);
      setFocusedIndex(selectedIdx > -1 ? selectedIdx : 0);
      setTimeout(() => optionsRef.current[selectedIdx > -1 ? selectedIdx : 0]?.focus({ preventScroll: true }), 0);
    }
  }, [isOpen, options, value, direction]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement | HTMLLIElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          const newIndex = Math.min(focusedIndex + 1, options.length - 1);
          setFocusedIndex(newIndex);
          optionsRef.current[newIndex]?.focus({ preventScroll: true });
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          const newIndex = Math.max(focusedIndex - 1, 0);
          setFocusedIndex(newIndex);
          optionsRef.current[newIndex]?.focus({ preventScroll: true });
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && focusedIndex !== -1) {
          onChange(options[focusedIndex].value);
          setIsOpen(false);
        } else {
          setIsOpen(!isOpen);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const isUp = computedDirection === 'up';

  return (
    <div ref={wrapperRef} className={`relative w-full ${className || ''}`} title={title}>
      <button
        id={id}
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full ${buttonClassName || 'h-[36px] px-2.5 py-1.5'} bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-lg text-white text-xs outline-none focus:outline-none focus:ring-0 focus:border-gray-600 focus-visible:outline-none focus-visible:ring-0 disabled:opacity-50 disabled:cursor-not-allowed flex justify-between items-center text-left transition-colors group shadow-sm`}
      >
        <span className="truncate flex items-center gap-2 min-w-0">
          {renderTriggerContent ? renderTriggerContent(selectedOption, selectedLabel) : (
            <>
              {selectedOption?.icon && <span className="text-gray-400 shrink-0">{selectedOption.icon}</span>}
              <span className="truncate">{selectedLabel}</span>
            </>
          )}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-3.5 w-3.5 text-gray-400 group-hover:text-gray-200 transition-transform duration-200 flex-shrink-0 ml-1.5 ${
            isOpen ? 'transform rotate-180 text-gray-300' : ''
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className={`absolute z-[100] w-full min-w-[180px] bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-y-auto max-h-64 focus:outline-none py-1 backdrop-blur-md ${
            isUp ? 'bottom-full mb-1.5 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.5)]' : 'top-full mt-1.5 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.5)]'
          } ${dropdownClassName || ''}`}
        >
          {options.map((option, index) => {
            const isSelected = value === option.value;
            const isFocused = focusedIndex === index;
            return (
              <li
                key={option.value}
                ref={(el) => { optionsRef.current[index] = el; }}
                tabIndex={-1}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleOptionClick(option.value)}
                onKeyDown={handleKeyDown}
                className={`px-2.5 py-1.5 text-xs cursor-pointer select-none transition-colors flex items-center justify-between gap-2 group ${
                  isFocused
                    ? 'bg-cyan-600 text-white'
                    : isSelected
                    ? 'bg-cyan-950/70 text-cyan-300 font-medium'
                    : 'text-gray-200 hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-2 truncate min-w-0">
                  {option.icon && (
                    <span className={`shrink-0 ${isFocused ? 'text-white' : isSelected ? 'text-cyan-300' : 'text-gray-400 group-hover:text-gray-200'}`}>
                      {option.icon}
                    </span>
                  )}
                  <span className="truncate">{option.label}</span>
                </div>
                {option.badge && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border shrink-0 ${
                    isFocused 
                      ? 'bg-cyan-700 text-white border-cyan-400' 
                      : 'bg-gray-800 text-gray-300 border-gray-700'
                  }`}>
                    {option.badge}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default CustomSelect;
