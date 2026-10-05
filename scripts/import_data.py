"""Importa los catalogos vecinos y sus imagenes. Solo biblioteca estandar."""
import concurrent.futures
import json
from pathlib import Path
import shutil
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent
DATA = ROOT / 'data'
DATA.mkdir(exist_ok=True)
for folder, name in [('datos_nso', 'talents'), ('datos_jutsus', 'jutsus'), ('datos_mascotas', 'pets')]:
    shutil.copy2(SOURCE / folder / 'catalogo.json', DATA / (name + '.json'))

talents = json.loads((DATA / 'talents.json').read_text(encoding='utf-8'))
jutsus = json.loads((DATA / 'jutsus.json').read_text(encoding='utf-8'))['jutsus']
for item in jutsus:
    path = item.get('image')
    if path:
        target = ROOT / 'assets' / path
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(SOURCE / path, target)

paths = {t[key] for group in talents.values() for t in group for key in ('image', 'thumb') if t.get(key)}
def download(path):
    target = ROOT / 'assets' / path
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        return
    try:
        with urllib.request.urlopen('https://f701-math.github.io/nso/' + path, timeout=30) as response:
            target.write_bytes(response.read())
    except Exception as error:
        return f'{path}: {error}'

with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    errors = [error for error in pool.map(download, sorted(paths)) if error]
print(json.dumps({'talents': sum(map(len, talents.values())), 'jutsus': len(jutsus), 'image_errors': errors}, indent=2))
(DATA / 'assets.json').write_text(json.dumps([p.relative_to(ROOT).as_posix() for p in (ROOT / 'assets').rglob('*') if p.is_file()], ensure_ascii=False), encoding='utf-8')
