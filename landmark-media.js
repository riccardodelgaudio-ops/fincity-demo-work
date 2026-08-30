// FinCity landmark media layer.
// Loads representative real photos from Wikimedia Commons for every trophy in every city.
(function(){
  // v4 invalidates older cached map/logo thumbnails.
  const cachePrefix='fincity-landmark-media:v4:';
  const memory=new Map();
  const fallback='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#151a2b"/><stop offset="1" stop-color="#5b35d6"/></linearGradient></defs><rect width="1200" height="700" fill="url(#g)"/><text x="600" y="310" text-anchor="middle" fill="#f6c453" font-size="110">★</text><text x="600" y="405" text-anchor="middle" fill="#fff" font-family="Arial" font-size="42">FinCity Trophy</text><text x="600" y="465" text-anchor="middle" fill="#b8c0d1" font-family="Arial" font-size="24">Foto wird kuratiert</text></svg>`);

  const blockedWords=[
    'map','karte','locator','location map','situationsplan','lageplan','stadtplan','street map','road map',
    'plan.svg','plan.png','diagram','schema','schematic','grundriss','floor plan','site plan','route','wahlkreis',
    'coat of arms','wappen','blason','stemma','armoiries','flag','fahne','bandiera','logo','icon','symbol',
    'seal','sign','pictogram','piktogramm','emblem','badge','wordmark','poster','infographic','graph','chart'
  ];
  const positiveWords=['building','gebäude','haus','church','kirche','cathedral','kathedrale','castle','schloss','bridge','brücke','square','platz','station','bahnhof','museum','tower','turm','monument','fountain','brunnen','palace','palais','park','opera','theatre','theater','centre','center','zentrum','view','ansicht','façade','facade','exterior','architecture'];

  function stripHtml(s){const d=document.createElement('div');d.innerHTML=String(s||'');return (d.textContent||'').trim()}
  function norm(s){return stripHtml(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
  function cityName(){return window.getCurrentFinCityCity?getCurrentFinCityCity().name:'Zürich'}
  function key(t,city){return `${cachePrefix}${city}|${t.name}`}
  function readCache(t,city){const k=key(t,city);if(memory.has(k))return memory.get(k);try{const v=JSON.parse(localStorage.getItem(k)||'null');if(v&&v.url){memory.set(k,v);return v}}catch(e){}return null}
  function saveCache(t,city,v){const k=key(t,city);memory.set(k,v);try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}return v}

  function landmarkTokens(t){
    return norm(t.name).split(/[^a-z0-9]+/).filter(x=>x.length>=3&&!['der','die','das','und','von','des','zur','zum','bei','the'].includes(x));
  }

  function candidateText(page,ii){
    const ex=ii.extmetadata||{};
    return norm([
      page.title,
      ex.ObjectName?.value,
      ex.ImageDescription?.value,
      ex.Categories?.value
    ].filter(Boolean).join(' '));
  }

  function photoScore(page,ii,t,city){
    const url=String(ii.thumburl||ii.url||'').toLowerCase();
    const mime=String(ii.mime||'').toLowerCase();
    const media=String(ii.mediatype||'').toUpperCase();
    const w=Number(ii.width||0),h=Number(ii.height||0);
    const text=candidateText(page,ii);

    // Only photographic bitmap formats. SVGs are never accepted.
    if(media&&media!=='BITMAP')return -Infinity;
    if(!(mime==='image/jpeg'||mime==='image/png'||mime==='image/webp'||/\.(jpe?g|png|webp)(\?|$)/i.test(url)))return -Infinity;
    if(/\.svg(\?|$)/i.test(url)||mime==='image/svg+xml')return -Infinity;

    // Reject thumbnails that are too small to be useful as a landmark hero photo.
    if(w&&h&&(w<640||h<400))return -Infinity;

    // Strongly reject maps, crests, diagrams, logos, plans and similar non-photo assets.
    if(blockedWords.some(word=>text.includes(word)))return -Infinity;

    let score=0;
    const nameTokens=landmarkTokens(t);
    nameTokens.forEach(tok=>{if(text.includes(tok))score+=7});
    const cityNorm=norm(city);if(cityNorm&&text.includes(cityNorm))score+=5;
    positiveWords.forEach(word=>{if(text.includes(word))score+=1.5});
    if(mime==='image/jpeg')score+=5; // JPEG is overwhelmingly likely to be a real photo.
    if(w>=1200&&h>=700)score+=4;
    else if(w>=900&&h>=600)score+=2;
    const ratio=w&&h?w/h:1.5;
    if(ratio>=1.1&&ratio<=2.2)score+=3; // Prefer landscape photos in the hero card.
    if(String(page.title||'').toLowerCase().startsWith('file:'))score+=1;
    return score;
  }

  async function commonsSearch(t,city,search){
    const q=new URLSearchParams({
      action:'query',generator:'search',gsrsearch:search,gsrnamespace:'6',gsrlimit:'15',
      prop:'imageinfo',iiprop:'url|extmetadata|size|mime|mediatype',iiurlwidth:'1200',format:'json',origin:'*'
    });
    const r=await fetch('https://commons.wikimedia.org/w/api.php?'+q.toString());if(!r.ok)throw new Error('commons');
    const j=await r.json();
    return Object.values(j.query?.pages||{}).map(page=>({page,ii:page.imageinfo?.[0]})).filter(x=>x.ii&&(x.ii.thumburl||x.ii.url));
  }

  async function commonsPhoto(t,city){
    // Multiple increasingly broad searches help ambiguous names without falling back to unrelated city maps.
    const queries=[
      `"${t.name}" ${city} Switzerland`,
      `${t.name} ${city} building`,
      `${t.name} ${city}`
    ];
    const seen=new Set();const candidates=[];
    for(const search of queries){
      let rows=[];try{rows=await commonsSearch(t,city,search)}catch(e){}
      rows.forEach(x=>{const id=x.page.pageid||x.page.title;if(!seen.has(id)){seen.add(id);candidates.push(x)}});
      if(candidates.length>=18)break;
    }
    const ranked=candidates.map(x=>({...x,score:photoScore(x.page,x.ii,t,city)})).filter(x=>Number.isFinite(x.score)&&x.score>=5).sort((a,b)=>b.score-a.score);
    const best=ranked[0];if(!best)return null;
    const p=best.page,ii=best.ii,ex=ii.extmetadata||{};
    const license=stripHtml(ex.LicenseShortName?.value||ex.UsageTerms?.value||'Wikimedia Commons');
    const artist=stripHtml(ex.Artist?.value||ex.Credit?.value||'Wikimedia Commons');
    const page='https://commons.wikimedia.org/wiki/'+encodeURIComponent(p.title.replace(/ /g,'_')).replace(/%3A/g,':');
    return {url:ii.thumburl||ii.url,source:'Wikimedia Commons · Foto',credit:artist||'Wikimedia Commons',license,page,score:best.score};
  }

  async function getMedia(t){
    const city=cityName();const cached=readCache(t,city);if(cached)return cached;
    let result=null;try{result=await commonsPhoto(t,city)}catch(e){}
    return saveCache(t,city,result||{url:fallback,source:'FinCity',credit:'Kein eindeutig passendes Foto gefunden',license:'Fallback',page:''});
  }

  function mediaHero(t,m){
    const link=m.page?`<a href="${m.page}" target="_blank" rel="noopener" style="color:#c8b6ff;text-decoration:none">Bildquelle öffnen ↗</a>`:'';
    return `<div style="position:relative;height:205px;border-radius:16px;overflow:hidden;border:1px solid rgba(151,170,210,.2);background:#101525;margin:10px 0 12px"><img src="${m.url}" alt="Foto ${t.name}" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.src='${fallback}'"><div style="position:absolute;left:8px;right:8px;bottom:8px;background:rgba(7,11,20,.86);border:1px solid rgba(255,255,255,.14);padding:7px 9px;border-radius:9px;font-size:8px;line-height:1.35"><strong>${m.source}</strong> · ${m.license}<br>${m.credit?`Credit: ${m.credit}<br>`:''}${link}</div></div>`;
  }

  window.showTrophy=async function(id){
    const t=trophies.find(x=>x.id===id);if(!t)return;safeFly(t.lng,t.lat);const city=cityName();
    openPanel(`<div class="eyebrow">CITY TROPHY · ${city.toUpperCase()}</div><h2>★ ${t.name}</h2><div style="height:205px;border-radius:16px;background:linear-gradient(135deg,#101525,#2a1b55);display:grid;place-items:center;margin:10px 0"><span style="font-size:44px">★</span></div><div class="card"><div class="note">Passendes Foto wird gesucht …</div></div>`);
    const m=await getMedia(t);if(!trophies.find(x=>x.id===id))return;
    openPanel(`<div class="eyebrow">CITY TROPHY · ${city.toUpperCase()} · ${t.subtype}</div><h2>★ ${t.name}</h2>${mediaHero(t,m)}<div class="card"><div class="previewrow"><span>Stadt</span><b>${city}</b></div><div class="previewrow"><span>Typ</span><b>${t.subtype}</b></div><div class="previewrow"><span>Status</span><b>${t.champion?'DAUERHAFT VERGEBEN':'OFFEN'}</b></div>${t.champion?`<div class="previewrow"><span>Champion</span><b>${t.champion.user}</b></div><div class="previewrow"><span>Gewonnen</span><b>${t.champion.year}</b></div>`:'<div class="note">Diese Trophy kann genau einmal in der gesamten FinCity-Historie gewonnen werden.</div>'}</div><div class="card"><strong>0 Slots · nicht käuflich</strong><div class="note">Trophäen bilden Prestige und langfristige City-Historie ab. Für die visuelle Erkennung werden ausschliesslich geeignete Wikimedia-Fotos verwendet; Karten, Logos, Wappen und Pläne werden herausgefiltert.</div></div>`);
  };

  async function addThumb(row,t){
    if(row.querySelector('.fincity-trophy-thumb'))return;
    const thumb=document.createElement('div');thumb.className='fincity-trophy-thumb';thumb.style.cssText='width:58px;height:46px;border-radius:9px;overflow:hidden;flex:0 0 58px;background:#151a2b;border:1px solid rgba(246,196,83,.35);margin-right:8px';thumb.innerHTML=`<img src="${fallback}" alt="${t.name}" style="width:100%;height:100%;object-fit:cover;display:block">`;
    const span=row.querySelector('span');if(span){row.style.display='flex';row.style.alignItems='center';row.insertBefore(thumb,span)}else row.prepend(thumb);
    const m=await getMedia(t);const img=thumb.querySelector('img');if(img)img.src=m.url;
  }

  function enhanceTrophyList(){const rows=[...panel.querySelectorAll('[data-city-trophy]')];rows.forEach((row,i)=>{const id=Number(row.dataset.cityTrophy),t=trophies.find(x=>x.id===id);if(t)setTimeout(()=>addThumb(row,t),i*90)})}
  const baseRanking=window.showTrophyRanking;
  window.showTrophyRanking=function(){if(typeof baseRanking==='function')baseRanking();setTimeout(enhanceTrophyList,20)};
  window.prefetchCurrentCityTrophyImages=async function(){for(const t of trophies){try{await getMedia(t)}catch(e){}}};
  const btn=document.querySelector('.nav-btn[data-view="trophies"]');if(btn)btn.onclick=()=>showTrophyRanking();
})();
