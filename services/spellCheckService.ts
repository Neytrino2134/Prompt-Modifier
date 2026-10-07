import { GoogleGenAI } from "@google/genai";
import { getApiKey } from './geminiService';
import { getModelForMode, isOpenAiTextModel } from './modelConfig';
import { callOpenAiChatCompletion } from './openaiService';

// Keyboard layout mappings for English (QWERTY) <-> Russian (ЙЦУКЕН)
const EN_TO_RU_MAP: Record<string, string> = {
  'q': 'й', 'w': 'ц', 'e': 'у', 'r': 'к', 't': 'е', 'y': 'н', 'u': 'г', 'i': 'ш', 'o': 'щ', 'p': 'з', '[': 'х', ']': 'ъ',
  'a': 'ф', 's': 'ы', 'd': 'в', 'f': 'а', 'g': 'п', 'h': 'р', 'j': 'о', 'k': 'л', 'l': 'д', ';': 'ж', "'": 'э',
  'z': 'я', 'x': 'ч', 'c': 'с', 'v': 'м', 'b': 'и', 'n': 'т', 'm': 'ь', ',': 'б', '.': 'ю', '/': '.',
  'Q': 'Й', 'W': 'Ц', 'E': 'У', 'R': 'К', 'T': 'Е', 'Y': 'Н', 'U': 'Г', 'I': 'Ш', 'O': 'Щ', 'P': 'З', '{': 'Х', '}': 'Ъ',
  'A': 'Ф', 'S': 'Ы', 'D': 'В', 'F': 'А', 'G': 'П', 'H': 'Р', 'J': 'О', 'K': 'Л', 'L': 'Д', ':': 'Ж', '"': 'Э',
  'Z': 'Я', 'X': 'Ч', 'C': 'С', 'V': 'М', 'B': 'И', 'N': 'Т', 'M': 'Ь', '<': 'Б', '>': 'Ю', '?': ','
};

const RU_TO_EN_MAP: Record<string, string> = {};
Object.entries(EN_TO_RU_MAP).forEach(([en, ru]) => {
  RU_TO_EN_MAP[ru] = en;
});

// Common built-in dictionaries for high-speed offline check & suggestions
const RUSSIAN_COMMON_WORDS = new Set([
  // Basic & Everyday
  'привет', 'здравствуйте', 'добрый', 'день', 'утро', 'вечер', 'ночь', 'человек', 'люди', 'время', 'год', 'дело',
  'жизнь', 'деньги', 'рука', 'работа', 'слово', 'место', 'лицо', 'друг', 'глаз', 'дом', 'сторона', 'страна', 'мир',
  'случай', 'голова', 'ребенок', 'система', 'конец', 'город', 'часть', 'женщина', 'земля', 'машина', 'вода', 'отец',
  'проблема', 'час', 'право', 'нога', 'решение', 'дверь', 'образ', 'история', 'закон', 'война', 'голос', 'тысяча',
  'книга', 'возможность', 'результат', 'ночь', 'стол', 'имя', 'область', 'статья', 'число', 'компания', 'народ',
  'вариант', 'вопрос', 'ответ', 'текст', 'строка', 'список', 'кнопка', 'окно', 'экран', 'панель', 'вкладка', 'раздел',
  'пользователь', 'проект', 'файл', 'папка', 'сохранить', 'открыть', 'создать', 'удалить', 'изменить', 'закрыть',
  'настройки', 'параметры', 'помощь', 'справка', 'ошибка', 'успех', 'внимание', 'предупреждение', 'отмена', 'применить',
  // Verbs
  'быть', 'сказать', 'мочь', 'говорить', 'знать', 'стать', 'есть', 'хотеть', 'видеть', 'идти', 'стоять', 'думать',
  'спросить', 'жить', 'смотреть', 'понять', 'получить', 'сидеть', 'сам', 'понимать', 'сделать', 'делать', 'взять',
  'давать', 'пойти', 'увидеть', 'пойти', 'найти', 'остаться', 'выйти', 'подумать', 'прийти', 'узнать', 'заметить',
  'показать', 'написать', 'писать', 'читать', 'прочитать', 'создавать', 'генерировать', 'обрабатывать', 'исправлять',
  'проверять', 'настроить', 'запустить', 'остановить', 'выбрать', 'выделить', 'вставить', 'копировать', 'вырезать',
  // Adjectives & Modifiers
  'новый', 'большой', 'первый', 'последний', 'хороший', 'русский', 'высокий', 'разный', 'маленький', 'главный',
  'старый', 'красивый', 'быстрый', 'медленный', 'темный', 'светлый', 'яркий', 'красный', 'синий', 'зеленый',
  'желтый', 'черный', 'белый', 'фиолетовый', 'оранжевый', 'бирюзовый', 'золотой', 'серебряный', 'стильный', 'чистый',
  'четкий', 'реалистичный', 'детализированный', 'кинематографичный', 'фотографический', 'современный', 'киберпанк',
  // Prompt engineering & AI terms in Russian
  'промпт', 'подсказка', 'персонаж', 'стиль', 'освещение', 'фон', 'качество', 'генерация', 'модель', 'текстура',
  'камера', 'ракурс', 'рендеринг', 'шедевр', 'детализация', 'иллюстрация', 'арт', 'концепт', 'картина', 'портрет',
  'пейзаж', 'пейзажи', 'лицо', 'поза', 'динамика', 'атмосфера', 'настроение', 'неоновый', 'футуристичный', 'аниме',
  'реализм', 'гиперреализм', 'кинематограф', 'разрешение', 'формат', 'масштаб', 'узел', 'соединение', 'группа',
  'каталог', 'библиотека', 'история', 'очередь', 'задача', 'процесс', 'анализ', 'перевод', 'скрипт', 'сценарий'
]);

