import React, { useState } from 'react';
import { useLanguage } from '../../../localization';
import { useTextContextMenu } from '../../../contexts/TextContextMenuContext';
import { CustomCheckbox } from '../../CustomCheckbox';

interface TextContextMenuSettingsProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export const TextContextMenuSettings: React.FC<TextContextMenuSettingsProps> = ({
  isCollapsed,
  onToggle,
}) => {
  const { t, language } = useLanguage();
  const {
    isCustomMenuEnabled,
    setIsCustomMenuEnabled,
    customDictionaryWords,
    removeDictionaryWord,
    clearDictionary,
  } = useTextContextMenu();

  const [newWordInput, setNewWordInput] = useState('');
  const [testText, setTestTest] = useState(
    language === 'ru'
      ? 'Проверте работу кастомного контекстного меню. Нажмите правой кнопкой на слово с ошыбкой (например превет или ошыбка).'
      : 'Test the custom context menu. Right-click on a misspelled word (e.g. recieve or fotorealistic).'
  );

  const isRu = language === 'ru';

  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWordInput.trim()) return;
    const { addToUserCustomDictionary } = require('../../../services/spellCheckService');
    addToUserCustomDictionary(newWordInput.trim());
    setNewWordInput('');
  };

  return (
    <div className="bg-gray-900/90 rounded-lg border border-gray-700/70 overflow-hidden transition-all">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-800/50 transition-colors select-none group"
      >
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 group-hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </span>
          <div>
            <label className="block text-xs font-semibold text-gray-200 cursor-pointer">
              {isRu ? 'Контекстное меню текста и орфография' : 'Text Context Menu & Spellcheck'}
            </label>
            {isCollapsed && (
              <p className="text-[10px] text-gray-400 leading-tight">
                {isCustomMenuEnabled 
                  ? (isRu ? `Включено • ${customDictionaryWords.length} слов в словаре` : `Enabled • ${customDictionaryWords.length} custom words`) 
                  : (isRu ? 'Отключено (нативное меню)' : 'Disabled (native menu)')}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium border ${isCustomMenuEnabled ? 'bg-cyan-950/60 text-cyan-300 border-cyan-800/60' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
            {isCustomMenuEnabled ? (isRu ? 'Активно' : 'Active') : (isRu ? 'Выкл' : 'Off')}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 text-gray-400 group-hover:text-gray-200 transition-transform duration-200 ${!isCollapsed ? 'rotate-180 text-cyan-400' : 'rotate-0'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {!isCollapsed && (
        <div className="px-3 pb-3 space-y-3.5 border-t border-gray-800/60 pt-3">
          {/* Main Toggle */}
          <div className="flex flex-col gap-2 p-2.5 bg-gray-800/90 rounded-md border border-gray-700">
            <CustomCheckbox
              id="customTextContextMenuEnabled"
              checked={isCustomMenuEnabled}
              onChange={setIsCustomMenuEnabled}
              label={isRu ? 'Кастомное контекстное меню с исправлением опечаток' : 'Custom context menu with spelling corrections'}
              className="text-sm text-gray-200 font-medium"
            />
            <p className="text-[11px] text-gray-400 leading-relaxed pl-6">
              {isRu
                ? 'При клике правой кнопкой мыши по слову в текстовом поле открывается стильное меню с вариантами исправления опечаток, переводом, AI-помощником и инструментами буфера обмена.'
                : 'Right-clicking a word in any text input opens a sleek styled menu with spelling correction suggestions, layout fixes, AI assist, and clipboard tools.'}
            </p>
          </div>

          {/* Interactive Test Area */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-300">
              {isRu ? 'Тестирование меню (нажмите правой кнопкой мыши):' : 'Interactive test field (right-click on words):'}
            </label>
            <div className="relative">
              <textarea
                value={testText}
                onChange={(e) => setTestTest(e.target.value)}
                rows={2}
                className="w-full p-2 bg-gray-950/80 border border-gray-700 rounded-md text-xs text-gray-200 resize-none focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Custom Dictionary Words Management */}
          <div className="space-y-2 pt-1 border-t border-gray-800/70">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-gray-300">
                {isRu ? 'Персональный словарь пользователя' : 'User Custom Dictionary'}
              </label>
              {customDictionaryWords.length > 0 && (
                <button
                  type="button"
                  onClick={clearDictionary}
                  className="text-[10px] text-red-400 hover:text-red-300 hover:underline"
                >
                  {isRu ? 'Очистить словарь' : 'Clear all'}
                </button>
              )}
            </div>

            {/* Add word form */}
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newWordInput}
                onChange={(e) => setNewWordInput(e.target.value)}
                placeholder={isRu ? 'Добавить новое слово в словарь...' : 'Add custom word to dictionary...'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newWordInput.trim()) {
                      const { addToUserCustomDictionary } = require('../../../services/spellCheckService');
                      addToUserCustomDictionary(newWordInput.trim());
                      setNewWordInput('');
                    }
                  }
                }}
                className="flex-1 px-2.5 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (newWordInput.trim()) {
                    const { addToUserCustomDictionary } = require('../../../services/spellCheckService');
                    addToUserCustomDictionary(newWordInput.trim());
                    setNewWordInput('');
                  }
                }}
                disabled={!newWordInput.trim()}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium disabled:opacity-50 transition-colors"
              >
                {isRu ? 'Добавить' : 'Add'}
              </button>
            </div>

            {/* Words list */}
            {customDictionaryWords.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-gray-950/60 rounded-md border border-gray-800">
                {customDictionaryWords.map((word) => (
                  <span
                    key={word}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-800 text-gray-300 text-[11px] border border-gray-700 group"
                  >
                    <span>{word}</span>
                    <button
                      type="button"
                      onClick={() => removeDictionaryWord(word)}
                      className="text-gray-500 hover:text-red-400 transition-colors ml-0.5"
                      title={isRu ? 'Удалить из словаря' : 'Remove from dictionary'}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-gray-500 italic">
                {isRu 
                  ? 'Словарь пока пуст. Вы можете добавлять слова через контекстное меню ("В словарь") или форму выше.'
                  : 'Dictionary is empty. Words added via the context menu or above will appear here.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
