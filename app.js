'use strict';
const $ = id => document.getElementById(id);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const CATEGORIES = {
  extreme: {name:'Talentos extremos',short:'Extremos',symbol:'◈',description:'Pasivas y técnicas que definen tu personaje.'},
  secret: {name:'Talentos secretos',short:'Secretos',symbol:'◇',description:'Efectos y habilidades para complementar tu estrategia.'},
  senjutsu: {name:'Sage Modes',short:'Sage Modes',symbol:'☯',description:'Explora las transformaciones y sus habilidades de senjutsu.'},
  jutsu: {name:'Jutsus',short:'Jutsus',symbol:'ϟ',description:'Tu arsenal de ataques, defensas y técnicas de apoyo.'},
  pet: {name:'Mascotas',short:'Mascotas',symbol:'✧',description:'Compañeros de batalla y habilidades de apoyo al maestro.'}
};
// Etiquetas de búsqueda derivadas del texto, no cálculos de mecánicas.
const EFFECTS = [
  ['accuracy','Precisión',/accuracy|precision/],['dodge','Evasión',/dodge|evasion/],
  ['agility','Agilidad',/agility|agilidad|slow/],['critical','Crítico',/critical|critico|\bcrit\b/],
  ['purify','Purificación / limpieza',/purif|cleanse|clear all debuffs|remove all (negative|debuff)|elimina.*estados/],
  ['stun','Stun / aturdimiento',/stun|aturd/],['burn','Quemadura / Blaze',/burn|blaze|quem|scorch/],
  ['heal','Recuperación',/heal|regen|recover|lifesteal|cura|recuper/],
  ['shield','Protección',/protect|shield|resist|reduce.*damage taken|reduces incoming damage|escudo|proteccion/],
  ['disperse','Dispersión',/disperse|remove.*(positive|buff)|dispers/],
  ['restrict','Restriction',/restrict|cannot use|no puede.*jutsu/],['chaos','Chaos',/chaos/],
  ['bleed','Bleeding',/bleed/],['injury','Internal Injury',/internal injury/],
  ['poison','Veneno',/poison|veneno/],['drain','Drenaje',/drain|drena/],
  ['all','Todos los enemigos',/all (enem|target)|todos (los|sus)|a todos/],
  ['cooldown','Manipula cooldowns',/cooldown/]
];
let items = [], assetPaths = new Set(), category = 'extreme', selection = [], toastTimer;
function skills(item){return item.category === 'jutsu' ? [item] : item.skills || [];}
function passive(skill){return /\(passive(?: skill)?\)/i.test(skill.desc || '');}
function fullText(item){return [item.name,item.desc,...skills(item).map(s=>s.name+' '+s.desc)].join(' ');}
function tags(item){const text=normalize(fullText(item));return EFFECTS.filter(([key, ,regex])=>{const searchable=key==='heal'?text.replace(/[^.!?]*(?:cannot|can't|not allowed to|no puede)\s+(?:be\s+)?(?:heal|recover|curar)[^.!?]*/g,''):text;return regex.test(searchable);});}
function uncertain(item){return item.verification_status === 'pendiente_verificacion_en_juego' || (item.status && item.status !== 'completo');}
function value(v){return v === null || v === undefined || v === '' ? 'Sin dato' : escapeHTML(v);}
function asset(path){if(!path)return '';const local='assets/'+path;return assetPaths.has(local)?'./'+local:'';}
function initials(name){return name.replace(/^Kinjutsu:\s*/,'').split(/\s+/).slice(0,2).map(x=>x[0]).join('');}
function portrait(item){const src=asset(item.thumb)||asset(item.image);return src?`<img class="portrait ${item.category==='jutsu'?'capture':''}" src="${escapeHTML(src)}" alt="" loading="lazy">`:`<span class="portrait placeholder" aria-hidden="true">${escapeHTML(initials(item.name))}</span>`;}
function metrics(skill){return `<div class="metrics">${[['level','Nivel'],['damage','Daño'],['sp' in skill?'sp':'cp','sp' in skill?'SP':'CP'],['cd','CD']].filter(([key])=>key!=='level'||'level' in skill).map(([key,label])=>`<span class="metric">${label}<b>${value(skill[key])}</b></span>`).join('')}</div>`;}
function notify(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4200);}
function renderNav(){ $('categories').innerHTML=Object.entries(CATEGORIES).map(([key,c])=>`<button data-category="${key}" class="${category===key?'active':''}" ${category===key?'aria-current="page"':''}><span class="nav-symbol" aria-hidden="true">${c.symbol}</span>${c.short}<span class="nav-count">${items.filter(i=>i.category===key).length}</span></button>`).join(''); }
function setCategory(key){if(!CATEGORIES[key])key='extreme';if(category!==key&&selection.length){selection=[];notify('La selección se vació al cambiar de categoría.');}category=key;resetFilters(false);renderNav();$('heading').textContent=CATEGORIES[key].name;$('category-description').textContent=CATEGORIES[key].description;document.querySelector('.index-mark').innerHTML=`0${Object.keys(CATEGORIES).indexOf(key)+1}<span>CODEX / NS</span>`;for(const opt of $('sort').options){opt.disabled= !['name','original'].includes(opt.value)&&category!=='jutsu';}render();renderTray();}
function resetFilters(redraw=true){$('search').value='';$('effect').value='';$('sort').value='original';if(redraw)render();}
function render(){
  const query=normalize($('search').value.trim()),effect=$('effect').value;
  let result=items.filter(i=>i.category===category&&(!query||normalize(fullText(i)+' '+tags(i).map(t=>t[1]).join(' ')).includes(query))&&(!effect||tags(i).some(t=>t[0]===effect)));
  const sort=$('sort').value;
  if(sort==='name') result.sort((a,b)=>a.name.localeCompare(b.name));
  else if(sort!=='original') result.sort((a,b)=>(a[sort]==null?Infinity:Number(a[sort]))-(b[sort]==null?Infinity:Number(b[sort])));
  $('results').textContent=`${result.length} de ${items.filter(i=>i.category===category).length} ${CATEGORIES[category].name.toLowerCase()}`;
  $('empty').hidden=result.length>0;
  $('grid').innerHTML=result.map(item=>{
    const list=skills(item),passives=list.filter(passive),selected=selection.includes(item.key);
    const description=item.desc||(item.category==='pet'?`${list.length} habilidades de apoyo y combate. Consulta los efectos, niveles y datos disponibles.`:'Consulta las habilidades y sus efectos.');
    const meta=item.category==='jutsu'?`<span>Nivel <b>${value(item.level)}</b></span><span>CP <b>${value(item.cp)}</b></span><span>CD <b>${value(item.cd)}</b></span>`:`<span><b>${list.length}</b> habilidades</span>${passives.length?`<span><b>${passives.length}</b> pasivas</span>`:''}`;
    return `<article class="card ${selected?'chosen':''}"><div class="card-top">${portrait(item)}<div><span class="overline">${CATEGORIES[item.category].short}${item.category==='jutsu'?' / LV '+value(item.level):''}</span><h2>${escapeHTML(item.name)}</h2></div></div><div class="card-body"><p class="description">${escapeHTML(description)}</p><div class="card-meta">${meta}</div><div class="tags">${uncertain(item)?'<span class="tag warn">Por verificar</span>':''}${tags(item).slice(0,3).map(t=>`<span class="tag">${t[1]}</span>`).join('')}</div></div><div class="card-bottom"><button class="detail-btn" data-detail="${item.key}" aria-label="Ver ficha de ${escapeHTML(item.name)}">Ver ficha ↗</button><button class="compare-btn" data-compare="${item.key}" aria-label="${selected?'Quitar':'Comparar'} ${escapeHTML(item.name)}" aria-pressed="${selected}">${selected?'✓ Seleccionado':'+ Comparar'}</button></div></article>`;
  }).join('');
}
function toggleCompare(key){const item=items.find(i=>i.key===key);if(!item)return;if(selection.includes(key))selection=selection.filter(k=>k!==key);else {if(selection.length===3){notify('Puedes comparar hasta tres elementos. Quita uno para añadir otro.');return;}selection.push(key);}render();renderTray();}
function renderTray(){ $('compare-tray').hidden=!selection.length;$('compare-count').textContent=`(${selection.length}/3)`;$('open-compare').disabled=selection.length<2;$('selected').innerHTML=selection.map(key=>{const item=items.find(i=>i.key===key);return `<button class="selected-chip" data-compare="${key}" aria-label="Quitar ${escapeHTML(item.name)}">${escapeHTML(item.name)}<span aria-hidden="true">✕</span></button>`;}).join('');}
function skillHTML(s){return `<article class="skill"><span class="overline">${passive(s)?'PASIVA':'HABILIDAD'}</span><h3>${escapeHTML(s.name)}</h3>${metrics(s)}<p>${escapeHTML(s.desc||'Descripción pendiente.')}</p>${s.notes?`<p class="notes">${escapeHTML(s.notes)}</p>`:''}</article>`;}
function sourceHTML(item){let source=item.category==='jutsu'?'Transcripción revisada de capturas del usuario.':item.source||'NSO Talent & Senjutsu Skill Tree Viewer, por Uruzua. Datos del catálogo recopilado; no verificados en combate.';const url=item.reference_url||(['extreme','secret','senjutsu'].includes(item.category)?'https://f701-math.github.io/nso/':'');return `<details class="source-block"><summary>Fuente y calidad de los datos</summary><p>${escapeHTML(source)}</p>${url&&/^https:\/\//.test(url)?`<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">Consultar referencia</a>`:''}${item.attachment_source?`<p>${escapeHTML(item.attachment_source.description)} Adjunto ${value(item.attachment_source.number)}.</p>`:''}${item.skill_id?`<p>Identificador: ${escapeHTML(item.skill_id)}</p>`:''}${item.notes?`<p>${escapeHTML(item.notes)}</p>`:''}<p>${uncertain(item)?'Pendiente de verificar en el juego.':'Datos según la fuente indicada; no confirma fórmulas ni interacciones.'} Los valores ausentes se muestran como «Sin dato». Las etiquetas son una ayuda de búsqueda derivada de la descripción; no son una simulación.</p></details>`;}
function openDetail(key){const item=items.find(i=>i.key===key);if(!item)return;const src=asset(item.image),list=skills(item);$('detail-content').innerHTML=`<div class="detail-header">${portrait(item)}<div><span class="overline">${CATEGORIES[item.category].name}</span><h2>${escapeHTML(item.name)}</h2>${uncertain(item)?'<span class="tag warn">Datos por verificar</span>':''}</div></div>${item.category!=='jutsu'&&item.desc?`<p class="detail-description">${escapeHTML(item.desc)}</p>`:''}${item.req?`<p class="detail-description"><strong>Requisito:</strong> ${escapeHTML(item.req)}</p>`:''}<div class="detail-layout" ${!src?'style="grid-template-columns:1fr"':''}>${src?`<aside><img class="tree-image" src="${escapeHTML(src)}" alt="${escapeHTML(item.category==='jutsu'?'Captura original de ':'Árbol de habilidades de ')+escapeHTML(item.name)}"><a class="image-link" href="${escapeHTML(src)}" target="_blank" rel="noopener noreferrer">Abrir imagen completa</a></aside>`:''}<div>${list.map(skillHTML).join('')}</div></div>${sourceHTML(item)}`;$('detail').showModal();}
function openComparison(){if(selection.length<2)return;const chosen=selection.map(k=>items.find(i=>i.key===k));const rows=[];rows.push(['Efectos descritos',i=>tags(i).map(t=>`<span class="tag">${t[1]}</span>`).join('')||'Sin etiquetas']);
  if(category==='jutsu'){for(const [key,label] of [['level','Nivel'],['damage','Daño publicado'],['cp','Costo CP'],['cd','Cooldown']])rows.push([label,i=>value(i[key])]);rows.push(['Descripción',i=>escapeHTML(i.desc)]);}
  else{rows.push(['Pasivas',i=>{const p=skills(i).filter(passive);return p.length?p.map(s=>`<p><strong>${escapeHTML(s.name)}</strong><br>${escapeHTML(s.desc)}</p>`).join(''):'Sin pasivas descritas';}]);rows.push(['Habilidades',i=>skills(i).filter(s=>!passive(s)).map(s=>`<p><strong>${escapeHTML(s.name)}</strong><br>${escapeHTML(s.desc)}<br><span class="metric">${'level'in s?'Nivel '+value(s.level)+' · ':''}${'sp'in s?'SP':'CP'} ${value(s.sp??s.cp)} · CD ${value(s.cd)} · Daño ${value(s.damage)}</span>${s.notes?`<br><small>${escapeHTML(s.notes)}</small>`:''}</p>`).join('')]);rows.push(['Requisitos',i=>escapeHTML(i.req||'Sin requisito documentado')]);}
  rows.push(['Estado de los datos',i=>uncertain(i)?'Por verificar en el juego':'Según fuente; fórmulas e interacciones sin confirmar']);
  $('comparison-content').innerHTML=`<table><thead><tr><th scope="col">Característica</th>${chosen.map(i=>`<th scope="col">${escapeHTML(i.name)}</th>`).join('')}</tr></thead><tbody>${rows.map(([label,fn])=>`<tr><th scope="row">${label}</th>${chosen.map(i=>`<td>${fn(i)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;$('comparison').showModal();}
document.addEventListener('click',e=>{const button=e.target.closest('button');if(!button)return;if(button.dataset.category){location.hash=button.dataset.category;}if(button.dataset.detail)openDetail(button.dataset.detail);if(button.dataset.compare)toggleCompare(button.dataset.compare);if(button.dataset.close)$(button.dataset.close).close();});
for(const id of ['detail','comparison']) $(id).addEventListener('click',e=>{if(e.target===$(id)){const r=$(id).getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$(id).close();}});
$('search').addEventListener('input',render);$('effect').addEventListener('change',render);$('sort').addEventListener('change',render);$('reset').onclick=()=>resetFilters();$('empty-reset').onclick=()=>resetFilters();$('clear-compare').onclick=()=>{selection=[];render();renderTray();};$('open-compare').onclick=openComparison;
window.addEventListener('hashchange',()=>setCategory(location.hash.slice(1)));
async function init(){try{const [talents,jutsus,pets,assets]=await Promise.all(['talents','jutsus','pets','assets'].map(async name=>{const response=await fetch(`./data/${name}.json`);if(!response.ok)throw new Error(name);return response.json();}));assetPaths=new Set(assets);items=[...Object.entries(talents).flatMap(([cat,group])=>group.map((item,n)=>({...item,category:cat,key:`${cat}-${n}`}))),...jutsus.jutsus.map((item,n)=>({...item,category:'jutsu',key:`jutsu-${n}`})),...pets.pets.map((item,n)=>({...item,category:'pet',key:`pet-${n}`}))];$('effect').innerHTML='<option value="">Todos los efectos</option>'+EFFECTS.map(([key,name])=>`<option value="${key}">${name}</option>`).join('');$('totals').textContent=`${items.length} fichas · ${items.reduce((n,i)=>n+skills(i).length,0)} habilidades documentadas`;setCategory(location.hash.slice(1)||'extreme');}catch(error){$('error').hidden=false;$('results').textContent='Catálogo no disponible';console.error('No se pudo cargar el catálogo:',error);}}
init();