const ENGLISH_COMMON_WORDS = new Set([
  // Basic & Everyday
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you',
  'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one',
  'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when',
  'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some',
  'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back',
  'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these',
  'give', 'day', 'most', 'us', 'prompt', 'text', 'image', 'character', 'node', 'canvas', 'connection', 'editor', 'script',
  // AI & Creative Art terms
  'masterpiece', 'photorealistic', 'realistic', 'hyperrealistic', 'cinematic', 'lighting', 'ultra', 'detailed',
  'portrait', 'landscape', 'cyberpunk', 'futuristic', 'neon', 'glowing', 'volumetric', 'octane', 'render', 'unreal',
  'engine', 'concept', 'art', 'digital', 'painting', 'illustration', 'studio', 'quality', 'resolution', 'sharp',
  'focus', 'depth', 'field', 'background', 'texture', 'smooth', 'contrast', 'vibrant', 'color', 'palette', 'dynamic',
  'pose', 'dramatic', 'atmosphere', 'shadows', 'highlights', 'reflections', 'raytracing', 'hdr', '8k', '4k', 'wallpaper',
  'character', 'face', 'eyes', 'hair', 'costume', 'outfit', 'cyber', 'mechanical', 'aesthetic', 'anime', 'manga', 'fantasy',
  'sci-fi', 'space', 'galaxy', 'nature', 'forest', 'mountains', 'ocean', 'skyline', 'cityscape', 'vintage', 'retro'
]);

// Known common typo patterns and phonetic rules for Russian & English
const COMMON_TYPOS_MAP: Record<string, string[]> = {
  // Russian common typos
  'привет': ['превет', 'привед', 'превед', 'ghbdtn'],
  'здравствуйте': ['здраствуйте', 'здрасти', 'здравствуй', 'здравствуйти', 'plhfdcndeqnt'],
  'спасибо': ['спосибо', 'спасиба', 'cgfcb,j'],
  'пожалуйста': ['пожалуста', 'пожалуйсто', 'пожалусто', 'gj;fkeqcnf'],
  'хорошо': ['харашо', 'хорошоо', '[jhjij'],
  'красивый': ['красивий', 'кросивый', 'r रोचक'],
  'человек': ['чиловек', 'челавек', 'xtkjdtr'],
  'работа': ['робота', 'hfgjnf'],
  'помощь': ['помащь', 'помошь', 'gjvjom'],
  'ошибка': ['ашибка', 'ошыбка', 'ji machinery'],
  'программа': ['програма', 'праграмма', 'ghjuhfvvf'],
  'эффект': ['еффект', 'эфект', 'ефект'],
  'массив': ['масив', 'масыв'],
  'аккуратный': ['акуратный', 'акуратний'],
  'сделать': ['зделать', 'сделат'],
  'здесь': ['сдесь', 'здес'],
  'чувство': ['чуство', 'чювство'],
  'солнце': ['сонце', 'соннце'],
  'лестница': ['лесница'],
  'праздник': ['празник'],
  'сердце': ['серце'],
  'корова': ['карова'],
  'собака': ['сабака'],
  'молоко': ['малако', 'молако'],
  'машина': ['машына'],
  'жизнь': ['жызнь', 'жизьн'],
  'чудо': ['чюдо'],
  'щука': ['щюка'],
  'чай': ['чяй'],
  'щавель': ['щявель'],
  'нравится': ['нравицца', 'нравица', 'нравиться'],
  'хочется': ['хочецца', 'хочеца', 'хочеться'],
  'делается': ['делаецца', 'делаетса', 'делаеться'],
  'компьютер': ['компютер', 'компутер'],
  'персонаж': ['персонаш', 'пирсонаж', 'персанаж'],
  'промпт': ['промт', 'промп', 'promt', 'ghjvin'],
  'генерация': ['гинерация', 'генирация'],
  'реализм': ['риализм', 'реолизм'],
  'кинематографичный': ['кинематографический', 'киниматографичный'],
  'освещение': ['освищение', 'асвещение'],
  'детализация': ['дитализация', 'детализацыя'],

  // English common typos
  'receive': ['recieve', 'recive'],
  'believe': ['beleive', 'belive'],
  'tomorrow': ['tommorow', 'tomorow', 'tommorrow'],
  'definitely': ['definately', 'definitly', 'defanitely'],
  'separate': ['seperate', 'separete'],
  'until': ['untill', 'untl'],
  'occurred': ['occured', 'ocured'],
  'successful': ['succesful', 'successfull'],
  'necessary': ['neccessary', 'necesary'],
  'accommodate': ['accomodate', 'acommodate'],
  'beautiful': ['beutiful', 'beatiful', 'beautifull'],
  'lighting': ['ligthing', 'lighitng', 'lightng'],
  'character': ['charater', 'charecter', 'charactor'],
  'photorealistic': ['photorealstic', 'fotorealistic', 'photorealistc'],
  'cinematic': ['cinmatic', 'cinematik'],
  'masterpiece': ['masterpeice', 'masterpice'],
  'cyberpunk': ['ciberpunk', 'cyberpank']
};

