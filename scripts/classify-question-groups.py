from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / 'dist' / 'assets' / 'questions.json'
payload = json.loads(DATA_PATH.read_text())


def trailing_number(item_id):
    match = re.search(r'(\d+)$', item_id)
    return int(match.group(1)) if match else 0


for item in payload['items']:
    category = item['category']
    if category == 'object':
        item['gameGroup'] = 'object'
    elif category == 'character':
        item['gameGroup'] = 'character'
    elif category == 'history':
        item['gameGroup'] = 'korean' if trailing_number(item['id']) <= 10 else 'global'
    elif category == 'celebrity':
        is_global = item['id'].startswith('celebrity-hard-') and trailing_number(item['id']) >= 17
        item['gameGroup'] = 'global' if is_global else 'korean'
    elif category == 'person':
        item['gameGroup'] = 'korean' if trailing_number(item['id']) <= 124 else 'global'
    else:
        raise ValueError(f"분류할 수 없는 category: {category}")

DATA_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2))
counts = {}
for item in payload['items']:
    counts[item['gameGroup']] = counts.get(item['gameGroup'], 0) + 1
print(counts)
