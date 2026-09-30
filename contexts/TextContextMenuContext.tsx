import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { 
  getSpellingSuggestions, 
  getWordAtCaret, 
  addToUserCustomDictionary, 
  ignoreWordForSession,
  getUserCustomDictionary,
  removeFromUserCustomDictionary,
  clearUserCustomDictionary,
  correctTextWithAI,
  convertKeyboardLayout
} from '../services/spellCheckService';
import { useLanguage } from '../localization';

export interface TextContextMenuTarget {
  element: HTMLInputElement | HTMLTextAreaElement;
  onDebouncedChange?: (value: string) => void;
  onValueUpdate?: (value: string) => void;
}

export interface TextContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  target: TextContextMenuTarget | null;
  targetWord: string;
  wordRange: { start: number; end: number };
  selection: string;
  selectionRange: { start: number; end: number };
  fullText: string;
  isMisspelled: boolean;
  suggestions: string[];
  swappedLayoutWord?: string;
  isAiLoading: boolean;
  aiLoadingAction?: string;
}

interface TextContextMenuContextValue {
  state: TextContextMenuState;
  isCustomMenuEnabled: boolean;
  setIsCustomMenuEnabled: (enabled: boolean) => void;
  openContextMenu: (
    e: React.MouseEvent<HTMLInputElement | HTMLTextAreaElement> | MouseEvent,
    target: TextContextMenuTarget
  ) => void;
  closeContextMenu: () => void;
  applySuggestion: (suggestedWord: string) => void;
  applyTextReplacement: (newText: string, range?: { start: number; end: number }) => void;
  addToDictionary: (word?: string) => void;
  ignoreWord: (word?: string) => void;
  applyAiAction: (actionMode: 'spelling' | 'enhance' | 'translate_ru' | 'translate_en') => Promise<void>;
  changeCase: (type: 'upper' | 'lower' | 'title' | 'sentence') => void;
  customDictionaryWords: string[];
  removeDictionaryWord: (word: string) => void;
  clearDictionary: () => void;
  handleClipboardAction: (action: 'cut' | 'copy' | 'paste' | 'selectAll' | 'clear') => Promise<void>;
}

const TextContextMenuContext = createContext<TextContextMenuContextValue | null>(null);

const INITIAL_STATE: TextContextMenuState = {
  isOpen: false,
  x: 0,
  y: 0,
  target: null,
  targetWord: '',
  wordRange: { start: 0, end: 0 },
  selection: '',
  selectionRange: { start: 0, end: 0 },
  fullText: '',
  isMisspelled: false,
  suggestions: [],
  isAiLoading: false,
};

