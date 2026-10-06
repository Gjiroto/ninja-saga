"""Extrae solo List of Ninjutsu (no iOS). Requiere beautifulsoup4.
Cachea HTML e imagenes; no reemplaza jutsus de capturas por versiones de la wiki.
"""
import concurrent.futures
import csv
import hashlib
import json
from pathlib import Path
import time
import urllib.parse
import urllib.request
import urllib.error
import shutil
from datetime import datetime, timezone
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'data'
CACHE=ROOT/'scripts/.cache/ninjutsu'
CACHE.mkdir(parents=True,exist_ok=True)
BASE='https://ninjasaga.fandom.com'
SOURCE=BASE+'/wiki/Ninjutsu'
def fetch(url):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=30) as r:
                return r.read()
        except Exception as error:
            if isinstance(error,urllib.error.HTTPError) and error.code==403: raise
            if attempt==2: raise
            time.sleep(attempt+1)

def page(title):
    cache=CACHE/(hashlib.sha256(title.encode()).hexdigest()+'.html')
    if not cache.exists():
        data=json.loads(fetch(BASE+'/api.php?'+urllib.parse.urlencode({'action':'parse','page':title,'prop':'text','format':'json'})))
        cache.write_text(data['parse']['text']['*'],encoding='utf-8')
    return BeautifulSoup(cache.read_text(encoding='utf-8'),'html.parser')

def clean(cell):
    for br in cell.find_all('br'): br.replace_with(' / ')
    return cell.get_text(' ',strip=True) or None

def main():
    soup=page('Ninjutsu')
    start=soup.find(id='List_of_Ninjutsu')
    assert start, 'Falta encabezado principal; no exportar una lista equivocada.'
    tables=[]
    end=None
    for node in start.find_parent('h2').find_next_siblings():
        if node.name=='h2':
            end=node.get_text(' ',strip=True)
            break
        if node.name=='table' and 'wikitable' in node.get('class',[]): tables.append(node)
    assert end and 'iOS' in end and len(tables)==10,(end,len(tables))
    records=[]
    for table in tables:
        group=table.caption.get_text(' ',strip=True)
        element=group.replace('Event ','').split()[0]
        assert element in ['Wind','Fire','Thunder','Earth','Water']
        for row_index,row in enumerate(table.select('tr')[1:],1):
            cells=row.find_all(['td','th'],recursive=False)
            assert len(cells) in (7,8),(group,len(cells))
            link=cells[0].find('a',href=True)
            name=clean(cells[0])
            item_id='wiki-'+hashlib.sha256((group+'|'+name+'|'+str(row_index)).encode()).hexdigest()[:12]
            records.append({'id':item_id,'name':name,'level':clean(cells[1]),'damage':clean(cells[2]),
                'cd':clean(cells[3]),'cp':clean(cells[4]),'desc':clean(cells[5]),
                'description_highlights':[b.get_text(' ',strip=True) for b in cells[5].find_all(['b','strong'])],
                'element':element,'collection':'fandom_ninjutsu','table':group,
                'gold':clean(cells[6]) if len(cells)==8 else None,
                'tokens':clean(cells[7]) if len(cells)==8 else None,
                'obtained_by':clean(cells[6]) if len(cells)==7 else None,
                'reference_url':urllib.parse.urljoin(BASE,link['href']) if link else SOURCE,
                'source':'Ninja Saga Wiki (Fandom), Lista principal de Ninjutsu. Version historica; no confirma los valores del servidor actual. Se excluye iOS.',
                'verification_status':'pendiente_verificacion_en_juego','image':None})
    assert len({r['id'] for r in records})==len(records)
    # Guardar datos antes de buscar imagenes; se pueden traducir mientras se descargan.
    def save():
        (OUT/'ninjutsu.json').write_text(json.dumps({'jutsus':records},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    save()
    def image_for(item):
        target=ROOT/'assets/ninjutsu'/(item['id']+'.png')
        target.parent.mkdir(parents=True,exist_ok=True)
        try:
            title=urllib.parse.unquote(item['reference_url'].split('/wiki/')[-1]).replace('_',' ')
            detail=page(title)
            image=detail.select_one('table.infobox img') or detail.select_one('table img')
            if image is None: return item['name']+': sin icono en infobox'
            url=image.get('data-src') or image.get('src')
            if not url or not url.startswith('https://static.wikia.nocookie.net/'): return item['name']+': URL de imagen no disponible'
            item['image_source']=url
            if not target.exists(): target.write_bytes(fetch(url))
            item['image']='ninjutsu/'+target.name
            item['image_source']=url
        except Exception as e: return item['name']+': '+str(e)
    errors=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for index,result in enumerate(pool.map(image_for,records),1):
            if result: errors.append(result)
            if index%40==0: print(f'Imagenes {index}/{len(records)}',flush=True)
    save()
    with (OUT/'ninjutsu.csv').open('w',encoding='utf-8-sig',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=list(dict.fromkeys(k for r in records for k in r)))
        writer.writeheader()
        writer.writerows({k:json.dumps(v,ensure_ascii=False) if isinstance(v,list) else v for k,v in r.items()} for r in records)
    summary={'source':SOURCE,'section':'List of Ninjutsu','excluded_section':end,'retrieved_at':datetime.now(timezone.utc).isoformat(),'tables':len(tables),'records':len(records),'images':sum(bool(r['image']) for r in records),'image_errors':errors}
    (OUT/'ninjutsu-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
    exports=ROOT.parent/'datos_ninjutsu'
    exports.mkdir(exist_ok=True)
    for original,name in [('ninjutsu.json','catalogo.json'),('ninjutsu.csv','habilidades.csv'),('ninjutsu-summary.json','resumen.json')]:
        shutil.copy2(OUT/original,exports/name)
    (OUT/'assets.json').write_text(json.dumps([p.relative_to(ROOT).as_posix() for p in (ROOT/'assets').rglob('*') if p.is_file()],ensure_ascii=False),encoding='utf-8')
    print(json.dumps(summary,ensure_ascii=False,indent=2))

if __name__=='__main__': main()
