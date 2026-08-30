// FinCity address search: search a Swiss address, focus the exact location and open the linked building flow.
(function(){
  let timer=null,requestSeq=0,lastResults=[];

  function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
  function distanceKm(a,b){
    const R=6371,toRad=x=>x*Math.PI/180;
    const dLat=toRad(b[1]-a[1]),dLon=toRad(b[0]-a[0]);
    const la1=toRad(a[1]),la2=toRad(b[1]);
    const h=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;
    return 2*R*Math.asin(Math.sqrt(h));
  }

  function resultLabel(f){
    const p=f.properties||{};
    const street=[p.street||p.name,p.housenumber].filter(Boolean).join(' ');
    const place=[p.postcode,p.city||p.locality||p.district].filter(Boolean).join(' ');
    return [street,place].filter(Boolean).join(', ')||p.name||'Adresse';
  }

  async function searchAddress(text){
    const seq=++requestSeq;const q=String(text||'').trim();if(q.length<3)return [];
    const current=window.getCurrentFinCityCity?getCurrentFinCityCity():null;
    const params=new URLSearchParams({q:/schweiz|switzerland|suisse|svizzera/i.test(q)?q:`${q}, Schweiz`,limit:'7',lang:'de'});
    if(current){params.set('lat',String(current.center[1]));params.set('lon',String(current.center[0]))}
    try{
      const r=await fetch('https://photon.komoot.io/api/?'+params.toString());if(!r.ok)throw new Error('search');
      const j=await r.json();if(seq!==requestSeq)return [];
      const rows=(j.features||[]).filter(f=>Array.isArray(f.geometry?.coordinates));
      lastResults=rows;return rows;
    }catch(e){if(seq===requestSeq)lastResults=[];return []}
  }

  function closestCity(coords){
    const cities=window.getFinCityCities?getFinCityCities():[];let best=null,bestD=Infinity;
    cities.forEach(c=>{const d=distanceKm(coords,c.center);if(d<bestD){bestD=d;best=c}});
    return bestD<=25?{city:best,distance:bestD}:null;
  }

  function closestKnownBuilding(coords){
    if(typeof investment==='undefined')return null;let best=null,bestD=Infinity;
    investment.forEach(p=>{const d=distanceKm(coords,[p.lng,p.lat]);if(d<bestD){bestD=d;best=p}});
    return bestD<=0.055?best:null;
  }

  function focusAndOpen(f){
    const coords=f.geometry.coordinates;const label=resultLabel(f);
    try{map.stop()}catch(e){}
    try{map.flyTo({center:coords,zoom:17,pitch:50,bearing:-8,duration:900,essential:true})}catch(e){}
    setTimeout(()=>{
      const known=closestKnownBuilding(coords);
      if(known&&typeof showBuilding==='function'){showBuilding(known.id);return}
      if(typeof window.openGenericBuildingFromCoordinates==='function'){
        window.openGenericBuildingFromCoordinates(coords[0],coords[1]);
      }else{
        openPanel(`<div class="eyebrow">ADRESSSUCHE</div><h2>${esc(label)}</h2><div class="card"><div class="note">Adresse gefunden und auf der Karte zentriert. Die Gebäude-Verknüpfung wird geladen, sobald die GWR-Funktion verfügbar ist.</div></div>`);
      }
    },950);
  }

  function selectResult(index){
    const f=lastResults[index];if(!f)return;
    const input=document.getElementById('fcAddressInput');if(input)input.value=resultLabel(f);
    hideResults();
    const coords=f.geometry.coordinates;const near=closestCity(coords);const current=window.getCurrentFinCityCity?getCurrentFinCityCity():null;
    if(near?.city&&current&&near.city.slug!==current.slug&&typeof switchCity==='function'){
      switchCity(near.city.slug,false);
      // city-ui-fixes intentionally reasserts the new city camera for ~1.35 s; focus exact address afterwards.
      setTimeout(()=>focusAndOpen(f),1550);
    }else focusAndOpen(f);
  }

  function hideResults(){const box=document.getElementById('fcAddressResults');if(box){box.innerHTML='';box.hidden=true}}
  function showResults(rows){
    const box=document.getElementById('fcAddressResults');if(!box)return;
    if(!rows.length){box.innerHTML='<div class="fc-search-empty">Keine eindeutige Schweizer Adresse gefunden.</div>';box.hidden=false;return}
    box.innerHTML=rows.slice(0,5).map((f,i)=>{
      const p=f.properties||{};const label=resultLabel(f);const kind=p.type==='house'?'Gebäude / Adresse':'Adresse';
      return `<button type="button" class="fc-search-result" data-address-result="${i}"><span class="fc-result-pin">⌖</span><span><strong>${esc(label)}</strong><small>${esc(kind)} · Schweiz</small></span></button>`;
    }).join('');box.hidden=false;
    box.querySelectorAll('[data-address-result]').forEach(b=>b.onclick=()=>selectResult(Number(b.dataset.addressResult)));
  }

  async function runSearch(selectFirst=false){
    const input=document.getElementById('fcAddressInput');if(!input)return;const q=input.value.trim();
    if(q.length<3){hideResults();return}
    const btn=document.getElementById('fcAddressSearchBtn');if(btn)btn.classList.add('loading');
    const rows=await searchAddress(q);if(btn)btn.classList.remove('loading');
    if(selectFirst&&rows[0]){lastResults=rows;selectResult(0)}else showResults(rows);
  }

  function install(){
    if(document.getElementById('fcAddressSearch'))return;
    const wrap=document.createElement('div');wrap.id='fcAddressSearch';wrap.className='fc-address-search';
    wrap.innerHTML=`<form id="fcAddressForm" autocomplete="off"><button type="submit" id="fcAddressSearchBtn" aria-label="Adresse suchen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg></button><input id="fcAddressInput" type="search" inputmode="search" placeholder="Adresse suchen …" aria-label="Schweizer Adresse suchen"><button type="button" id="fcAddressClear" aria-label="Suche löschen">×</button></form><div id="fcAddressResults" class="fc-address-results" hidden></div>`;
    document.body.appendChild(wrap);
    const input=document.getElementById('fcAddressInput');
    input.addEventListener('input',()=>{clearTimeout(timer);if(input.value.trim().length<3){hideResults();return}timer=setTimeout(()=>runSearch(false),360)});
    input.addEventListener('focus',()=>{if(lastResults.length&&input.value.trim().length>=3)showResults(lastResults)});
    document.getElementById('fcAddressForm').addEventListener('submit',e=>{e.preventDefault();runSearch(true)});
    document.getElementById('fcAddressClear').onclick=()=>{input.value='';lastResults=[];hideResults();input.focus()};
    document.addEventListener('pointerdown',e=>{if(!wrap.contains(e.target))hideResults()});
  }

  const css=document.createElement('style');css.textContent=`
    .fc-address-search{position:fixed;z-index:105;top:94px;left:112px;width:min(360px,calc(100vw - 390px));min-width:250px}
    .fc-address-search form{height:42px;display:grid;grid-template-columns:40px 1fr 34px;align-items:center;border:1px solid #35425d;background:rgba(9,14,25,.96);border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,.24);backdrop-filter:blur(16px);overflow:hidden}
    .fc-address-search input{width:100%;height:100%;border:0;outline:0;background:transparent;color:#fff;font-size:11px;font-weight:700;padding:0 4px}.fc-address-search input::placeholder{color:#8794ae;font-weight:650}.fc-address-search input::-webkit-search-cancel-button{display:none}
    .fc-address-search button{border:0;background:transparent;color:#a8b2c7;display:grid;place-items:center;cursor:pointer}.fc-address-search button svg{width:19px;height:19px}.fc-address-search #fcAddressSearchBtn.loading{animation:fcPulse .8s ease-in-out infinite alternate}.fc-address-search #fcAddressClear{font-size:20px;color:#66738b}
    .fc-address-results{margin-top:6px;padding:5px;border:1px solid #2c3851;background:rgba(8,13,24,.985);border-radius:14px;box-shadow:0 18px 45px rgba(0,0,0,.42);overflow:hidden}.fc-search-result{width:100%;display:grid!important;grid-template-columns:28px 1fr;gap:7px!important;text-align:left;align-items:center!important;padding:9px!important;border-radius:10px!important}.fc-search-result:hover{background:#211b46!important}.fc-search-result strong{display:block;color:#f5f7fb;font-size:10px;line-height:1.3}.fc-search-result small{display:block;color:#8290aa;font-size:8px;margin-top:2px}.fc-result-pin{font-size:17px;color:#8c6cf2}.fc-search-empty{padding:10px;color:#8e9ab3;font-size:9px}
    @keyframes fcPulse{to{opacity:.35}}
    @media(max-width:760px){.fc-address-search{top:84px;left:90px;right:156px;width:auto;min-width:0}.fc-address-search form{height:36px;grid-template-columns:34px 1fr 28px;border-radius:12px}.fc-address-search input{font-size:9px}.fc-address-search button svg{width:16px;height:16px}.fc-address-results{width:min(340px,calc(100vw - 98px))}}
    @media(max-width:480px){.fc-address-search{top:128px;left:90px;right:8px}.filters{top:172px!important}.panel{top:214px!important;max-height:calc(100vh - 228px)!important}.fc-address-results{width:100%}}
  `;document.head.appendChild(css);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();