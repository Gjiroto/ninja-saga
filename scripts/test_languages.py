"""Pruebas de idioma, persistencia, inicio, comparador y textos guardados."""
import json
import os
import re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[1]
url = os.environ.get('CODEX_TEST_URL', 'http://127.0.0.1:8000/ninja-saga/')
out = root / 'test-results'
out.mkdir(exist_ok=True)
translations = json.loads((root / 'data/translations.json').read_text(encoding='utf-8'))
for filename in ['talents', 'jutsus', 'pets', 'ninjutsu']:
    data = json.loads((root / f'data/{filename}.json').read_text(encoding='utf-8'))
    def validate(node):
        if isinstance(node, dict):
            for key, value in node.items():
                if key in ['desc','req','notes','source','description','obtained_by'] and isinstance(value,str) and value:
                    assert value in translations, (filename,key,value)
                    assert translations[value]['es'] and translations[value]['en']
                    assert re.findall(r'\d+(?:[.,]\d+)?',value)==re.findall(r'\d+(?:[.,]\d+)?',translations[value]['es'])
                    assert re.findall(r'\d+(?:[.,]\d+)?',value)==re.findall(r'\d+(?:[.,]\d+)?',translations[value]['en'])
                validate(value)
        elif isinstance(node,list):
            for value in node: validate(value)
    validate(data)

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width':1440,'height':1000})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(url)
    expect(page.locator('#language-welcome')).to_be_visible()
    page.locator('#language-welcome [data-lang="en"]').click()
    expect(page.locator('html')).to_have_attribute('lang','en')
    expect(page.locator('#home h1')).to_have_text('Your ninja archive')
    expect(page.locator('#home-categories button')).to_have_count(6)
    page.screenshot(path=str(out/'home-en.png'))
    page.reload()
    expect(page.locator('#language-welcome')).not_to_be_visible()
    expect(page.locator('html')).to_have_attribute('lang','en')
    page.locator('#global-search').fill('Divine Wolf')
    expect(page.locator('#global-results .card')).to_have_count(1)
    page.locator('#global-results [data-detail]').click()
    expect(page.locator('#detail-content')).to_contain_text('Increase master accuracy by 100%')
    page.locator('#detail [data-lang="es"]').click()
    expect(page.locator('#detail')).to_be_visible()
    expect(page.locator('#detail-content .skill')).to_have_count(6)
    expect(page.locator('#detail-content')).to_contain_text('Ver texto original')
    page.keyboard.press('Escape')
    expect(page.locator('#global-search')).to_have_value('Divine Wolf')
    page.locator('#categories [data-category="extreme"]').click()
    page.locator('#search').fill('Sharingan')
    page.locator('#grid [data-compare]').nth(0).click()
    page.locator('#grid [data-compare]').nth(1).click()
    page.locator('#effect').select_option('accuracy')
    page.locator('#sort').select_option('name')
    page.locator('.topbar [data-lang="en"]').click()
    expect(page.locator('#search')).to_have_value('Sharingan')
    expect(page.locator('#effect')).to_have_value('accuracy')
    expect(page.locator('#sort')).to_have_value('name')
    expect(page.locator('#selected button')).to_have_count(2)
    page.locator('#open-compare').click()
    expect(page.locator('#comparison')).to_contain_text('Passives')
    page.locator('#comparison [data-lang="es"]').click()
    expect(page.locator('#comparison')).to_contain_text('Pasivas')
    expect(page.locator('#comparison .original-text')).not_to_have_count(0)
    page.screenshot(path=str(out/'comparison-es.png'))
    page.keyboard.press('Escape')
    page.locator('#categories [data-category="home"]').click()
    page.locator('#global-search').fill('')
    page.screenshot(path=str(out/'home-es.png'))
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=str(out/'home-mobile.png'),full_page=True)
    page.locator('.topbar [data-lang="en"]').click()
    expect(page.locator('#home h1')).to_have_text('Your ninja archive')
    # Saved choice and direct category links are preserved.
    page.goto(url+'#pet')
    expect(page.locator('#grid .card')).to_have_count(3)
    page.locator('#search').fill('Easter')
    page.locator('#grid [data-detail]').click()
    expect(page.locator('#detail-content')).to_contain_text('No data')
    expect(page.locator('#detail-content')).to_contain_text('Five Tag Infinity')
    page.keyboard.press('Escape')
    # No storage: choose a language, use the app, and receive a clear notice.
    isolated = browser.new_context()
    isolated.add_init_script("Object.defineProperty(window, 'localStorage', {get(){throw new Error('blocked')}})")
    blocked = isolated.new_page()
    blocked.goto(url+'#jutsu')
    blocked.locator('#language-welcome [data-lang="en"]').click()
    expect(blocked.locator('#grid .card')).to_have_count(74)
    expect(blocked.locator('#toast')).to_contain_text('cannot save')
    assert not errors,errors
    browser.close()
print('OK: traducciones, cifras, ES/EN, persistencia, busqueda global, dialogos, estado conservado, enlaces, movil y almacenamiento bloqueado.')
