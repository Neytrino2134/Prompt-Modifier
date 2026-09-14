# Prompt Modifier Cursor Set

Набор из 51 курсора по образцу `Cursor_Style.png`. Каждый курсор доступен как редактируемый SVG и как PNG 48×48 с прозрачным фоном. Для Electron/Chromium рекомендуется PNG; SVG удобно использовать для изменения рисунка. `cursor-preview.png` показывает весь набор.

Файл `cursors.json` содержит имена, координаты активной точки (`hotspot`) и стандартный CSS-курсор на случай, если изображение не загрузится. Координаты указаны в пикселях относительно левого верхнего угла изображения 48×48.

Пример для Vite + TypeScript (код приложения не изменён):

```ts
import selectCursor from './CursorStyle/default-select.png';
import linkCursor from './CursorStyle/pointer-link.png';

const selectStyle = { cursor: `url("${selectCursor}") 6 3, auto` };
const linkStyle = { cursor: `url("${linkCursor}") 21 5, pointer` };
```

Можно также перенести выбранные файлы в `public` и ссылаться на них по абсолютному URL. При подключении сохраняйте координаты из `cursors.json`: например, у стрелки активна вершина, а у прицела центр. На сенсорных устройствах курсор может не отображаться.

`generate_cursors.py` служит исходником для повторной генерации SVG и `cursors.json`. PNG в этом наборе уже экспортированы из SVG; повторный экспорт можно сделать любым SVG-рендерером с сохранением прозрачности и размером 48×48.
