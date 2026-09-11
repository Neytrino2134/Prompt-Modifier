
import React, { useState, useRef, useEffect } from 'react';
import { useLanguage, languages, LanguageCode } from '../localization';
import { Tooltip } from './Tooltip';

const LanguageSelector: React.FC = () => {
  const { language, setLanguage, secondaryLanguage, setSecondaryLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const secLangInfo = languages[secondaryLanguage] || languages['ru'];
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

  const isSecActive = language === secondaryLanguage;

  return (
    <div className="flex items-center h-7 bg-gray-800/70 border border-gray-700/50 rounded-md p-0.5 gap-0.5 select-none relative z-50" ref={menuRef}>
      {/* English Toggle Button */}
      <Tooltip content={enLangInfo.name} position="bottom" className="h-full">
        <button
          onClick={() => setLanguage('en')}
          className={`h-full px-2 rounded text-[11px] font-bold tracking-wider transition-all duration-150 flex items-center justify-center focus:outline-none ${
            language === 'en'
              ? 'bg-accent text-white shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          }`}
          aria-label="Switch to English"
        >
          {enLangInfo.short}
        </button>
      </Tooltip>

      {/* Secondary Language (RU/ES/etc) Group with Dropdown */}
      <div className={`flex items-center h-full rounded transition-all duration-150 overflow-hidden ${
        isSecActive
          ? 'bg-accent text-white shadow-sm'
          : 'text-gray-400 hover:text-white'
      }`}>
        <Tooltip content={secLangInfo.name} position="bottom" className="h-full">
          <button
            onClick={() => setLanguage(secondaryLanguage)}
            className={`h-full pl-2 pr-1 text-[11px] font-bold tracking-wider transition-all duration-150 flex items-center justify-center focus:outline-none ${
              isSecActive
                ? 'text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
            aria-label={`Switch to ${secLangInfo.name}`}
          >
            {secLangInfo.short}
          </button>
        </Tooltip>

        {/* Dropdown Arrow */}
        <button
          onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
          className={`h-full px-1.5 flex items-center justify-center transition-colors focus:outline-none ${
            isSecActive
              ? 'text-white/90 hover:text-white hover:bg-black/15'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          }`}
          title="Выбрать язык"
          aria-label="Select secondary language"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-2.5 w-2.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl p-1 z-[100] min-w-[150px] max-h-60 overflow-y-auto custom-scrollbar animate-fade-in-drop origin-top-left">
          {Object.entries(languages).filter(([code]) => code !== 'en').map(([code, info]) => (
            <button
              key={code}
              onClick={() => handleSelectSecondary(code as LanguageCode)}
              className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between transition-colors ${
                secondaryLanguage === code 
                  ? 'bg-gray-800 text-white font-bold border border-gray-700/60' 
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <div className="flex flex-col">
                <span className={secondaryLanguage === code ? 'text-accent-text' : 'text-gray-200'}>{info.nativeName}</span>
                <span className="text-[10px] text-gray-500">{info.name}</span>
              </div>
              <span className="text-[10px] text-gray-400 font-mono ml-2 border border-gray-700 rounded px-1 bg-gray-950/60">{info.short}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
