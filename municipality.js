// FinCity municipality / city-hall marker.
// One city administration marker per active city, using the city's real coat of arms when available.
(function(){
  let marker=null;
  let generation=0;
  const cachePrefix='fincity-municipality:v1:';

  function currentCity(){return window.getCurrentFinCityCity?getCurrentFinCityCity():{name:'Zürich',canton:'ZH',center:[8.5417,47.3769],slug:'zurich'}}
  function cacheKey(city){return cachePrefix+city.slug}
  function readCache(city){try{return JSON.parse(localStorage.getItem(cacheKey(city))||'null')}catch(e){return null}}
  function saveCache(city,data){try{localStorage.setItem(cacheKey(city),JSON.stringify(data))}catch(e){}return data}
  function esc(s){return String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

  async function geocodeHall(city){
    const queries=[
      `Rathaus ${city.name}, Schweiz`,
      `Hôtel de Ville ${city.name}, Suisse`,
      `Mairie ${city.name}, Suisse`,
      `Palazzo Civico ${city.name}, Svizzera`,
      `Gemeindehaus ${city.name}, Schweiz`
    ];
    for(const query of queries){
      try{
        const q=new URLSearchParams({q:query,limit:'5',lang:'de',lat:String(city.center[1]),lon:String(city.center[0])});
        const r=await fetch('https://photon.komoot.io/api/?'+q.toString());if(!r.ok)continue;
        const j=await r.json();
        const candidates=j.features||[];
        let best=null,bestScore=Infinity;
        for(const f of candidates){
          const c=f.geometry?.coordinates;if(!c)continue;
          const dx=c[0]-city.center[0],dy=c[1]-city.center[1],dist=Math.hypot(dx,dy);
          if(dist>.12)continue;
          const p=f.properties||{};const text=`${p.name||''} ${p.street||''} ${p.city||''} ${p.locality||''}`.toLowerCase();
          let score=dist;
          if(/rathaus|hôtel de ville|hotel de ville|mairie|palazzo civico|municipio|gemeindehaus|stadthaus/.test(text))score-=.04;
          if(score<bestScore){bestScore=score;best={lng:c[0],lat:c[1],name:p.name||`Stadtverwaltung ${city.name}`,address:[p.street&&[p.street,p.housenumber].filter(Boolean).join(' '),[p.postcode,p.city||p.locality||city.name].filter(Boolean).join(' ')].filter(Boolean).join(', ')}}
        }
        if(best)return best;
      }catch(e){}
    }
    return {lng:city.center[0],lat:city.center[1],name:`Stadtverwaltung ${city.name}`,address:city.name};
  }

  async function wikidataItem(city){
    try{
      const q=new URLSearchParams({action:'wbsearchentities',search:`${city.name} ${city.canton} Schweiz`,language:'de',uselang:'de',type:'item',limit:'8',format:'json',origin:'*'});
      const r=await fetch('https://www.wikidata.org/w/api.php?'+q.toString());if(!r.ok)return null;
      const j=await r.json();
      const rows=j.search||[];
      const cityNorm=city.name.toLowerCase().replace('genève','geneve').replace('neuchâtel','neuchatel');
      const ranked=rows.map(x=>{
        const txt=`${x.label||''} ${x.description||''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
        let score=0;if(txt.includes(cityNorm.normalize('NFD').replace(/[\u0300-\u036f]/g,'')))score+=5;if(/schweiz|switzerland|suisse|svizzera/.test(txt))score+=4;if(/stadt|gemeinde|municipality|ville|comune/.test(txt))score+=3;if(txt.includes(city.canton.toLowerCase()))score+=1;return {x,score};
      }).sort((a,b)=>b.score-a.score);
      return ranked[0]?.x?.id||null;
    }catch(e){return null}
  }

  async function coatFromWikidata(city){
    const id=await wikidataItem(city);if(!id)return null;
    try{
      const q=new URLSearchParams({action:'wbgetentities',ids:id,props:'claims',format:'json',origin:'*'});
      const r=await fetch('https://www.wikidata.org/w/api.php?'+q.toString());if(!r.ok)return null;
      const j=await r.json();const claims=j.entities?.[id]?.claims||{};
      const file=claims.P94?.[0]?.mainsnak?.datavalue?.value;if(!file)return null;
      const cq=new URLSearchParams({action:'query',titles:'File:'+file,prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'260',format:'json',origin:'*'});
      const cr=await fetch('https://commons.wikimedia.org/w/api.php?'+cq.toString());if(!cr.ok)return null;
      const cj=await cr.json();const page=Object.values(cj.query?.pages||{})[0];const ii=page?.imageinfo?.[0];if(!ii)return null;
      const ex=ii.extmetadata||{};const pageUrl='https://commons.wikimedia.org/wiki/'+encodeURIComponent(('File:'+file).replace(/ /g,'_')).replace(/%3A/g,':');
      return {url:ii.thumburl||ii.url,page:pageUrl,license:(ex.LicenseShortName?.value||'Wikimedia Commons').replace(/<[^>]+>/g,''),credit:(ex.Artist?.value||ex.Credit?.value||'Wikimedia Commons').replace(/<[^>]+>/g,'').slice(0,140)};
    }catch(e){return null}
  }

  async function loadMunicipality(city){
    const cached=readCache(city);if(cached?.hall&&cached?.coat)return cached;
    const [hall,coat]=await Promise.all([cached?.hall||geocodeHall(city),cached?.coat||coatFromWikidata(city)]);
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
        <div><div class="eyebrow">STADTWAPPEN</div><strong style="font-size:18px">${esc(city.name)} · ${esc(city.canton)}</strong><div class="rankmeta">${coat?'Wappen via Wikidata / Wikimedia Commons':'Wappen-Fallback'}</div></div>
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