export const TextContextMenuProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { language } = useLanguage();
  const [state, setState] = useState<TextContextMenuState>(INITIAL_STATE);
  const [isCustomMenuEnabled, setIsCustomMenuEnabledState] = useState<boolean>(() => {
    return localStorage.getItem('settings_customTextContextMenu') !== 'false';
  });
  const [customDictionaryWords, setCustomDictionaryWords] = useState<string[]>(() => getUserCustomDictionary());

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const handleDictUpdate = () => {
      setCustomDictionaryWords(getUserCustomDictionary());
    };
    window.addEventListener('custom-dictionary-updated', handleDictUpdate);
    return () => window.removeEventListener('custom-dictionary-updated', handleDictUpdate);
  }, []);

  const setIsCustomMenuEnabled = (enabled: boolean) => {
    setIsCustomMenuEnabledState(enabled);
    localStorage.setItem('settings_customTextContextMenu', String(enabled));
  };

  const closeContextMenu = useCallback(() => {
    setState(prev => {
      if (!prev.isOpen) return prev;
      return { ...prev, isOpen: false, target: null };
    });
  }, []);

  const openContextMenu = useCallback((
    e: React.MouseEvent<HTMLInputElement | HTMLTextAreaElement> | MouseEvent,
    target: TextContextMenuTarget
  ) => {
    if (!isCustomMenuEnabled) {
      return; // Fall back to native browser menu if disabled
    }

    e.preventDefault();
    e.stopPropagation();

    const element = target.element;
    const fullText = element.value || '';
    const selStart = element.selectionStart ?? fullText.length;
    const selEnd = element.selectionEnd ?? fullText.length;
    const hasSelection = selStart !== selEnd;
    const selection = hasSelection ? fullText.slice(selStart, selEnd) : '';

    // Calculate clicked word position
    let targetWord = '';
    let wordRange = { start: selStart, end: selEnd };

    if (!hasSelection) {
      // Find word at caret position
      const wordInfo = getWordAtCaret(fullText, selStart);
      targetWord = wordInfo.word;
      wordRange = { start: wordInfo.start, end: wordInfo.end };
    } else {
      targetWord = selection.trim();
    }

    // Get spelling check & suggestions
    const { isCorrect, suggestions, swappedLayoutWord } = getSpellingSuggestions(targetWord);

    setState({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      target,
      targetWord,
      wordRange,
      selection,
      selectionRange: { start: selStart, end: selEnd },
      fullText,
      isMisspelled: !isCorrect && targetWord.length > 1,
      suggestions,
      swappedLayoutWord,
      isAiLoading: false,
    });
  }, [isCustomMenuEnabled]);

  /**
   * Directly sets value on the target element, fires input events, and triggers callbacks
   */
  const updateTargetValue = useCallback((
    newVal: string, 
    newCursorStart: number, 
    newCursorEnd: number
  ) => {
    const target = stateRef.current.target;
    if (!target || !target.element) return;

    const el = target.element;
    el.value = newVal;

    // Dispatch input & change events so React state and listeners update
    try {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } catch {}

    if (target.onValueUpdate) {
      target.onValueUpdate(newVal);
    }
    if (target.onDebouncedChange) {
      target.onDebouncedChange(newVal);
    }

    // Restore caret position
    try {
      el.focus();
      el.setSelectionRange(newCursorStart, newCursorEnd);
    } catch {}
  }, []);

  const applyTextReplacement = useCallback((newText: string, customRange?: { start: number; end: number }) => {
    const currentState = stateRef.current;
    if (!currentState.target || !currentState.target.element) return;

    const fullText = currentState.fullText;
    const range = customRange || (currentState.selection ? currentState.selectionRange : currentState.wordRange);
    
    const before = fullText.slice(0, range.start);
    const after = fullText.slice(range.end);
    const updatedFullText = before + newText + after;
    const newCursor = range.start + newText.length;

    updateTargetValue(updatedFullText, newCursor, newCursor);
    closeContextMenu();
  }, [updateTargetValue, closeContextMenu]);

  const applySuggestion = useCallback((suggestedWord: string) => {
    const currentState = stateRef.current;
    applyTextReplacement(suggestedWord, currentState.wordRange);
  }, [applyTextReplacement]);

  const addToDictionary = useCallback((wordToAdd?: string) => {
    const targetWord = wordToAdd || stateRef.current.targetWord;
    if (targetWord) {
      addToUserCustomDictionary(targetWord);
      setCustomDictionaryWords(getUserCustomDictionary());
    }
    closeContextMenu();
  }, [closeContextMenu]);

  const ignoreWord = useCallback((wordToIgnore?: string) => {
    const targetWord = wordToIgnore || stateRef.current.targetWord;
    if (targetWord) {
      ignoreWordForSession(targetWord);
    }
    closeContextMenu();
  }, [closeContextMenu]);

  const changeCase = useCallback((type: 'upper' | 'lower' | 'title' | 'sentence') => {
    const currentState = stateRef.current;
    const sourceText = currentState.selection || currentState.targetWord;
    if (!sourceText) return;

    let transformed = sourceText;
    if (type === 'upper') {
      transformed = sourceText.toUpperCase();
    } else if (type === 'lower') {
      transformed = sourceText.toLowerCase();
    } else if (type === 'title') {
      transformed = sourceText.replace(/\b\w/g, c => c.toUpperCase());
    } else if (type === 'sentence') {
      transformed = sourceText.charAt(0).toUpperCase() + sourceText.slice(1).toLowerCase();
    }

    applyTextReplacement(transformed);
  }, [applyTextReplacement]);

  const applyAiAction = useCallback(async (
    actionMode: 'spelling' | 'enhance' | 'translate_ru' | 'translate_en'
  ) => {
    const currentState = stateRef.current;
    if (!currentState.target) return;

    const textToProcess = currentState.selection || currentState.fullText;
    if (!textToProcess.trim()) return;

    setState(prev => ({ ...prev, isAiLoading: true, aiLoadingAction: actionMode }));

    try {
      const corrected = await correctTextWithAI(textToProcess, language, actionMode);
      if (currentState.selection) {
        applyTextReplacement(corrected, currentState.selectionRange);
      } else {
        updateTargetValue(corrected, corrected.length, corrected.length);
        closeContextMenu();
      }
    } catch (err: any) {
      console.error('AI text action failed:', err);
      // Fallback: If layout conversion was requested
      if (actionMode === 'spelling') {
        const { ru } = convertKeyboardLayout(textToProcess);
        if (ru !== textToProcess) {
          applyTextReplacement(ru);
        }
      }
      closeContextMenu();
    } finally {
      setState(prev => ({ ...prev, isAiLoading: false, aiLoadingAction: undefined }));
    }
  }, [language, applyTextReplacement, updateTargetValue, closeContextMenu]);

  const handleClipboardAction = useCallback(async (action: 'cut' | 'copy' | 'paste' | 'selectAll' | 'clear') => {
    const currentState = stateRef.current;
    if (!currentState.target || !currentState.target.element) return;

    const el = currentState.target.element;
    const selStart = el.selectionStart ?? 0;
    const selEnd = el.selectionEnd ?? 0;
    const hasSelection = selStart !== selEnd;
    const selectedText = hasSelection ? el.value.slice(selStart, selEnd) : '';

    if (action === 'copy') {
      const textToCopy = selectedText || el.value;
      if (textToCopy) {
        try {
          await navigator.clipboard.writeText(textToCopy);
        } catch {
          document.execCommand('copy');
        }
      }
      closeContextMenu();
    } else if (action === 'cut') {
      const textToCut = selectedText || el.value;
      if (textToCut) {
        try {
          await navigator.clipboard.writeText(textToCut);
        } catch {
          document.execCommand('cut');
        }
        if (hasSelection) {
          applyTextReplacement('', { start: selStart, end: selEnd });
        } else {
          updateTargetValue('', 0, 0);
          closeContextMenu();
        }
      }
    } else if (action === 'paste') {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          applyTextReplacement(text, { start: selStart, end: selEnd });
        }
      } catch (err) {
        console.warn('Clipboard read failed:', err);
        // Fallback to execCommand
        try {
          el.focus();
          document.execCommand('paste');
        } catch {}
        closeContextMenu();
      }
    } else if (action === 'selectAll') {
      el.focus();
      el.setSelectionRange(0, el.value.length);
      closeContextMenu();
    } else if (action === 'clear') {
      updateTargetValue('', 0, 0);
      closeContextMenu();
    }
  }, [applyTextReplacement, updateTargetValue, closeContextMenu]);

  const removeDictionaryWord = useCallback((word: string) => {
    removeFromUserCustomDictionary(word);
    setCustomDictionaryWords(getUserCustomDictionary());
  }, []);

  const clearDictionary = useCallback(() => {
    clearUserCustomDictionary();
    setCustomDictionaryWords([]);
  }, []);

  const value: TextContextMenuContextValue = {
    state,
    isCustomMenuEnabled,
    setIsCustomMenuEnabled,
    openContextMenu,
    closeContextMenu,
    applySuggestion,
    applyTextReplacement,
    addToDictionary,
    ignoreWord,
    applyAiAction,
    changeCase,
    customDictionaryWords,
    removeDictionaryWord,
    clearDictionary,
    handleClipboardAction,
  };

  return (
    <TextContextMenuContext.Provider value={value}>
      {children}
    </TextContextMenuContext.Provider>
  );
};

export const useTextContextMenu = () => {
  const context = useContext(TextContextMenuContext);
  if (!context) {
    throw new Error('useTextContextMenu must be used within a TextContextMenuProvider');
  }
  return context;
};
