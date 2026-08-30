// FinCity landmark media layer.
// Loads a representative Wikimedia Commons / Wikipedia image lazily for every trophy in every city.
(function(){
  const cachePrefix='fincity-landmark-media:v2:';
  const memory=new Map();
  const fallback='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#151a2b"/><stop offset="1" stop-color="#5b35d6"/></linearGradient></defs><rect width="1200" height="700" fill="url(#g)"/><text x="600" y="320" text-anchor="middle" fill="#f6c453" font-size="110">★</text><text x="600" y="420" text-anchor="middle" fill="#fff" font-family="Arial" font-size="42">FinCity Trophy</text></svg>`);

  function stripHtml(s){const d=document.createElement('div');d.innerHTML=String(s||'');return (d.textContent||'').trim()}
  function cityName(){return window.getCurrentFinCityCity?getCurrentFinCityCity().name:'Zürich'}
  function key(t,city){return `${cachePrefix}${city}|${t.name}`}
  function readCache(t,city){
    const k=key(t,city);if(memory.has(k))return memory.get(k);
    try{const v=JSON.parse(localStorage.getItem(k)||'null');if(v&&v.url){memory.set(k,v);return v}}catch(e){}
    return null;
  }
  function saveCache(t,city,v){const k=key(t,city);memory.set(k,v);try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}return v}

  async function commonsImage(t,city){
    const search=`${t.name} ${city} Switzerland`;
    const q=new URLSearchParams({
      action:'query',generator:'search',gsrsearch:search,gsrnamespace:'6',gsrlimit:'5',
      prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'1200',format:'json',origin:'*'
    });
    const r=await fetch('https://commons.wikimedia.org/w/api.php?'+q.toString());if(!r.ok)throw new Error('commons');
    const j=await r.json();const pages=Object.values(j.query?.pages||{}).sort((a,b)=>(a.index||99)-(b.index||99));
    for(const p of pages){
      const ii=p.imageinfo?.[0];if(!ii?.thumburl&&!ii?.url)continue;
      const ex=ii.extmetadata||{};
      const license=stripHtml(ex.LicenseShortName?.value||ex.UsageTerms?.value||'Wikimedia Commons');
      const artist=stripHtml(ex.Artist?.value||ex.Credit?.value||'Wikimedia Commons');
      const page='https://commons.wikimedia.org/wiki/'+encodeURIComponent(p.title.replace(/ /g,'_')).replace(/%3A/g,':');
      return {url:ii.thumburl||ii.url,source:'Wikimedia Commons',credit:artist||'Wikimedia Commons',license,page};
    }
    return null;
  }

  async function wikipediaImage(t,city){
    const search=`${t.name} ${city}`;
    const q=new URLSearchParams({
      action:'query',generator:'search',gsrsearch:search,gsrlimit:'5',prop:'pageimages|info',
      piprop:'thumbnail',pithumbsize:'1200',inprop:'url',format:'json',origin:'*'
    });
    const r=await fetch('https://de.wikipedia.org/w/api.php?'+q.toString());if(!r.ok)throw new Error('wikipedia');
    const j=await r.json();const pages=Object.values(j.query?.pages||{}).sort((a,b)=>(a.index||99)-(b.index||99));
    const p=pages.find(x=>x.thumbnail?.source);if(!p)return null;
    return {url:p.thumbnail.source,source:'Wikipedia',credit:'Wikipedia / Wikimedia',license:'Siehe Bildquelle',page:p.fullurl||'https://de.wikipedia.org'};
  }

  async function getMedia(t){
    const city=cityName();const cached=readCache(t,city);if(cached)return cached;
    let result=null;
    try{result=await commonsImage(t,city)}catch(e){}
    if(!result){try{result=await wikipediaImage(t,city)}catch(e){}}
    return saveCache(t,city,result||{url:fallback,source:'FinCity',credit:'Kein eindeutiges Wikimedia-Bild gefunden',license:'Fallback',page:''});
  }

  function mediaHero(t,m){
    const link=m.page?`<a href="${m.page}" target="_blank" rel="noopener" style="color:#c8b6ff;text-decoration:none">Bildquelle öffnen ↗</a>`:'';
    return `<div style="position:relative;height:205px;border-radius:16px;overflow:hidden;border:1px solid rgba(151,170,210,.2);background:#101525;margin:10px 0 12px">
      <img src="${m.url}" alt="${t.name}" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.src='${fallback}'">
      <div style="position:absolute;left:8px;right:8px;bottom:8px;background:rgba(7,11,20,.86);border:1px solid rgba(255,255,255,.14);padding:7px 9px;border-radius:9px;font-size:8px;line-height:1.35">
        <strong>${m.source}</strong> · ${m.license}<br>${m.credit?`© / Credit: ${m.credit}<br>`:''}${link}
      </div>
    </div>`;
  }

  window.showTrophy=async function(id){
    const t=trophies.find(x=>x.id===id);if(!t)return;safeFly(t.lng,t.lat);
    const city=cityName();
    openPanel(`<div class="eyebrow">CITY TROPHY · ${city.toUpperCase()}</div><h2>★ ${t.name}</h2><div style="height:205px;border-radius:16px;background:linear-gradient(135deg,#101525,#2a1b55);display:grid;place-items:center;margin:10px 0"><span style="font-size:44px">★</span></div><div class="card"><div class="note">Bild wird von Wikimedia geladen …</div></div>`);
    const m=await getMedia(t);
    const current=trophies.find(x=>x.id===id);if(!current)return;
    openPanel(`
      <div class="eyebrow">CITY TROPHY · ${city.toUpperCase()} · ${t.subtype}</div>
      <h2>★ ${t.name}</h2>
      ${mediaHero(t,m)}
      <div class="card">
        <div class="previewrow"><span>Stadt</span><b>${city}</b></div>
        <div class="previewrow"><span>Typ</span><b>${t.subtype}</b></div>
        <div class="previewrow"><span>Status</span><b>${t.champion?'DAUERHAFT VERGEBEN':'OFFEN'}</b></div>
        ${t.champion?`<div class="previewrow"><span>Champion</span><b>${t.champion.user}</b></div><div class="previewrow"><span>Gewonnen</span><b>${t.champion.year}</b></div>`:'<div class="note">Diese Trophy kann genau einmal in der gesamten FinCity-Historie gewonnen werden.</div>'}
      </div>
      <div class="card"><strong>0 Slots · nicht käuflich</strong><div class="note">Trophäen bilden Prestige und langfristige City-Historie ab. Das Bild dient zur schnellen visuellen Erkennung des realen Wahrzeichens.</div></div>
    `);
  };

  async function addThumb(row,t){
    if(row.querySelector('.fincity-trophy-thumb'))return;
    const thumb=document.createElement('div');thumb.className='fincity-trophy-thumb';thumb.style.cssText='width:58px;height:46px;border-radius:9px;overflow:hidden;flex:0 0 58px;background:#151a2b;border:1px solid rgba(246,196,83,.35);margin-right:8px';
    thumb.innerHTML=`<img src="${fallback}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">`;
    const span=row.querySelector('span');if(span){row.style.display='flex';row.style.alignItems='center';row.insertBefore(thumb,span)}else row.prepend(thumb);
    const m=await getMedia(t);const img=thumb.querySelector('img');if(img)img.src=m.url;
  }

  function enhanceTrophyList(){
    const rows=[...panel.querySelectorAll('[data-city-trophy]')];
    rows.forEach((row,i)=>{const id=Number(row.dataset.cityTrophy),t=trophies.find(x=>x.id===id);if(t)setTimeout(()=>addThumb(row,t),i*60)});
  }

  const baseRanking=window.showTrophyRanking;
  window.showTrophyRanking=function(){
    if(typeof baseRanking==='function')baseRanking();
    setTimeout(enhanceTrophyList,20);
  };

  window.prefetchCurrentCityTrophyImages=async function(){
    for(const t of trophies){try{await getMedia(t)}catch(e){}}
  };

  const btn=document.querySelector('.nav-btn[data-view="trophies"]');if(btn)btn.onclick=()=>showTrophyRanking();
})();
