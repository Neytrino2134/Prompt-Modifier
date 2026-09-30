import React, { useEffect, useRef, useState } from 'react';
import { useTextContextMenu } from '../contexts/TextContextMenuContext';
import { useLanguage } from '../localization';

const MENU_WIDTH = 260;
const ESTIMATED_MAX_HEIGHT = 440;

export const TextContextMenu: React.FC = () => {
  const {
    state,
    closeContextMenu,
    applySuggestion,
    applyTextReplacement,
    addToDictionary,
    ignoreWord,
    applyAiAction,
    changeCase,
    handleClipboardAction,
  } = useTextContextMenu();

  const { t, language } = useLanguage();
  const menuRef = useRef<HTMLDivElement>(null);
  const [showCaseSubmenu, setShowCaseSubmenu] = useState(false);

  // Close on outside click, window resize, escape key
  useEffect(() => {
    if (!state.isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeContextMenu();
      }
    };

    const handleScroll = () => {
      closeContextMenu();
    };

    window.addEventListener('mousedown', handleMouseDown, true);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown, true);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleScroll);
    };
  }, [state.isOpen, closeContextMenu]);

  if (!state.isOpen) return null;

  // Clamping coordinates inside viewport
  let posX = state.x;
  let posY = state.y;

  if (posX + MENU_WIDTH > window.innerWidth - 12) {
    posX = window.innerWidth - MENU_WIDTH - 12;
  }
  if (posY + ESTIMATED_MAX_HEIGHT > window.innerHeight - 12) {
    posY = Math.max(12, window.innerHeight - ESTIMATED_MAX_HEIGHT - 12);
  }

  const isRu = language === 'ru';
  const hasWord = !!state.targetWord;
  const hasSelection = !!state.selection;
  const hasSuggestions = state.suggestions.length > 0;
  const isMisspelled = state.isMisspelled;

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] w-[260px] bg-gray-900/95 backdrop-blur-xl border border-cyan-500/40 rounded-xl shadow-2xl shadow-cyan-950/60 p-1.5 text-xs text-gray-200 select-none animate-in fade-in zoom-in-95 duration-100 font-sans"
      style={{
        left: `${posX}px`,
        top: `${posY}px`,
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header Info Tag (Word / Selection preview) */}
      {(hasWord || hasSelection) && (
        <div className="flex items-center justify-between px-2.5 py-1.5 mb-1 bg-gray-800/80 rounded-lg border border-gray-700/50">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isMisspelled ? 'bg-red-400 animate-pulse' : 'bg-cyan-400'}`} />
            <span className="font-semibold text-gray-100 truncate max-w-[140px]" title={state.targetWord || state.selection}>
              "{state.targetWord || state.selection}"
            </span>
          </div>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isMisspelled ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'}`}>
            {isMisspelled ? (isRu ? 'Опечатка' : 'Typo') : (hasSelection ? (isRu ? 'Выделено' : 'Selected') : (isRu ? 'Слово' : 'Word'))}
          </span>
        </div>
      )}

      {/* SECTION 1: SPELLING CORRECTION SUGGESTIONS */}
      {hasSuggestions && (
        <div className="mb-1 pb-1 border-b border-gray-800">
          <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-cyan-400/90 uppercase flex items-center justify-between">
            <span>{isRu ? 'Варианты исправления' : 'Spelling Suggestions'}</span>
            <span className="text-gray-500 text-[9px]">{state.suggestions.length}</span>
          </div>
          <div className="flex flex-col gap-0.5 mt-0.5">
            {state.suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applySuggestion(suggestion)}
                className="group flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-gradient-to-r hover:from-cyan-950/70 hover:to-gray-800 text-left font-medium text-white hover:text-cyan-300 transition-all border border-transparent hover:border-cyan-500/40"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <svg className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="truncate font-semibold text-xs">{suggestion}</span>
                </div>
                <span className="text-[10px] font-mono text-gray-500 group-hover:text-cyan-400">
                  {idx === 0 ? '↵' : ''}
                </span>
              </button>
            ))}
          </div>

          {/* Dictionary actions */}
          {hasWord && (
            <div className="grid grid-cols-2 gap-1 mt-1 pt-1 border-t border-gray-800/80">
              <button
                type="button"
                onClick={() => addToDictionary()}
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors text-[11px]"
                title={isRu ? 'Добавить это слово в персональный словарь' : 'Add word to custom dictionary'}
              >
                <svg className="w-3 h-3 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="truncate">{isRu ? 'В словарь' : 'Add to dict'}</span>
              </button>
              <button
                type="button"
                onClick={() => ignoreWord()}
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors text-[11px]"
                title={isRu ? 'Игнорировать в этой сессии' : 'Ignore word in this session'}
              >
                <svg className="w-3 h-3 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
                <span className="truncate">{isRu ? 'Пропустить' : 'Ignore'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: AI SMART ACTIONS */}
      <div className="mb-1 pb-1 border-b border-gray-800 flex flex-col gap-0.5">
        <button
          type="button"
          disabled={state.isAiLoading}
          onClick={() => applyAiAction('spelling')}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-cyan-950/50 text-gray-300 hover:text-cyan-300 transition-colors group disabled:opacity-50"
        >
          <div className="flex items-center gap-2">
            {state.isAiLoading && state.aiLoadingAction === 'spelling' ? (
              <svg className="animate-spin w-3.5 h-3.5 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
            <span className="font-medium">{isRu ? 'Исправить орфографию с ИИ' : 'Fix with AI'}</span>
          </div>
          <span className="text-[10px] text-purple-400/80 font-mono">AI</span>
        </button>

        <button
          type="button"
          disabled={state.isAiLoading}
          onClick={() => applyAiAction('enhance')}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-amber-300 transition-colors group disabled:opacity-50"
        >
          <div className="flex items-center gap-2">
            {state.isAiLoading && state.aiLoadingAction === 'enhance' ? (
              <svg className="animate-spin w-3.5 h-3.5 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            )}
            <span className="font-medium">{isRu ? 'Улучшить промпт' : 'Enhance Prompt'}</span>
          </div>
          <span className="text-[10px] text-amber-400/80 font-mono">Magic</span>
        </button>

        {/* Quick Translation */}
        <div className="grid grid-cols-2 gap-1 mt-0.5">
          <button
            type="button"
            disabled={state.isAiLoading}
            onClick={() => applyAiAction('translate_ru')}
            className="flex items-center justify-center gap-1.5 px-2 py-1 rounded bg-gray-800/60 hover:bg-gray-800 text-gray-300 hover:text-cyan-300 transition-colors text-[11px] disabled:opacity-50"
          >
            <span className="text-[10px] font-bold text-cyan-400">RU</span>
            <span>{isRu ? 'На русский' : 'To Russian'}</span>
          </button>
          <button
            type="button"
            disabled={state.isAiLoading}
            onClick={() => applyAiAction('translate_en')}
            className="flex items-center justify-center gap-1.5 px-2 py-1 rounded bg-gray-800/60 hover:bg-gray-800 text-gray-300 hover:text-cyan-300 transition-colors text-[11px] disabled:opacity-50"
          >
            <span className="text-[10px] font-bold text-cyan-400">EN</span>
            <span>{isRu ? 'На английский' : 'To English'}</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: TEXT TRANSFORM & CASE */}
      <div className="mb-1 pb-1 border-b border-gray-800">
        <button
          type="button"
          onClick={() => setShowCaseSubmenu(prev => !prev)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 5v14m6-6h6m-3-3v6" />
            </svg>
            <span>{isRu ? 'Регистр букв' : 'Text Case'}</span>
          </div>
          <svg className={`w-3.5 h-3.5 text-gray-500 transition-transform ${showCaseSubmenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showCaseSubmenu && (
          <div className="grid grid-cols-2 gap-1 p-1 bg-gray-950/60 rounded-lg mt-1 border border-gray-800">
            <button
              type="button"
              onClick={() => changeCase('lower')}
              className="px-2 py-1 text-left rounded hover:bg-gray-800 text-gray-400 hover:text-gray-200 text-[11px] font-mono"
            >
              строчные
            </button>
            <button
              type="button"
              onClick={() => changeCase('upper')}
              className="px-2 py-1 text-left rounded hover:bg-gray-800 text-gray-400 hover:text-gray-200 text-[11px] font-mono uppercase"
            >
              ПРОПИСНЫЕ
            </button>
            <button
              type="button"
              onClick={() => changeCase('title')}
              className="px-2 py-1 text-left rounded hover:bg-gray-800 text-gray-400 hover:text-gray-200 text-[11px] font-mono"
            >
              С Заглавной
            </button>
            <button
              type="button"
              onClick={() => changeCase('sentence')}
              className="px-2 py-1 text-left rounded hover:bg-gray-800 text-gray-400 hover:text-gray-200 text-[11px] font-mono"
            >
              Предложение
            </button>
          </div>
        )}
      </div>

      {/* SECTION 4: STANDARD CLIPBOARD & EDITING ACTIONS */}
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={() => handleClipboardAction('cut')}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879a3 3 0 11-4.242-4.242 3 3 0 014.242 0M7 7l2.879 2.879" />
            </svg>
            <span>{isRu ? 'Вырезать' : 'Cut'}</span>
          </div>
          <span className="text-[10px] font-mono text-gray-500">Ctrl+X</span>
        </button>

        <button
          type="button"
          onClick={() => handleClipboardAction('copy')}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>{isRu ? 'Копировать' : 'Copy'}</span>
          </div>
          <span className="text-[10px] font-mono text-gray-500">Ctrl+C</span>
        </button>

        <button
          type="button"
          onClick={() => handleClipboardAction('paste')}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="font-semibold text-gray-200">{isRu ? 'Вставить' : 'Paste'}</span>
          </div>
          <span className="text-[10px] font-mono text-cyan-400/80">Ctrl+V</span>
        </button>

        <div className="h-px bg-gray-800 my-0.5"></div>

        <button
          type="button"
          onClick={() => handleClipboardAction('selectAll')}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
            <span>{isRu ? 'Выделить всё' : 'Select All'}</span>
          </div>
          <span className="text-[10px] font-mono text-gray-500">Ctrl+A</span>
        </button>

        <button
          type="button"
          onClick={() => handleClipboardAction('clear')}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-red-950/40 text-red-400 hover:text-red-300 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>{isRu ? 'Очистить поле' : 'Clear field'}</span>
          </div>
        </button>
      </div>
    </div>
  );
};
