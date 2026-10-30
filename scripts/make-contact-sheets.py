from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import json
import math

ROOT = Path(__file__).resolve().parents[1]
FONT = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 18)
DATA = json.loads((ROOT / 'dist' / 'assets' / 'questions.json').read_text())
OUT = ROOT / 'review-sheets'
OUT.mkdir(exist_ok=True)

for old in OUT.glob('v3-*.jpg'):
    old.unlink()

groups = {
    'person': [item for item in DATA['items'] if item['category'] == 'person' and '-v3-' in item['id']],
    'object': [item for item in DATA['items'] if item['category'] == 'object' and '-v3-' in item['id']],
    'character': [item for item in DATA['items'] if item['category'] == 'character'],
}

page_size = 30
cell_w, cell_h, columns = 280, 250, 5
rows = math.ceil(page_size / columns)

for group, items in groups.items():
    for page_index in range(math.ceil(len(items) / page_size)):
        page = items[page_index * page_size:(page_index + 1) * page_size]
        sheet = Image.new('RGB', (cell_w * columns, cell_h * rows), '#17142a')
        draw = ImageDraw.Draw(sheet)
        for index, item in enumerate(page):
            file = ROOT / 'dist' / item['image'].removeprefix('./')
            try:
                with Image.open(file) as source:
                    source.seek(0)
                    source = ImageOps.exif_transpose(source).convert('RGB')
                    source.thumbnail((cell_w - 16, cell_h - 54))
                    x = (index % columns) * cell_w + (cell_w - source.width) // 2
                    y = (index // columns) * cell_h + 6
                    sheet.paste(source, (x, y))
            except Exception as error:
                x = (index % columns) * cell_w + 14
                y = (index // columns) * cell_h + 80
                draw.text((x, y), f'열기 실패: {error}', fill='#ff8e8e', font=FONT)
            label = f"{item['id']} · {item['answer']}"
            x = (index % columns) * cell_w + 8
            y = (index // columns) * cell_h + cell_h - 42
            draw.rectangle((x - 3, y - 3, x + cell_w - 14, y + 31), fill='#17142a')
            draw.text((x, y), label, fill='white', font=FONT)
        output = OUT / f'v3-{group}-{page_index + 1:02d}.jpg'
        sheet.save(output, quality=90)
        print(output)