// Inverted lookup map for ultra fast direct hit: typo -> correct words
const TYPO_TO_CORRECT: Record<string, string[]> = {};
Object.entries(COMMON_TYPOS_MAP).forEach(([correct, typos]) => {
  typos.forEach(typo => {
    const lowerTypo = typo.toLowerCase();
    if (!TYPO_TO_CORRECT[lowerTypo]) {
      TYPO_TO_CORRECT[lowerTypo] = [];
    }
    if (!TYPO_TO_CORRECT[lowerTypo].includes(correct)) {
      TYPO_TO_CORRECT[lowerTypo].push(correct);
    }
  });
});

// Storage keys
const USER_DICT_STORAGE_KEY = 'prompt_modifier_custom_dictionary';
const USER_IGNORED_WORDS = new Set<string>();

/**
 * Calculates Levenshtein edit distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Converts text typed in wrong keyboard layout (e.g. "ghbdtn" -> "привет", "руддщ" -> "hello")
 */
export function convertKeyboardLayout(text: string): { ru: string; en: string } {
  const ru = text.split('').map(char => EN_TO_RU_MAP[char] || char).join('');
  const en = text.split('').map(char => RU_TO_EN_MAP[char] || char).join('');
  return { ru, en };
}

/**
 * User Custom Dictionary Management
 */
