'use strict';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const CATEGORIES = {
 extreme:{names:['Talentos extremos','Extreme talents'],short:['Extremos','Extreme'],symbol:'◈',description:['Pasivas y técnicas que definen tu personaje.','Passives and techniques that define your character.']},
 secret:{names:['Talentos secretos','Secret talents'],short:['Secretos','Secret'],symbol:'◇',description:['Efectos y habilidades para complementar tu estrategia.','Effects and skills to complement your strategy.']},
 senjutsu:{names:['Sage Modes','Sage Modes'],short:['Sage Modes','Sage Modes'],symbol:'☯',description:['Explora las transformaciones y sus habilidades de senjutsu.','Explore transformations and their senjutsu skills.']},
 jutsu:{names:['Jutsus','Jutsus'],short:['Jutsus','Jutsus'],symbol:'ϟ',description:['Tu arsenal de ataques, defensas y técnicas de apoyo.','Your arsenal of attacks, defenses and support techniques.']},
 pet:{names:['Mascotas','Pets'],short:['Mascotas','Pets'],symbol:'✧',description:['Compañeros de batalla y habilidades de apoyo al maestro.','Battle companions and skills that support their master.']}
};
const EFFECTS = [
 ['accuracy','Precisión','Accuracy',/accuracy|precision/],['dodge','Evasión','Dodge',/dodge|evasion/],['agility','Agilidad','Agility',/agility|agilidad|slow/],['critical','Crítico','Critical',/critical|critico|\bcrit\b/],
 ['purify','Purificación / limpieza','Purify / cleanse',/purif|cleanse|clear all debuffs|remove all (negative|debuff)|elimina.*estados/],['stun','Stun / aturdimiento','Stun',/stun|aturd/],['burn','Quemadura / Blaze','Burn / Blaze',/burn|blaze|quem|scorch/],['heal','Recuperación','Recovery',/heal|regen|recover|lifesteal|cura|recuper/],['shield','Protección','Protection',/protect|shield|resist|reduce.*damage taken|reduces incoming damage|escudo|proteccion/],['disperse','Dispersión','Disperse',/disperse|remove.*(positive|buff)|dispers/],['restrict','Restriction','Restriction',/restrict|cannot use|no puede.*jutsu/],['chaos','Chaos','Chaos',/chaos/],['bleed','Bleeding','Bleeding',/bleed/],['injury','Internal Injury','Internal Injury',/internal injury/],['poison','Veneno','Poison',/poison|veneno/],['drain','Drenaje','Drain',/drain|drena/],['all','Todos los enemigos','All enemies',/all (enem|target)|todos (los|sus)|a todos/],['cooldown','Manipula cooldowns','Cooldown changes',/cooldown/]
];
let items=[],assetPaths=new Set(),category='extreme',route='home',selection=[],detailKey=null,toastTimer,ready=false;
const catText=(cat,field='names')=>tr(...CATEGORIES[cat][field]);
const skills=item=>item.category==='jutsu'?[item]:item.skills||[];
const passive=s=>/\(passive(?: skill)?\)/i.test(s.desc||'');
const uncertain=i=>i.verification_status==='pendiente_verificacion_en_juego'||(i.status&&i.status!=='completo');
const value=v=>v==null||v===''?tr('Sin dato','No data'):esc(v);
const tagLabel=tag=>tr(tag[1],tag[2]);
function fullText(item){return [item.name,item.desc,...skills(item).map(s=>s.name+' '+s.desc)].join(' ');}
function tags(item){const text=normalize(fullText(item));return EFFECTS.filter(([key,,,regex])=>regex.test(key==='heal'?text.replace(/[^.!?]*(?:cannot|can't|not allowed to|no puede)\s+(?:be\s+)?(?:heal|recover|curar)[^.!?]*/g,''):text));}
function searchText(item){return normalize([fullText(item),translated(item.desc),...skills(item).flatMap(s=>[translations[s.desc]?.es,translations[s.desc]?.en]),...tags(item).flatMap(tag=>[tag[1],tag[2]])].join(' '));}
function asset(path){const local='assets/'+path;return path&&assetPaths.has(local)?'./'+local:'';}
function portrait(item){const src=asset(item.thumb)||asset(item.image);const initials=item.name.replace(/^Kinjutsu:\s*/,'').split(/\s+/).slice(0,2).map(x=>x[0]).join('');return src?`<img class="portrait ${item.category==='jutsu'?'capture':''}" src="${esc(src)}" alt="" loading="lazy">`:`<span class="portrait placeholder" aria-hidden="true">${esc(initials)}</span>`;}
function prose(text,tag='p',className=''){if(!text)return '';const result=translated(text),entry=translations[text];const changed=result!==text;return `<${tag} class="${className}">${esc(result)}</${tag}>${changed?`<details class="original-text"><summary>${tr('Ver texto original','View original text')} · ${entry?.method==='reviewed'?tr('Traducción revisada','Reviewed translation'):tr('Traducción automática','Automatic translation')}</summary><p>${esc(text)}</p></details>`:!entry?`<small class="translation-pending">${tr('Texto original · traducción pendiente','Original text · translation pending')}</small>`:''}`;}
function metrics(skill){return `<div class="metrics">${[['level',tr('Nivel','Level')],['damage',tr('Daño','Damage')],['sp'in skill?'sp':'cp','sp'in skill?'SP':'CP'],['cd','CD']].filter(([key])=>key!=='level'||'level'in skill).map(([key,label])=>`<span class="metric">${label}<b>${value(skill[key])}</b></span>`).join('')}</div>`;}
function notify(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4200);}
function applyChrome(){
 document.documentElement.lang=language;
 document.title=`Ninja Saga Codex — ${tr('Catálogo y comparador','Catalog and comparison')}`;
 document.querySelector('meta[name="description"]').content=tr('Explora y compara talentos, sage modes, jutsus y mascotas de Ninja Saga.','Explore and compare Ninja Saga talents, sage modes, jutsus and pets.');
 document.querySelectorAll('[data-t]').forEach(el=>el.textContent=t(el.dataset.t));
 document.querySelectorAll('[data-label]').forEach(el=>el.setAttribute('aria-label',t(el.dataset.label)));
 document.querySelectorAll('[data-placeholder]').forEach(el=>el.placeholder=t(el.dataset.placeholder));
 document.querySelectorAll('.language-switch button').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.lang===language));});
 const selectedEffect=$('effect').value;
 $('effect').innerHTML=`<option value="">${tr('Todos los efectos','All effects')}</option>`+EFFECTS.map(e=>`<option value="${e[0]}">${tagLabel(e)}</option>`).join('');
 $('effect').value=selectedEffect;
}
function setLanguage(next){
 if(!['es','en'].includes(next))return;
 language=next;let stored=true;try{localStorage.setItem('ninja-codex-language',next);}catch(_){stored=false;}
 $('language-welcome').close();applyChrome();
 if(ready){renderNav();renderHome();renderHeading();render();renderTray();renderTotals();if($('detail').open)renderDetail(detailKey);if($('comparison').open)renderComparison();}
 if(!stored)notify(tr('Idioma aplicado. Este navegador no permite guardar la preferencia.','Language applied. This browser cannot save your preference.'));
}
function renderTotals(){const count=items.reduce((n,i)=>n+skills(i).length,0);$('totals').textContent=tr(`${items.length} fichas · ${count} habilidades documentadas`,`${items.length} entries · ${count} documented skills`);}
function renderNav(){ $('categories').innerHTML=`<button data-category="home" class="${route==='home'?'active':''}" ${route==='home'?'aria-current="page"':''}><span class="nav-symbol" aria-hidden="true">⌂</span>${tr('Inicio','Home')}</button>`+Object.entries(CATEGORIES).map(([key,c])=>`<button data-category="${key}" class="${route===key?'active':''}" ${route===key?'aria-current="page"':''}><span class="nav-symbol" aria-hidden="true">${c.symbol}</span>${catText(key,'short')}<span class="nav-count">${items.filter(i=>i.category===key).length}</span></button>`).join(''); }
function navigate(key){location.hash=key;}
function setRoute(key){
 if(key==='main'){document.getElementById('main').focus();return;}
 if(key!=='home'&&!CATEGORIES[key])key='home';
 route=key;
 if(key!=='home'&&category!==key){if(selection.length){selection=[];notify(tr('La selección se vació al cambiar de categoría.','Selection cleared when switching categories.'));}category=key;resetFilters(false);}
 $('home').hidden=key!=='home';$('catalog-view').hidden=key==='home';
 renderNav();renderHeading();render();renderHome();renderTray();
}
function renderHeading(){ $('heading').textContent=catText(category);$('category-description').textContent=catText(category,'description');document.querySelector('.index-mark').innerHTML=`0${Object.keys(CATEGORIES).indexOf(category)+1}<span>CODEX / NS</span>`;for(const opt of $('sort').options)opt.disabled=!['name','original'].includes(opt.value)&&category!=='jutsu';}
function resetFilters(redraw=true){$('search').value='';$('effect').value='';$('sort').value='original';if(redraw)render();}
function cardHTML(item,global=false){
 const list=skills(item),passives=list.filter(passive),selected=selection.includes(item.key);
 const description=translated(item.desc)||(item.category==='pet'?tr(`${list.length} habilidades de apoyo y combate. Consulta los efectos, niveles y datos disponibles.`,`${list.length} support and combat skills. Explore effects, levels and available data.`):tr('Consulta las habilidades y sus efectos.','Explore skills and their effects.'));
 const meta=item.category==='jutsu'?`<span>${tr('Nivel','Level')} <b>${value(item.level)}</b></span><span>CP <b>${value(item.cp)}</b></span><span>CD <b>${value(item.cd)}</b></span>`:`<span><b>${list.length}</b> ${tr('habilidades','skills')}</span>${passives.length?`<span><b>${passives.length}</b> ${tr('pasivas','passives')}</span>`:''}`;
 return `<article class="card ${selected?'chosen':''}"><div class="card-top">${portrait(item)}<div><span class="overline">${catText(item.category,'short')}${item.category==='jutsu'?' / LV '+value(item.level):''}</span><h2>${esc(item.name)}</h2></div></div><div class="card-body"><p class="description">${esc(description)}</p><div class="card-meta">${meta}</div><div class="tags">${uncertain(item)?`<span class="tag warn">${tr('Por verificar','Unverified')}</span>`:''}${tags(item).slice(0,3).map(tag=>`<span class="tag">${tagLabel(tag)}</span>`).join('')}</div></div><div class="card-bottom"><button class="detail-btn" data-detail="${item.key}" aria-label="${tr('Ver ficha de','View details for')} ${esc(item.name)}">${tr('Ver ficha','View details')}</button>${global?`<button data-category="${item.category}">${tr('Ver categoría','View category')}</button>`:`<button class="compare-btn" data-compare="${item.key}" aria-label="${selected?tr('Quitar','Remove'):t('compare')} ${esc(item.name)}" aria-pressed="${selected}">${selected?tr('✓ Seleccionado','✓ Selected'):'+ '+t('compare')}</button>`}</div></article>`;
}
function render(){
 const query=normalize($('search').value.trim()),effect=$('effect').value;
 let result=items.filter(i=>i.category===category&&(!query||searchText(i).includes(query))&&(!effect||tags(i).some(tag=>tag[0]===effect)));
 const sort=$('sort').value;if(sort==='name')result.sort((a,b)=>a.name.localeCompare(b.name));else if(sort!=='original')result.sort((a,b)=>(a[sort]==null?Infinity:Number(a[sort]))-(b[sort]==null?Infinity:Number(b[sort])));
 $('results').textContent=`${result.length} ${tr('de','of')} ${items.filter(i=>i.category===category).length} ${catText(category).toLowerCase()}`;
 $('empty').hidden=result.length>0;$('grid').innerHTML=result.map(i=>cardHTML(i)).join('');
}
function renderHome(){
 $('home-counts').innerHTML=`<span><strong>${items.length}</strong> ${tr('fichas','entries')}</span><span><strong>5</strong> ${tr('categorías','categories')}</span><span><strong>ES / EN</strong> ${tr('dos idiomas','two languages')}</span>`;
 $('home-categories').innerHTML=Object.entries(CATEGORIES).map(([key,c])=>`<button class="category-tile" data-category="${key}"><span class="tile-symbol" aria-hidden="true">${c.symbol}</span><span><strong>${catText(key)}</strong><small>${catText(key,'description')}</small></span><b>${items.filter(i=>i.category===key).length}</b></button>`).join('');
 const query=normalize($('global-search').value.trim()),results=query?items.filter(i=>searchText(i).includes(query)):[];
 $('global-count').textContent=query?tr(`${results.length} resultados en todas las categorías`,`${results.length} results across all categories`):'';
 $('global-results').innerHTML=results.map(i=>cardHTML(i,true)).join('');
}
function toggleCompare(key){if(!items.some(i=>i.key===key))return;if(selection.includes(key))selection=selection.filter(k=>k!==key);else{if(selection.length===3){notify(tr('Puedes comparar hasta tres elementos. Quita uno para añadir otro.','You can compare up to three entries. Remove one to add another.'));return;}selection.push(key);}render();renderTray();}
function renderTray(){ $('compare-tray').hidden=!selection.length;$('compare-count').textContent=`(${selection.length}/3)`;$('open-compare').disabled=selection.length<2;$('selected').innerHTML=selection.map(key=>{const item=items.find(i=>i.key===key);return `<button class="selected-chip" data-compare="${key}" aria-label="${tr('Quitar','Remove')} ${esc(item.name)}">${esc(item.name)}<span aria-hidden="true">✕</span></button>`;}).join('');}
function skillHTML(s){return `<article class="skill"><span class="overline">${passive(s)?tr('PASIVA','PASSIVE'):tr('HABILIDAD','SKILL')}</span><h3>${esc(s.name)}</h3>${metrics(s)}${s.desc?prose(s.desc):`<p>${tr('Descripción pendiente.','Description pending.')}</p>`}${s.notes?prose(s.notes,'p','notes'):''}</article>`;}
function sourceHTML(item){
 const source=item.source?prose(item.source):`<p>${item.category==='jutsu'?tr('Transcripción revisada de capturas del usuario.','Reviewed transcription of user screenshots.'):tr('NSO Talent & Senjutsu Skill Tree Viewer, por Uruzua. Datos recopilados; no verificados en combate.','NSO Talent & Senjutsu Skill Tree Viewer, by Uruzua. Collected data; not verified in combat.')}</p>`;
 const url=item.reference_url||(['extreme','secret','senjutsu'].includes(item.category)?'https://f701-math.github.io/nso/':'');
 return `<details class="source-block"><summary>${tr('Fuente y calidad de los datos','Source and data quality')}</summary>${source}${url&&/^https:\/\//.test(url)?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${tr('Consultar referencia','View reference')}</a>`:''}${item.attachment_source?prose(item.attachment_source.description)+`<p>${tr('Adjunto','Attachment')} ${value(item.attachment_source.number)}</p>`:''}${item.skill_id?`<p>ID: ${esc(item.skill_id)}</p>`:''}${item.notes?prose(item.notes):''}<p>${uncertain(item)?tr('Pendiente de verificar en el juego.','Awaiting in-game verification.'):tr('Datos según la fuente indicada; no confirma fórmulas ni interacciones.','Data as described by the source; formulas and interactions remain unconfirmed.')} ${tr('Las etiquetas ayudan a buscar; no son una simulación.','Tags help with search; they are not a simulation.')}</p></details>`;
}
function renderDetail(key){const item=items.find(i=>i.key===key);if(!item)return;const src=asset(item.image);$('detail-content').innerHTML=`<div class="detail-header">${portrait(item)}<div><span class="overline">${catText(item.category)}</span><h2>${esc(item.name)}</h2>${uncertain(item)?`<span class="tag warn">${tr('Datos por verificar','Unverified data')}</span>`:''}</div></div>${item.category!=='jutsu'&&item.desc?prose(item.desc,'p','detail-description'):''}${item.req?`<strong>${tr('Requisito','Requirement')}</strong>${prose(item.req)}`:''}<div class="detail-layout" ${!src?'style="grid-template-columns:1fr"':''}>${src?`<aside><img class="tree-image" src="${esc(src)}" alt="${tr('Imagen original de','Original image for')} ${esc(item.name)}"><a class="image-link" href="${esc(src)}" target="_blank" rel="noopener noreferrer">${tr('Abrir imagen original','Open original image')}</a></aside>`:''}<div>${skills(item).map(skillHTML).join('')}</div></div>${sourceHTML(item)}`;}
function openDetail(key){detailKey=key;renderDetail(key);$('detail').showModal();}
function renderComparison(){
 const chosen=selection.map(k=>items.find(i=>i.key===k));if(chosen.length<2)return;
 const rows=[[tr('Efectos descritos','Documented effects'),i=>tags(i).map(tag=>`<span class="tag">${tagLabel(tag)}</span>`).join('')||tr('Sin etiquetas','No tags')]];
 if(category==='jutsu'){for(const [key,label]of[['level',tr('Nivel','Level')],['damage',tr('Daño publicado','Listed damage')],['cp',tr('Costo CP','CP cost')],['cd','Cooldown']])rows.push([label,i=>value(i[key])]);rows.push([tr('Descripción','Description'),i=>prose(i.desc)]);}
 else{rows.push([tr('Pasivas','Passives'),i=>{const p=skills(i).filter(passive);return p.length?p.map(s=>`<section class="compare-skill"><strong>${esc(s.name)}</strong>${prose(s.desc)}</section>`).join(''):tr('Sin pasivas descritas','No passives documented');}]);rows.push([tr('Habilidades','Skills'),i=>skills(i).filter(s=>!passive(s)).map(s=>`<section class="compare-skill"><strong>${esc(s.name)}</strong>${prose(s.desc)}${metrics(s)}${s.notes?prose(s.notes):''}</section>`).join('')]);rows.push([tr('Requisitos','Requirements'),i=>i.req?prose(i.req):tr('Sin requisito documentado','No requirement documented')]);}
 rows.push([tr('Estado de los datos','Data status'),i=>uncertain(i)?tr('Por verificar en el juego','Awaiting in-game verification'):tr('Según fuente; fórmulas e interacciones sin confirmar','As sourced; formulas and interactions unconfirmed')]);
 $('comparison-content').innerHTML=`<table><thead><tr><th scope="col">${tr('Característica','Characteristic')}</th>${chosen.map(i=>`<th scope="col">${esc(i.name)}</th>`).join('')}</tr></thead><tbody>${rows.map(([label,fn])=>`<tr><th scope="row">${label}</th>${chosen.map(i=>`<td>${fn(i)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function openComparison(){if(selection.length<2)return;renderComparison();$('comparison').showModal();}
document.addEventListener('click',e=>{const button=e.target.closest('button');if(!button)return;if(button.dataset.lang)setLanguage(button.dataset.lang);if(button.dataset.category)navigate(button.dataset.category);if(button.dataset.detail)openDetail(button.dataset.detail);if(button.dataset.compare)toggleCompare(button.dataset.compare);if(button.dataset.close)$(button.dataset.close).close();});
for(const id of ['detail','comparison'])$(id).addEventListener('click',e=>{if(e.target===$(id)){const r=$(id).getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$(id).close();}});
$('language-welcome').addEventListener('cancel',e=>{e.preventDefault();setLanguage(language);});
$('search').addEventListener('input',render);$('global-search').addEventListener('input',renderHome);$('effect').addEventListener('change',render);$('sort').addEventListener('change',render);$('reset').onclick=()=>resetFilters();$('empty-reset').onclick=()=>resetFilters();$('clear-compare').onclick=()=>{selection=[];render();renderTray();};$('open-compare').onclick=openComparison;
window.addEventListener('hashchange',()=>{if(ready)setRoute(location.hash.slice(1)||'home');});
applyChrome();
let savedLanguage;try{savedLanguage=localStorage.getItem('ninja-codex-language');}catch(_){}
if(!['es','en'].includes(savedLanguage))$('language-welcome').showModal();
async function init(){try{
 const [talents,jutsus,pets,assets,locale]=await Promise.all(['talents','jutsus','pets','assets','translations'].map(async name=>{const response=await fetch(`./data/${name}.json`);if(!response.ok)throw new Error(name);return response.json();}));
 translations=locale;assetPaths=new Set(assets);items=[...Object.entries(talents).flatMap(([cat,group])=>group.map((item,n)=>({...item,category:cat,key:`${cat}-${n}`}))),...jutsus.jutsus.map((item,n)=>({...item,category:'jutsu',key:`jutsu-${n}`})),...pets.pets.map((item,n)=>({...item,category:'pet',key:`pet-${n}`}))];ready=true;renderTotals();setRoute(location.hash.slice(1)||'home');
 }catch(error){$('error').hidden=false;$('results').textContent=t('loadError');console.error('Catalog load error:',error);}}
init();
