"""Genera traducciones estaticas; no se llama desde el navegador del visitante.

Traduccion automatica de textos publicos del catalogo con Google Translate.
Mantiene originales, cache y revision de cifras. No traduce nombres del juego.
"""
import concurrent.futures
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
output = ROOT / 'data/translations.json'
entries = {}
def add(text, language):
    if text:
        entries[text] = language

for filename in ['talents', 'jutsus', 'pets', 'ninjutsu']:
    data = json.loads((ROOT / f'data/{filename}.json').read_text(encoding='utf-8'))
    groups = data.values() if filename == 'talents' else [data['pets' if filename == 'pets' else 'jutsus']]
    for group in groups:
        for item in group:
            language = item.get('source_language', 'es' if filename == 'pets' and item['name'] != 'Divine Wolf' else 'en')
            add(item.get('desc'), language)
            add(item.get('req'), 'en')
            add(item.get('obtained_by'), 'en')
            for skill in item.get('skills', []):
                add(skill.get('desc'), skill.get('source_language',language))
                add(skill.get('notes'), 'es')
            for key in ['notes', 'source']:
                add(item.get(key), 'es')
            add(item.get('attachment_source', {}).get('description'), 'es')

cache = json.loads(output.read_text(encoding='utf-8')) if output.exists() else {}
def translate(pair):
    original, source = pair
    target = 'en' if source == 'es' else 'es'
    if original in cache and target in cache[original]:
        return original, cache[original]
    url = 'https://translate.googleapis.com/translate_a/single?' + urllib.parse.urlencode(
        {'client':'gtx','sl':source,'tl':target,'dt':'t','q':original})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(url, timeout=30) as response:
                result = json.load(response)
            translated = ''.join(part[0] for part in result[0] if part[0])
            nums = lambda s: re.findall(r'\d+(?:[.,]\d+)?', s)
            return original, {source: original, target: translated,
                              'method':'machine', 'numbers_match': nums(original)==nums(translated)}
        except Exception:
            if attempt == 3:
                raise
            time.sleep(attempt + 1)

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    for index, (original, result) in enumerate(pool.map(translate, entries.items()), 1):
        cache[original] = result
        if index % 20 == 0:
            output.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding='utf-8')
            print(f'{index}/{len(entries)}', flush=True)
output.write_text(json.dumps(cache, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print('Complete:', len(cache))
for original, value in cache.items():
    if not value.get('numbers_match', True):
        print('REVIEW:', original, '=>', value)
