"""Generate editable SVG artwork and the cursor manifest."""

from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent
WHITE = "#f7fdff"
CYAN = "#37e8ff"
DARK = "#0a2034"
items = []


def line(d, accent=False, width=2.7):
    color = CYAN if accent else WHITE
    return (f'<path d="{d}" fill="none" stroke="{DARK}" stroke-width="{width+2.8}" '
            f'stroke-linecap="round" stroke-linejoin="round"/>'
            f'<path d="{d}" fill="none" stroke="#148bcb" stroke-opacity=".5" stroke-width="{width+1.4}" '
            f'stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>'
            f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width}" '
            f'stroke-linecap="round" stroke-linejoin="round"/>')


def fill(d, accent=False):
    color = CYAN if accent else WHITE
    return (f'<path d="{d}" fill="{color}" stroke="{DARK}" stroke-width="2.5" '
            f'stroke-linejoin="round" filter="url(#glow)"/>'
            f'<path d="{d}" fill="{color}" stroke="{DARK}" stroke-width="1.5" stroke-linejoin="round"/>')


def circ(x, y, r, accent=False, solid=False):
    if solid:
        color = CYAN if accent else WHITE
        return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{color}" filter="url(#glow)"/>'
    return line(f'M{x-r} {y}a{r} {r} 0 1 0 {2*r} 0a{r} {r} 0 1 0 -{2*r} 0', accent)


def arrow():
    return fill('M6 3 L7 35 L15 28 L20 41 L26 38 L20 25 L32 23 Z')


def hand(closed=False):
    if closed:
        return line('M12 20 Q11 17 14 16 Q17 15 18 18 L18 12 Q18 9 21 9 Q24 9 24 12 L24 17 L25 12 Q26 9 29 10 Q31 11 30 14 L30 18 L32 15 Q34 13 36 15 Q38 17 36 20 L35 33 Q34 39 28 40 L20 40 Q17 40 15 37 L9 29 Q7 26 10 24 Q12 23 14 25 L18 29')
    return line('M9 24 Q7 21 10 19 Q12 18 14 21 L18 26 L18 7 Q18 4 21 4 Q24 4 24 7 L24 19 L25 14 Q26 11 29 12 Q31 13 30 16 L30 20 L32 16 Q34 14 36 16 Q38 18 36 21 L35 32 Q34 39 29 40 L20 40 Q17 40 15 37 Z')


def plus(x=24, y=24, s=9, accent=False):
    return line(f'M{x-s} {y}H{x+s} M{x} {y-s}V{y+s}', accent)


def minus(x=24, y=24, s=9, accent=False):
    return line(f'M{x-s} {y}H{x+s}', accent)


def badge(x, y, sign):
    return circ(x, y, 8, True, True) + (plus(x, y, 4) if sign == '+' else minus(x, y, 4))


def double_arrow(kind):
    if kind == 'ew':
        return line('M7 24 H41 M7 24 L15 17 M7 24 L15 31 M41 24 L33 17 M41 24 L33 31')
    if kind == 'ns':
        return line('M24 7 V41 M24 7 L17 15 M24 7 L31 15 M24 41 L17 33 M24 41 L31 33')
    if kind == 'nwse':
        return line('M8 8 L40 40 M8 8 L8 18 M8 8 L18 8 M40 40 L30 40 M40 40 L40 30')
    if kind == 'nesw':
        return line('M40 8 L8 40 M40 8 L30 8 M40 8 L40 18 M8 40 L8 30 M8 40 L18 40')


def four_arrows(diagonal=False):
    if diagonal:
        return (line('M17 17 L7 7 M7 7 H14 M7 7 V14 M31 17 L41 7 M41 7 H34 M41 7 V14 '
                     'M17 31 L7 41 M7 41 H14 M7 41 V34 M31 31 L41 41 M41 41 H34 M41 41 V34')
                + circ(24, 24, 2.4, True, True))
    return (line('M24 17 V5 M24 5 L18 11 M24 5 L30 11 M24 31 V43 M24 43 L18 37 M24 43 L30 37 '
                 'M17 24 H5 M5 24 L11 18 M5 24 L11 30 M31 24 H43 M43 24 L37 18 M43 24 L37 30')
            + circ(24, 24, 2.5, True, True))


def add(name, label, art, hotspot=(24, 24), fallback='auto'):
    items.append(dict(name=name, label=label, art=art, hotspot=hotspot, fallback=fallback))


# Basic system and editor cursors.
add('default-select', 'Default Select', arrow(), (6, 3))
add('pointer-link', 'Pointer (Link)', hand(), (21, 5), 'pointer')
add('help-select', 'Help Select', arrow() + line('M33 8 Q33 3 38 3 Q43 3 43 8 Q43 11 39 14 L39 17', True, 2.3) + circ(39, 22, 1.7, True, True), (6, 3), 'help')
spinner = ''.join(circ(x, y, 2.2, True, True) for x, y in [(24, 6), (34, 9), (40, 18), (39, 29), (31, 39), (20, 41), (10, 35), (7, 24), (11, 13)])
add('working', 'Working (Load)', spinner, fallback='progress')
add('busy', 'Busy (Alternative)', spinner + circ(24, 24, 3, True, True), fallback='wait')
add('wait', 'Wait', line('M9 5 H39 M9 43 H39 M14 8 Q14 18 24 24 Q34 18 34 8 M14 40 Q14 30 24 24 Q34 30 34 40') + fill('M17 35 Q18 30 24 27 Q30 30 31 35 Z', True), fallback='wait')
add('crosshair', 'Crosshair', line('M24 5 V17 M24 31 V43 M5 24 H17 M31 24 H43') + circ(24, 24, 2, True, True), fallback='crosshair')
add('text-select', 'Text Select', line('M15 5 H33 M24 5 V43 M15 43 H33 M17 7 Q24 10 31 7 M17 41 Q24 38 31 41'), fallback='text')
add('pen', 'Pen', line('M9 35 L13 26 L32 7 Q34 5 36 7 L41 12 Q43 14 41 16 L22 35 L13 39 Z M28 11 L37 20') + fill('M9 35 L13 39 L7 41 Z', True), (8, 40), 'crosshair')
add('eraser', 'Eraser', line('M9 27 L28 8 Q30 6 33 9 L41 17 Q43 19 40 22 L23 39 H17 L8 30 Q7 29 9 27 Z M17 39 L31 25') + line('M27 40 H41', True), (10, 30))
add('eyedropper', 'Eyedropper', line('M12 35 L30 17 M11 34 L8 40 L14 38 L33 19 M26 13 L35 22') + fill('M31 17 Q35 8 40 9 Q44 10 43 14 Q42 18 36 22 Z', True), (8, 40), 'crosshair')
add('zoom-in', 'Zoom In', circ(21, 20, 13) + line('M31 30 L43 42') + plus(21, 20, 6), (21, 20), 'zoom-in')
add('zoom-out', 'Zoom Out', circ(21, 20, 13) + line('M31 30 L43 42') + minus(21, 20, 6), (21, 20), 'zoom-out')

# Movement, resize and scrolling.
add('move', 'Move (All Directions)', four_arrows(), fallback='move')
add('resize-horizontal', 'Resize Horizontal', double_arrow('ew'), fallback='ew-resize')
add('resize-vertical', 'Resize Vertical', double_arrow('ns'), fallback='ns-resize')
add('resize-diagonal-nwse', 'Resize Diagonal 1 (NW-SE)', double_arrow('nwse'), fallback='nwse-resize')
add('resize-diagonal-nesw', 'Resize Diagonal 2 (NE-SW)', double_arrow('nesw'), fallback='nesw-resize')
add('resize-all', 'Resize All', four_arrows(True), fallback='all-scroll')
add('resize-column', 'Resize Column', line('M24 7 V41 M7 24 H16 M7 24 L13 18 M7 24 L13 30 M41 24 H32 M41 24 L35 18 M41 24 L35 30'), fallback='col-resize')
add('resize-row', 'Resize Row', line('M7 24 H41 M24 7 V16 M24 7 L18 13 M24 7 L30 13 M24 41 V32 M24 41 L18 35 M24 41 L30 35'), fallback='row-resize')
add('scroll-up', 'Scroll Up', line('M24 38 V9 M24 9 L16 18 M24 9 L32 18'), fallback='n-resize')
add('scroll-down', 'Scroll Down', line('M24 10 V39 M24 39 L16 30 M24 39 L32 30'), fallback='s-resize')
add('scroll-left', 'Scroll Left', line('M38 24 H9 M9 24 L18 16 M9 24 L18 32'), fallback='w-resize')
add('scroll-right', 'Scroll Right', line('M10 24 H39 M39 24 L30 16 M39 24 L30 32'), fallback='e-resize')
add('scroll-all', 'Scroll All Directions', four_arrows(), fallback='all-scroll')

# Actions and gestures.
add('add-create', 'Add / Create', arrow() + badge(36, 36, '+'), (6, 3), 'copy')
add('remove-delete', 'Remove / Delete', arrow() + badge(36, 36, '-'), (6, 3), 'no-drop')
prohibited = circ(24, 24, 16) + line('M12 12 L36 36', True, 4)
add('not-allowed', 'Not Allowed', prohibited, fallback='not-allowed')
add('unavailable', 'Unavailable', circ(24, 24, 16, True) + line('M10 10 L38 38', False, 4), fallback='not-allowed')
add('working-background', 'Working in Background', arrow() + fill('M37 5 L39 11 L44 13 L39 15 L37 21 L35 15 L30 13 L35 11 Z', True), (6, 3), 'progress')
add('precise-select', 'Precise Select', arrow() + circ(37, 36, 7, True) + circ(37, 36, 2, True, True), (6, 3), 'crosshair')
add('grab', 'Grab', hand() + circ(21, 6, 5), (21, 6), 'grab')
add('grabbing', 'Grabbing', hand(True), (21, 10), 'grabbing')
add('pinch-gesture', 'Pinch / Gesture', double_arrow('nesw'), fallback='zoom-in')
add('rotate', 'Rotate', line('M35 12 A17 17 0 0 0 10 34 M10 34 L10 25 M10 34 L18 32 M13 37 A17 17 0 0 0 39 15 M39 15 L30 15 M39 15 L37 24'), fallback='alias')
add('rotate-clockwise', 'Rotate Clockwise', line('M10 26 A16 16 0 1 1 25 40 M10 26 L5 20 M10 26 L16 21'), fallback='alias')
add('rotate-counterclockwise', 'Rotate Counterclockwise', line('M38 26 A16 16 0 1 0 23 40 M38 26 L43 20 M38 26 L32 21'), fallback='alias')
add('open-in-new', 'Open in New', line('M25 8 H39 V22 M39 8 L22 25 M34 29 V38 H9 V13 H18'), (39, 8), 'alias')

# Prompt Modifier canvas and node tools.
add('link', 'Link', line('M19 29 L28 20 M15 21 L10 26 Q5 31 10 36 Q15 41 20 36 L25 31 M23 17 L28 12 Q33 7 38 12 Q43 17 38 22 L33 27'), fallback='alias')
add('broken-link', 'Broken Link', line('M9 34 L15 28 M20 20 L26 14 M27 34 L34 27 M33 16 L39 10 M7 9 L13 15 M35 35 L41 41', True), fallback='no-drop')
add('text-resize-horizontal', 'Text Resize Horizontal', line('M24 7 V41 M18 7 H30 M18 41 H30 M6 24 H17 M6 24 L12 18 M6 24 L12 30 M42 24 H31 M42 24 L36 18 M42 24 L36 30'), fallback='ew-resize')
add('text-resize-vertical', 'Text Resize Vertical', line('M9 24 H39 M24 7 V17 M24 7 L18 13 M24 7 L30 13 M24 41 V31 M24 41 L18 35 M24 41 L30 35'), fallback='ns-resize')
add('draw-paint', 'Draw / Paint', line('M8 39 Q14 32 17 25 L30 7 Q32 4 35 7 Q37 9 35 12 L23 28 M13 32 Q22 33 22 37 Q14 41 8 39 Z M22 29 Q30 33 38 31 L41 38 Q30 43 20 38'), (9, 39), 'crosshair')
color_dots = ''.join(circ(x, y, 4, True if i < 3 else False) for i, (x, y) in enumerate([(14, 14), (34, 14), (14, 34), (34, 34)]))
add('color-pick', 'Color Pick', color_dots + circ(34, 34, 2, True, True), fallback='crosshair')
add('node-add', 'Node Add', line('M11 11 H37 V37 H11 Z', True, 1.8) + fill('M8 8 H14 V14 H8 Z', True) + fill('M34 34 H40 V40 H34 Z', True) + plus(24, 24, 6), fallback='copy')
add('node-remove', 'Node Remove', line('M11 11 H37 V37 H11 Z', True, 1.8) + fill('M8 8 H14 V14 H8 Z', True) + fill('M34 34 H40 V40 H34 Z', True) + minus(24, 24, 6), fallback='no-drop')
add('box-select', 'Box Select', line('M9 9 H39 V39 H9 Z', False, 2), fallback='crosshair')
add('lasso-select', 'Lasso Select', line('M13 32 C3 24 9 8 24 8 C39 8 43 22 35 29 C29 34 20 28 16 38 L21 43', False, 2), fallback='crosshair')
add('crop', 'Crop', line('M16 6 V32 H42 M6 16 H32 V42 M16 16 H32 V32'), fallback='crosshair')
add('no-drop', 'No Drop', prohibited, fallback='no-drop')

assert len(items) == 51, len(items)
manifest = {'size': [48, 48], 'format': ['svg', 'png'], 'cursors': []}
for item in items:
    name = item['name']
    body = item['art']
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">'
           '<defs><filter id="glow" x="-35%" y="-35%" width="170%" height="170%">'
           '<feGaussianBlur stdDeviation="1.35"/></filter></defs>' + body + '</svg>')
    (ROOT / f'{name}.svg').write_text(svg, encoding='utf-8')
    manifest['cursors'].append({k: item[k] for k in ('name', 'label', 'hotspot', 'fallback')})

(ROOT / 'cursors.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(f'Generated {len(items)} SVG files and cursors.json')
