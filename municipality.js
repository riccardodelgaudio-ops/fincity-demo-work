// FinCity municipality / city-hall marker.
// One city administration marker per active city, using the city's real coat of arms when available.
(function(){
  let marker=null;
  let generation=0;
  // v2 invalidates earlier failed coat-of-arms and wrong POI cache entries.
  const cachePrefix='fincity-municipality:v2:';

  function currentCity(){return window.getCurrentFinCityCity?getCurrentFinCityCity():{name:'Zürich',canton:'ZH',center:[8.5417,47.3769],slug:'zurich'}}
  function cacheKey(city){return cachePrefix+city.slug}
  function readCache(city){try{return JSON.parse(localStorage.getItem(cacheKey(city))||'null')}catch(e){return null}}
  function saveCache(city,data){try{localStorage.setItem(cacheKey(city),JSON.stringify(data))}catch(e){}return data}
  function esc(s){return String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
  function stripHtml(s){const d=document.createElement('div');d.innerHTML=String(s||'');return (d.textContent||'').trim()}

  const hallTerms=/\b(rathaus|stadthaus|gemeindehaus|stadtverwaltung|hôtel de ville|hotel de ville|mairie|palazzo civico|municipio|municipalité|municipalite|town hall|city hall)\b/i;
  const rejectTerms=/\b(restaurant|brauerei|brewery|bibliothek|library|hotel|café|cafe|bar|museum|shop|apotheke|pharmacy)\b/i;

  async function photonSearch(query,city){
    try{
      const q=new URLSearchParams({q:query,limit:'10',lang:'de',lat:String(city.center[1]),lon:String(city.center[0])});
      const r=await fetch('https://photon.komoot.io/api/?'+q.toString());if(!r.ok)return [];
      const j=await r.json();return j.features||[];
    }catch(e){return []}
  }

  async function geocodeHall(city){
    const queries=[
      `Rathaus ${city.name} Schweiz`,
      `Stadtverwaltung ${city.name} Schweiz`,
      `Hôtel de Ville ${city.name} Suisse`,
      `Mairie ${city.name} Suisse`,
      `Palazzo Civico ${city.name} Svizzera`,
      `Municipio ${city.name} Svizzera`,
      `Gemeindehaus ${city.name} Schweiz`
    ];
    const candidates=[];
    for(const query of queries){
      const rows=await photonSearch(query,city);
      rows.forEach(f=>candidates.push(f));
    }
    let best=null,bestScore=Infinity;
    for(const f of candidates){
      const c=f.geometry?.coordinates;if(!c)continue;
      const dx=c[0]-city.center[0],dy=c[1]-city.center[1],dist=Math.hypot(dx,dy);if(dist>.12)continue;
      const p=f.properties||{};
      const text=`${p.name||''} ${p.street||''} ${p.city||''} ${p.locality||''} ${p.type||''}`;
      // Never accept a generic nearby POI. The result must explicitly look like a municipal building.
      if(!hallTerms.test(text)||rejectTerms.test(text))continue;
      let score=dist;
      const n=norm(p.name||'');const cityN=norm(city.name);
      if(n.includes(cityN))score-=.025;
      if(/rathaus|hôtel de ville|hotel de ville|palazzo civico|municipio/.test(n))score-=.035;
      if(score<bestScore){
        bestScore=score;
        best={lng:c[0],lat:c[1],name:p.name||`Stadtverwaltung ${city.name}`,address:[p.street&&[p.street,p.housenumber].filter(Boolean).join(' '),[p.postcode,p.city||p.locality||city.name].filter(Boolean).join(' ')].filter(Boolean).join(', ')};
      }
    }
    // Better to show the city centre than a wrong restaurant/library.
    return best||{lng:city.center[0],lat:city.center[1],name:`Stadtverwaltung ${city.name}`,address:`${city.name} · Standort wird verifiziert`};
  }

  async function wikidataItem(city){
    const searches=[`${city.name} municipality Switzerland`,`${city.name} Schweiz Gemeinde`,`${city.name} ${city.canton}`];
    for(const search of searches){
      try{
        const q=new URLSearchParams({action:'wbsearchentities',search,language:'de',uselang:'de',type:'item',limit:'10',format:'json',origin:'*'});
        const r=await fetch('https://www.wikidata.org/w/api.php?'+q.toString());if(!r.ok)continue;
        const j=await r.json();const cityN=norm(city.name);
        const ranked=(j.search||[]).map(x=>{
          const txt=norm(`${x.label||''} ${x.description||''}`);let score=0;
          if(txt.includes(cityN))score+=8;
          if(/schweiz|switzerland|suisse|svizzera/.test(txt))score+=5;
          if(/stadt|gemeinde|municipality|ville|comune|city/.test(txt))score+=4;
          if(txt.includes(norm(city.canton)))score+=1;
          return {id:x.id,score};
        }).sort((a,b)=>b.score-a.score);
        if(ranked[0]?.score>=8)return ranked[0].id;
      }catch(e){}
    }
    return null;
  }

  async function commonsFile(file){
    try{
      const cq=new URLSearchParams({action:'query',titles:'File:'+file,prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'300',format:'json',origin:'*'});
      const cr=await fetch('https://commons.wikimedia.org/w/api.php?'+cq.toString());if(!cr.ok)return null;
      const cj=await cr.json();const page=Object.values(cj.query?.pages||{})[0];const ii=page?.imageinfo?.[0];if(!ii)return null;
      const ex=ii.extmetadata||{};const pageUrl='https://commons.wikimedia.org/wiki/'+encodeURIComponent(('File:'+file).replace(/ /g,'_')).replace(/%3A/g,':');
      return {url:ii.thumburl||ii.url,page:pageUrl,license:stripHtml(ex.LicenseShortName?.value||'Wikimedia Commons'),credit:stripHtml(ex.Artist?.value||ex.Credit?.value||'Wikimedia Commons').slice(0,140)};
    }catch(e){return null}
  }

  async function coatFromWikidata(city){
    const id=await wikidataItem(city);if(!id)return null;
    try{
      const q=new URLSearchParams({action:'wbgetentities',ids:id,props:'claims',format:'json',origin:'*'});
      const r=await fetch('https://www.wikidata.org/w/api.php?'+q.toString());if(!r.ok)return null;
      const j=await r.json();const file=j.entities?.[id]?.claims?.P94?.[0]?.mainsnak?.datavalue?.value;
      return file?await commonsFile(file):null;
    }catch(e){return null}
  }

  async function coatFromCommons(city){
    const queries=[`Wappen ${city.name}`,`${city.name} coat of arms`,`${city.name} blason`,`${city.name} stemma`,`${city.name} armoiries`];
    const cityTokens=norm(city.name).split(/[^a-z0-9]+/).filter(x=>x.length>2);
    const candidates=[];const seen=new Set();
    for(const search of queries){
      try{
        const q=new URLSearchParams({action:'query',generator:'search',gsrsearch:search,gsrnamespace:'6',gsrlimit:'12',prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'300',format:'json',origin:'*'});
        const r=await fetch('https://commons.wikimedia.org/w/api.php?'+q.toString());if(!r.ok)continue;
        const j=await r.json();
        Object.values(j.query?.pages||{}).forEach(p=>{if(!seen.has(p.pageid)){seen.add(p.pageid);candidates.push(p)}});
      }catch(e){}
    }
    const ranked=candidates.map(p=>{
      const title=norm(p.title);let score=0;
      cityTokens.forEach(tok=>{if(title.includes(tok))score+=7});
      if(/wappen|coat.of.arms|coa|blason|stemma|armoiries|escudo/.test(title))score+=10;
      if(/canton|kanton/.test(title))score-=5;
      if(/district|bezirk/.test(title))score-=5;
      return {p,score};
    }).sort((a,b)=>b.score-a.score);
    const best=ranked.find(x=>x.score>=12);if(!best)return null;
    const ii=best.p.imageinfo?.[0];if(!ii)return null;
    const ex=ii.extmetadata||{};const file=best.p.title.replace(/^File:/i,'');
    const pageUrl='https://commons.wikimedia.org/wiki/'+encodeURIComponent(best.p.title.replace(/ /g,'_')).replace(/%3A/g,':');
    return {url:ii.thumburl||ii.url,page:pageUrl,license:stripHtml(ex.LicenseShortName?.value||'Wikimedia Commons'),credit:stripHtml(ex.Artist?.value||ex.Credit?.value||'Wikimedia Commons').slice(0,140),file};
  }

  async function loadMunicipality(city){
    const cached=readCache(city);if(cached?.hall&&cached?.coat)return cached;
    const hall=cached?.hall||await geocodeHall(city);
    let coat=cached?.coat||await coatFromWikidata(city);
    if(!coat)coat=await coatFromCommons(city);
    return saveCache(city,{hall,coat:coat||null});
  }

  function fallbackShield(city){
    const initials=city.name.split(/[\s\/-]+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();
    return `<div style="width:34px;height:40px;display:grid;place-items:center;border-radius:8px 8px 14px 14px;background:linear-gradient(180deg,#fff,#dfe5ee);color:#151a2b;border:2px solid #fff;box-shadow:0 5px 14px rgba(0,0,0,.28);font:900 11px/1 Arial">${esc(initials)}</div>`;
  }

  function markerElement(city,coat){
    const el=document.createElement('button');el.type='button';el.setAttribute('aria-label',`Stadtverwaltung ${city.name}`);
    el.style.cssText='width:48px;height:56px;border:0;background:transparent;padding:0;display:grid;place-items:center;cursor:pointer;filter:drop-shadow(0 6px 10px rgba(0,0,0,.28));';
    el.innerHTML=coat?.url?`<div style="width:38px;height:44px;padding:4px;border-radius:10px 10px 15px 15px;background:rgba(255,255,255,.96);border:2px solid #fff;box-shadow:0 4px 13px rgba(0,0,0,.25);display:grid;place-items:center"><img src="${coat.url}" alt="Wappen ${esc(city.name)}" style="max-width:100%;max-height:100%;object-fit:contain;display:block"></div>`:fallbackShield(city);
    return el;
  }

  function showMunicipality(city,data){
    const coat=data.coat;const hall=data.hall;
    safeFly(hall.lng,hall.lat);
    openPanel(`
      <div class="eyebrow">FINCITY · STADTVERWALTUNG</div>
      <h2>${esc(city.name)}</h2>
      <div class="card" style="display:grid;grid-template-columns:86px 1fr;gap:14px;align-items:center">
        <div style="height:96px;display:grid;place-items:center;background:#f5f7fa;border-radius:14px;padding:10px">${coat?.url?`<img src="${coat.url}" alt="Stadtwappen ${esc(city.name)}" style="max-width:100%;max-height:100%;object-fit:contain">`:fallbackShield(city)}</div>
        <div><div class="eyebrow">STADTWAPPEN</div><strong style="font-size:18px">${esc(city.name)} · ${esc(city.canton)}</strong><div class="rankmeta">${coat?'Wappen via Wikidata / Wikimedia Commons':'Wappen wird noch verifiziert'}</div></div>
      </div>
      <div class="card">
        <div class="previewrow"><span>Gemeinde-/Stadtgebäude</span><b>${esc(hall.name||`Stadtverwaltung ${city.name}`)}</b></div>
        <div class="previewrow"><span>Standort</span><b>${esc(hall.address||city.name)}</b></div>
        <div class="previewrow"><span>FinCity-Markt</span><b>${esc(city.name)}</b></div>
      </div>
      <button class="action" id="municipalityAuctions">AUKTIONEN IN ${esc(city.name).toUpperCase()} →</button>
      <button class="action secondary" id="municipalityCity">STADTÜBERSICHT ${esc(city.name).toUpperCase()} →</button>
      ${coat?.page?`<p class="note">Stadtwappen: ${esc(coat.license)} · <a href="${coat.page}" target="_blank" rel="noopener" style="color:#c8b6ff">Bildquelle öffnen ↗</a></p>`:''}
    `);
    document.getElementById('municipalityAuctions').onclick=()=>showAuctions();
    document.getElementById('municipalityCity').onclick=()=>showCity();
  }

  async function refresh(){
    const g=++generation;const city=currentCity();
    if(marker){try{marker.remove()}catch(e){}marker=null}
    if(!map)return;
    const data=await loadMunicipality(city);if(g!==generation)return;
    const el=markerElement(city,data.coat);
    el.onclick=e=>{e.preventDefault();e.stopPropagation();showMunicipality(city,data)};
    try{marker=new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([data.hall.lng,data.hall.lat]).addTo(map)}catch(e){console.warn('FinCity municipality marker',e)}
  }

  window.refreshMunicipalityMarker=refresh;
  window.showMunicipality=()=>{const city=currentCity();loadMunicipality(city).then(data=>showMunicipality(city,data))};

  const baseSwitch=window.switchCity;
  if(typeof baseSwitch==='function')window.switchCity=function(slug,showOverview){const result=baseSwitch(slug,showOverview);setTimeout(refresh,250);return result};

  const install=()=>setTimeout(refresh,350);
  if(map&&map.loaded())install();else if(map)map.on('load',install);
  if(map)map.on('style.load',()=>setTimeout(refresh,350));
})();
