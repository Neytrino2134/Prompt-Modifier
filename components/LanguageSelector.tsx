
import React, { useState, useRef, useEffect } from 'react';
import { useLanguage, languages, LanguageCode } from '../localization';
import { Tooltip } from './Tooltip';

const LanguageSelector: React.FC = () => {
  const { language, setLanguage, secondaryLanguage, setSecondaryLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const secLangInfo = languages[secondaryLanguage];
  const enLangInfo = languages['en'];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSecondary = (code: LanguageCode) => {
    setSecondaryLanguage(code);
    setLanguage(code); // Automatically switch to the selected language
    setIsOpen(false);
  };

  return (
    <div className="flex items-center h-9 space-x-1 select-none relative" ref={menuRef}>
      <Tooltip content={enLangInfo.name} position="bottom" className="h-full">
        <button
            onClick={() => setLanguage('en')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-colors h-full flex items-center justify-center focus:outline-none min-w-[36px] ${
            language === 'en'
                ? 'bg-accent text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
            }`}
        >
            {enLangInfo.short}
        </button>
      </Tooltip>

      <div className="relative flex items-center h-full">
        {/* Main Secondary Button */}
        <Tooltip content={secLangInfo.name} position="bottom" className="h-full">
            <button
                onClick={() => setLanguage(secondaryLanguage)}
                className={`px-3 py-1 rounded-l-md text-xs font-bold transition-colors h-full flex items-center justify-center focus:outline-none min-w-[36px] ${
                language === secondaryLanguage
                    ? 'bg-accent text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                }`}
            >
                {secLangInfo.short}
            </button>
        </Tooltip>
        
        {/* Dropdown Arrow */}
        <button
            onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
            className={`h-full px-1 rounded-r-md flex items-center justify-center transition-colors focus:outline-none border-l border-gray-600/50 ${
                 language === secondaryLanguage
                 ? 'bg-accent text-white hover:bg-accent-hover'
                 : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
            }`}
        >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
            <div className="absolute top-full right-0 mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-xl z-50 py-1 min-w-[140px] max-h-60 overflow-y-auto custom-scrollbar animate-fade-in-drop origin-top-right">
                {Object.entries(languages).filter(([code]) => code !== 'en').map(([code, info]) => (
                    <button
                        key={code}
                        onClick={() => handleSelectSecondary(code as LanguageCode)}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-700 transition-colors ${secondaryLanguage === code ? 'bg-gray-700/50' : ''}`}
                    >
                        <div className="flex flex-col">
                            <span className={`font-medium ${secondaryLanguage === code ? 'text-accent-text' : 'text-gray-200'}`}>{info.nativeName}</span>
                            <span className="text-[10px] text-gray-500">{info.name}</span>
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono ml-2 border border-gray-600 rounded px-1">{info.short}</span>
                    </button>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default LanguageSelector;
