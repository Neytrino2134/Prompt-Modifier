
import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface CustomSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  options: CustomSelectOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  title?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ options, value, onChange, disabled, id, title }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
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
    // Use capture phase to detect clicks even if propagation is stopped by a parent (like a modal)
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const selectedIdx = options.findIndex(opt => opt.value === value);
      setFocusedIndex(selectedIdx > -1 ? selectedIdx : 0);
      setTimeout(() => optionsRef.current[selectedIdx > -1 ? selectedIdx : 0]?.focus(), 0);
    }
  }, [isOpen, options, value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement | HTMLLIElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          const newIndex = Math.min(focusedIndex + 1, options.length - 1);
          setFocusedIndex(newIndex);
          optionsRef.current[newIndex]?.focus();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          const newIndex = Math.max(focusedIndex - 1, 0);
          setFocusedIndex(newIndex);
          optionsRef.current[newIndex]?.focus();
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

  return (
    <div ref={wrapperRef} className="relative w-full" title={title}>
      <button
        id={id}
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex justify-between items-center text-left group"
      >
        <span className="truncate flex items-center gap-2">
            {selectedOption?.icon && <span className="text-gray-400">{selectedOption.icon}</span>}
            {selectedLabel}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-200 flex-shrink-0 ml-1 ${isOpen ? 'transform rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      {isOpen && (
        <ul
          role="listbox"
          className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg focus:outline-none"
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              ref={(el) => { optionsRef.current[index] = el; }}
              tabIndex={-1}
              role="option"
              aria-selected={value === option.value}
              onClick={() => handleOptionClick(option.value)}
              onKeyDown={handleKeyDown}
              className={`p-2 text-sm cursor-pointer select-none transition-colors flex items-center gap-2 group ${
                focusedIndex === index ? 'bg-cyan-600 text-white' : 'text-gray-200 hover:bg-gray-600'
              } ${
                value === option.value ? 'font-semibold' : ''
              }`}
            >
              {option.icon && (
                  <span className={`${focusedIndex === index ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                      {option.icon}
                  </span>
              )}
              <span>{option.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CustomSelect;