export function getUserCustomDictionary(): string[] {
  try {
    const raw = localStorage.getItem(USER_DICT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToUserCustomDictionary(word: string): void {
  const trimmed = word.trim().toLowerCase();
  if (!trimmed) return;
  const current = getUserCustomDictionary();
  if (!current.includes(trimmed)) {
    current.push(trimmed);
    localStorage.setItem(USER_DICT_STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('custom-dictionary-updated'));
  }
}

export function removeFromUserCustomDictionary(word: string): void {
  const trimmed = word.trim().toLowerCase();
  const current = getUserCustomDictionary().filter(w => w.toLowerCase() !== trimmed);
  localStorage.setItem(USER_DICT_STORAGE_KEY, JSON.stringify(current));
  window.dispatchEvent(new CustomEvent('custom-dictionary-updated'));
}

export function clearUserCustomDictionary(): void {
  localStorage.removeItem(USER_DICT_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('custom-dictionary-updated'));
}

export function ignoreWordForSession(word: string): void {
  USER_IGNORED_WORDS.add(word.trim().toLowerCase());
}

export function isWordIgnored(word: string): boolean {
  return USER_IGNORED_WORDS.has(word.trim().toLowerCase());
}

/**
 * Checks if a word is recognized as valid/correct
 */
export function isWordValid(word: string, languageHint: string = 'auto'): boolean {
  const cleaned = word.trim().toLowerCase().replace(/^[^a-zA-Zа-яА-ЯёЁ0-9]+|[^a-zA-Zа-яА-ЯёЁ0-9]+$/g, '');
  if (!cleaned || cleaned.length <= 1 || /^\d+$/.test(cleaned)) {
    return true; // Single chars, punctuation, numbers are not errors
  }

  // Check if ignored
  if (isWordIgnored(cleaned)) return true;

  // Check user dictionary
  const userDict = getUserCustomDictionary();
  if (userDict.includes(cleaned)) return true;

  // Check Russian & English sets
  if (RUSSIAN_COMMON_WORDS.has(cleaned) || ENGLISH_COMMON_WORDS.has(cleaned)) {
    return true;
  }

  // Common URL, code, prompt tokens e.g. [Entity-1], --ar, 8k, photorealistic
  if (/^(http|https|www|--ar|--v|v\d+|\d+k|\d+p)$/i.test(cleaned)) {
    return true;
  }

  return false;
}

/**
 * Generate intelligent spelling suggestions for a word
 */
export function getSpellingSuggestions(word: string, maxSuggestions: number = 5): {
  isCorrect: boolean;
  suggestions: string[];
  swappedLayoutWord?: string;
} {
  const raw = word.trim();
  const cleaned = raw.toLowerCase().replace(/^[^a-zA-Zа-яА-ЯёЁ0-9]+|[^a-zA-Zа-яА-ЯёЁ0-9]+$/g, '');

  if (!cleaned || cleaned.length <= 1 || /^\d+$/.test(cleaned)) {
    return { isCorrect: true, suggestions: [] };
  }

  if (isWordValid(cleaned)) {
    return { isCorrect: true, suggestions: [] };
  }

  const suggestionsSet = new Set<string>();

  // 1. Direct typo dictionary check (highest precision)
  if (TYPO_TO_CORRECT[cleaned]) {
    TYPO_TO_CORRECT[cleaned].forEach(s => suggestionsSet.add(s));
  }

  // 2. Keyboard layout switch check (e.g. "ghbdtn" -> "привет", "руддщ" -> "hello")
  const { ru: layoutRu, en: layoutEn } = convertKeyboardLayout(raw);
  let swappedLayoutWord: string | undefined = undefined;

  const isLatin = /^[a-zA-Z]+$/.test(cleaned);
  const isCyrillic = /^[а-яА-ЯёЁ]+$/.test(cleaned);

  if (isLatin && layoutRu !== raw) {
    const cleanRu = layoutRu.toLowerCase().replace(/^[^а-яА-ЯёЁ]+|[^а-яА-ЯёЁ]+$/g, '');
    if (RUSSIAN_COMMON_WORDS.has(cleanRu) || TYPO_TO_CORRECT[cleanRu]) {
      swappedLayoutWord = layoutRu;
      suggestionsSet.add(layoutRu);
    }
  } else if (isCyrillic && layoutEn !== raw) {
    const cleanEn = layoutEn.toLowerCase().replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '');
    if (ENGLISH_COMMON_WORDS.has(cleanEn) || TYPO_TO_CORRECT[cleanEn]) {
      swappedLayoutWord = layoutEn;
      suggestionsSet.add(layoutEn);
    }
  }

  // 3. Russian Orthography & Morphology Heuristics
  if (isCyrillic) {
    // жи / ши
    if (/жы|шы/.test(cleaned)) {
      const fixed = cleaned.replace(/жы/g, 'жи').replace(/шы/g, 'ши');
      suggestionsSet.add(fixed);
    }
    // ча / ща
    if (/чя|щя/.test(cleaned)) {
      const fixed = cleaned.replace(/чя/g, 'ча').replace(/щя/g, 'ща');
      suggestionsSet.add(fixed);
    }
    // чу / щу
    if (/чю|щю/.test(cleaned)) {
      const fixed = cleaned.replace(/чю/g, 'чу').replace(/щю/g, 'щу');
      suggestionsSet.add(fixed);
    }
    // -тса / -цца -> -тся / -ться
    if (/(тса|цца|ца)$/.test(cleaned)) {
      suggestionsSet.add(cleaned.replace(/(тса|цца|ца)$/, 'тся'));
      suggestionsSet.add(cleaned.replace(/(тса|цца|ца)$/, 'ться'));
    }
    // prefix з- / с-
    if (/^з[кпстфхцчшщ]/.test(cleaned)) {
      suggestionsSet.add('с' + cleaned.slice(1));
    }
    if (/^с[бвгджз]/.test(cleaned) && cleaned !== 'сделать') {
      suggestionsSet.add('з' + cleaned.slice(1));
    }
  }

  // 4. Fuzzy Levenshtein Distance Search across built-in dictionary + user dictionary
  const userDict = getUserCustomDictionary();
  const allKnownWords = [
    ...Array.from(RUSSIAN_COMMON_WORDS),
    ...Array.from(ENGLISH_COMMON_WORDS),
    ...Object.keys(COMMON_TYPOS_MAP),
    ...userDict
  ];

  const candidates: { word: string; distance: number; score: number }[] = [];

  for (const dictWord of allKnownWords) {
    // Only compare if word length difference <= 2
    if (Math.abs(dictWord.length - cleaned.length) > 2) continue;

    const dist = levenshteinDistance(cleaned, dictWord);
    if (dist <= 2) {
      // Score calculation: lower distance is better, bonus if prefix matches
      let score = dist;
      if (dictWord.startsWith(cleaned[0])) score -= 0.5;
      if (dictWord.length === cleaned.length) score -= 0.2;
      candidates.push({ word: dictWord, distance: dist, score });
    }
  }

  candidates.sort((a, b) => a.score - b.score);
  candidates.slice(0, 8).forEach(c => suggestionsSet.add(c.word));

  // Case matching: If the original word was Capitalized or UPPERCASE, adapt suggestions
  const isAllUpper = raw.length > 1 && raw === raw.toUpperCase() && /[A-ZА-ЯЁ]/.test(raw);
  const isCapitalized = /^[A-ZА-ЯЁ]/.test(raw) && !isAllUpper;

  const formattedSuggestions = Array.from(suggestionsSet).slice(0, maxSuggestions).map(s => {
    if (isAllUpper) return s.toUpperCase();
    if (isCapitalized) return s.charAt(0).toUpperCase() + s.slice(1);
    return s;
  });

  return {
    isCorrect: false,
    suggestions: formattedSuggestions,
    swappedLayoutWord
  };
}

/**
 * AI-powered spelling & grammar correction via Gemini
 */
export async function correctTextWithAI(
  text: string, 
  targetLanguage: string = 'auto',
  instructionMode: 'spelling' | 'enhance' | 'translate_ru' | 'translate_en' = 'spelling'
): Promise<string> {
  const modelName = getModelForMode('flash') || 'gemini-3.8-flash';

  let systemInstruction = '';
  if (instructionMode === 'spelling') {
    systemInstruction = `
      You are an expert spell checker and proofreader.
      Correct all spelling mistakes, typos, keyboard layout errors, punctuation and grammar errors in the provided text.
      STRICT RULES:
      - Preserve the original meaning, tone, format, tags (like [Entity-1], [Character-2]) and punctuation style.
      - Do NOT change technical prompt terms, camera names or custom tokens unless they are obvious typos.
      - Return ONLY the corrected text. No explanations, no markdown formatting blocks, no conversational preamble.
    `;
  } else if (instructionMode === 'enhance') {
    systemInstruction = `
      You are a master creative prompt writer and stylist.
      Refine, polish and elevate the provided prompt or text with rich descriptive adjectives, atmospheric nuances and clarity while preserving core entities.
      Return ONLY the final enhanced text.
    `;
  } else if (instructionMode === 'translate_ru') {
    systemInstruction = `
      You are a high-accuracy translator.
      Translate the input text into natural, accurate Russian.
      Preserve placeholders like [Entity-1].
      Return ONLY the Russian translation.
    `;
  } else if (instructionMode === 'translate_en') {
    systemInstruction = `
      You are a high-accuracy translator.
      Translate the input text into natural, accurate English suitable for AI image generation prompts.
      Preserve placeholders like [Entity-1].
      Return ONLY the English translation.
    `;
  }

  if (isOpenAiTextModel(modelName)) {
    const res = await callOpenAiChatCompletion({
      model: modelName,
      systemInstruction,
      prompt: text
    });
    return res.trim();
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API key is not configured');
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: modelName,
    contents: text,
    config: { systemInstruction }
  });

  return (response.text || '').trim();
}

/**
 * Helper to extract word boundaries around a caret position in an input/textarea
 */
export function getWordAtCaret(
  text: string, 
  caretPos: number
): { word: string; start: number; end: number } {
  if (!text) return { word: '', start: 0, end: 0 };

  const boundedPos = Math.max(0, Math.min(caretPos, text.length));
  
  // Delimiters that separate words
  const isDelimiter = (ch: string) => /[\s,.;:!?'"()[\]{}<>\/\\+=*&^%$#@~`|\n\r\t]/.test(ch);

  // Scan backwards
  let start = boundedPos;
  while (start > 0 && !isDelimiter(text[start - 1])) {
    start--;
  }

  // Scan forwards
  let end = boundedPos;
  while (end < text.length && !isDelimiter(text[end])) {
    end++;
  }

  const word = text.slice(start, end);
  return { word, start, end };
}
