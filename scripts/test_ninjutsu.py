"""Checks the wiki collection, provenance, images, filters and comparison."""
import json, os
from pathlib import Path
from collections import Counter
from playwright.sync_api import sync_playwright, expect

root=Path(__file__).resolve().parents[1]
data=json.loads((root/'data/ninjutsu.json').read_text(encoding='utf-8'))['jutsus']
assert len(data)==311 and len({i['id'] for i in data})==311
assert Counter(i['element'] for i in data)=={'Wind':62,'Fire':61,'Thunder':59,'Earth':59,'Water':70}
assert sum(i['name']=='Summoning: Flaming Smash' for i in data)==2
summary=json.loads((root/'data/ninjutsu-summary.json').read_text(encoding='utf-8'))
assert summary['tables']==10 and 'iOS' in summary['excluded_section']
assert all(i['reference_url'].startswith('https://ninjasaga.fandom.com/wiki/') for i in data)
for item in data:
    if item['image']:
        from PIL import Image
        with Image.open(root/'assets'/item['image']) as image: image.verify()
with sync_playwright() as p:
    browser=p.chromium.launch()
    page=browser.new_page(viewport={'width':390,'height':844})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(os.environ.get('CODEX_TEST_URL','http://127.0.0.1:8000/ninja-saga/')+'#ninjutsu')
    page.locator('#language-welcome [data-lang="en"]').click()
    expect(page.locator('#grid .card')).to_have_count(311)
    page.locator('#element').select_option('Water')
    expect(page.locator('#grid .card')).to_have_count(70)
    page.locator('.topbar [data-lang="es"]').click()
    expect(page.locator('#element')).to_have_value('Water')
    page.locator('#grid [data-compare]').nth(0).click()
    page.locator('#grid [data-compare]').nth(1).click()
    page.locator('#open-compare').click()
    expect(page.locator('#comparison')).to_contain_text('Descripción')
    page.keyboard.press('Escape')
    page.locator('#grid [data-detail]').first.click()
    expect(page.locator('#detail-content')).to_contain_text('Elemento')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert not errors,errors
    browser.close()
print('OK: 311 wiki records, source boundary excludes iOS, variants, filters, comparison, language and mobile.')
