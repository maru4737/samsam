from pathlib import Path
from PIL import Image, ImageOps
import json

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / 'dist' / 'assets' / 'questions.json'
payload = json.loads(DATA_PATH.read_text())
converted = 0

for item in payload['items']:
    source = ROOT / 'dist' / item['image'].removeprefix('./')
    if source.suffix.lower() in {'.svg', '.webp'}:
        continue
    target = source.with_suffix('.webp')
    with Image.open(source) as image:
        image.seek(0)
        image = ImageOps.exif_transpose(image)
        if image.mode not in {'RGB', 'RGBA'}:
            image = image.convert('RGBA' if 'transparency' in image.info else 'RGB')
        image.thumbnail((900, 900), Image.Resampling.LANCZOS)
        image.save(target, 'WEBP', quality=82, method=6)
    source.unlink()
    item['image'] = './' + target.relative_to(ROOT / 'dist').as_posix()
    converted += 1

DATA_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2))
print(f'{converted}개 이미지를 WebP로 최적화했습니다.')
