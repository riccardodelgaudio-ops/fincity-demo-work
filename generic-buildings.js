// Global building selection for FinCity demo.
// Any rendered building can be tapped. In Switzerland we query the official GWR layer via geo.admin.ch.
(function(){
  const knownHitLayers=['fincity-owned-hit','fincity-active-hit','fincity-auction-hit','fincity-trophy-hit'];

  function polygonCenter(g){
    if(!g)return null;
    let pts=[];
    if(g.type==='Polygon')pts=g.coordinates.flat(1);
    if(g.type==='MultiPolygon')pts=g.coordinates.flat(2);
    if(!pts.length)return null;
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    pts.forEach(c=>{if(Array.isArray(c)&&c.length>=2){minX=Math.min(minX,c[0]);maxX=Math.max(maxX,c[0]);minY=Math.min(minY,c[1]);maxY=Math.max(maxY,c[1])}});
    return isFinite(minX)?[(minX+maxX)/2,(minY+maxY)/2]:null;
  }

  function wgs84ToLv95(lon,lat){
    const latSec=lat*3600,lonSec=lon*3600;
    const latAux=(latSec-169028.66)/10000;
    const lonAux=(lonSec-26782.5)/10000;
    const e=2600072.37+211455.93*lonAux-10938.51*lonAux*latAux-0.36*lonAux*latAux*latAux-44.54*lonAux*lonAux*lonAux;
    const n=1200147.07+308807.95*latAux+3745.25*lonAux*lonAux+76.63*latAux*latAux-194.56*lonAux*lonAux*latAux+119.79*latAux*latAux*latAux;
    return [e,n];
  }

  function swissimageEmbed(lon,lat){
    const [e,n]=wgs84ToLv95(lon,lat);
    const c=e.toFixed(1)+','+n.toFixed(1);
    return 'https://map.geo.admin.ch/#/embed?lang=de&center='+c+'&z=13&topic=ech&layers=ch.swisstopo.swissimage-product&crosshair=marker,'+c+'&noSimpleZoom=true';
  }
  function streetViewUrl(lon,lat){
    return 'https://www.google.com/maps/@?api=1&map_action=pano&viewpoint='+encodeURIComponent(lat+','+lon)+'&fov=80';
  }

  function addressKey(value){
    return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/strasse/g,'str').replace(/straße/g,'str').replace(/[^a-z0-9.]+/g,' ').trim();
  }
  function sameAddress(a,b){
    const ka=addressKey(a),kb=addressKey(b);if(!ka||!kb)return false;
    const house=s=>s.match(/\b\d+(?:\.\d+)?[a-z]?\b/)?.[0]||'';
    const ha=house(ka),hb=house(kb);if(ha&&hb&&ha!==hb)return false;
    const street=s=>s.replace(/\b\d+(?:\.\d+)?[a-z]?\b.*$/,'').trim();
    const sa=street(ka),sb=street(kb);
    return sa&&sb&&(sa.includes(sb)||sb.includes(sa));
  }
  function gwrInfo(a){
    if(!a)return null;
    const street=a.strname_deinr||a.label||'';
    const plz=String(a.dplz4||a.plz_plz6||'').split('/')[0];
    const town=a.dplzname||a.ggdename||'';
    return {address:[street,[plz,town].filter(Boolean).join(' ')].filter(Boolean).join(', '),egid:a.egid||a.EGID||null,units:a.ganzwhg??a.GANZWHG??null,official:true,raw:a};
  }
  async function linkedGwr(preferred){
    if(!preferred?.featureId&&!preferred?.gwrLink)return null;
    try{
      let href=preferred.gwrLink||'/rest/services/ech/MapServer/ch.bfs.gebaeude_wohnungs_register/'+encodeURIComponent(preferred.featureId);
      if(preferred.featureId)href=href.replace('<featureid>',encodeURIComponent(preferred.featureId));
      const url=href.startsWith('http')?href:'https://api3.geo.admin.ch'+href;
      const r=await fetch(url);if(!r.ok)return null;
      const j=await r.json();
      const a=j.feature?.attributes||j.attributes||j.properties||j.feature?.properties||null;
      return gwrInfo(a);
    }catch(e){return null}
  }
  async function officialSwissBuilding(lon,lat,preferred=null){
    const linked=await linkedGwr(preferred);
    if(linked)return linked;
    const [e,n]=wgs84ToLv95(lon,lat);
    const q=new URLSearchParams({geometryType:'esriGeometryPoint',geometry:`${e},${n}`,imageDisplay:'100,100,96',mapExtent:'0,0,100,100',tolerance:'4',layers:'all:ch.bfs.gebaeude_wohnungs_register',returnGeometry:'false',sr:'2056',lang:'de'});
    const r=await fetch('https://api3.geo.admin.ch/rest/services/ech/MapServer/identify?'+q.toString());
    if(!r.ok)throw new Error('GWR unavailable');
    const j=await r.json();
    const candidates=(j.results||[]).filter(x=>x.layerBodId==='ch.bfs.gebaeude_wohnungs_register');
    if(!candidates.length)return null;
    const info=gwrInfo(candidates[0].attributes||candidates[0].properties||{});
    if(preferred?.address&&info?.address&&!sameAddress(preferred.address,info.address))return null;
    return info;
  }

  async function fallbackAddress(lon,lat){
    try{
      const r=await fetch(`https://photon.komoot.io/reverse?lon=${encodeURIComponent(lon)}&lat=${encodeURIComponent(lat)}&lang=de`);
      if(!r.ok)throw 0;const j=await r.json();const p=j.features?.[0]?.properties||{};
      const street=[p.street,p.housenumber].filter(Boolean).join(' ');const town=[p.postcode,p.city||p.locality].filter(Boolean).join(' ');
      return {address:[street,town].filter(Boolean).join(', ')||`Standort ${lat.toFixed(5)}, ${lon.toFixed(5)}`,official:false};
    }catch(e){return {address:`Standort ${lat.toFixed(5)}, ${lon.toFixed(5)}`,official:false}}
  }

  function requestKey(obj){return 'fincity-auction-request:'+String(obj.egid||obj.address||`${obj.lon},${obj.lat}`)}
  function requestCount(obj){return Number(localStorage.getItem(requestKey(obj))||0)}

  function showGenericBuilding(obj){
    window.__finCityLastGenericBuilding=obj;
    const cnt=requestCount(obj);
    const aerial=swissimageEmbed(obj.lon,obj.lat);
    const street=streetViewUrl(obj.lon,obj.lat);
    openPanel(`
      <div class="eyebrow">FREIES KARTENGEBÄUDE · AUKTIONSANFRAGE</div>
      <h2>${obj.address||'Gebäude'}</h2>
      <div style="position:relative;height:210px;border-radius:14px;overflow:hidden;background:#111827;border:1px solid #2b3851">
        <iframe src="${aerial}" title="SWISSIMAGE Luftbild ${obj.address||'Gebäude'}" loading="lazy" style="width:100%;height:100%;border:0;display:block"></iframe>
        <div style="position:absolute;left:8px;bottom:8px;background:rgba(0,0,0,.78);padding:5px 7px;border-radius:7px;font-size:7px;letter-spacing:.06em">SWISSIMAGE · EXAKTER KARTENSTANDORT</div>
      </div>
      <a href="${street}" target="_blank" rel="noopener" class="action secondary" style="display:flex;text-decoration:none;align-items:center;justify-content:center;margin-top:8px">👁 REALE STRASSENANSICHT ÖFFNEN</a>
      <div class="card">
        <div class="previewrow"><span>Adresse</span><b>${obj.address}</b></div>
        <div class="previewrow"><span>Adressquelle</span><b>${obj.addressSource|| (obj.official?'BUND · GEO.ADMIN.CH':'KARTEN-GEOCODING')}</b></div>
        ${obj.egid?`<div class="previewrow"><span>EGID</span><b>${obj.egid}</b></div>`:''}
        ${obj.units!==null&&obj.units!==undefined&&obj.units!==''?`<div class="previewrow"><span>Wohneinheiten (Gebäudegrösse)</span><b>${obj.units}</b></div>`:''}
        <div class="previewrow"><span>Demo-Anfragen auf diesem Gerät</span><b>${cnt}</b></div>
      </div>
      <div class="card"><strong>Noch nicht als digitales Spielgebäude freigeschaltet</strong><div class="note">Diesen Kartenstandort kannst du als digitales FinCity-Spielgebäude für eine Auktion vorschlagen.</div></div>
      <button class="action" id="startAuctionRequest">AUKTIONSVORSCHLAG SENDEN</button>
      <button class="action secondary" id="centerGeneric">AUF GEBÄUDE ZENTRIEREN</button>
    `);
    document.getElementById('centerGeneric').onclick=()=>{safeFly(obj.lon,obj.lat);closePanel()};
    document.getElementById('startAuctionRequest').onclick=()=>showRequestForm(obj);
  }

  function showRequestForm(obj){
    openPanel(`
      <div class="eyebrow">AUKTIONSVORSCHLAG · SPIEL-DEMO</div><h2>${obj.address}</h2>
      <div class="card">
        <div class="previewrow"><span>Digitales Spielgebäude</span><b>${obj.address}</b></div>
        ${obj.egid?`<div class="previewrow"><span>Gebäude-ID (EGID)</span><b>${obj.egid}</b></div>`:''}
        <p class="note">Du schlägst diesen Standort als digitalen City Drop vor.</p>
      </div>
      <button class="action" id="confirmAuctionRequest">DIGITALEN CITY DROP VORSCHLAGEN</button>
      <p class="note">Deine Anfrage wird nur im Browser dieser Demo gespeichert. Kein Geldtransfer und kein Eigentum an der echten Immobilie.</p>
    `);
    document.getElementById('confirmAuctionRequest').onclick=()=>{
      const result=window.finCityProposeBuilding?
        window.finCityProposeBuilding(obj):
        {ok:false,message:'Die Spiel-Anfragefunktion ist derzeit nicht verfügbar.'};
      if(result.ok){
        const key=requestKey(obj),next=requestCount(obj)+1;
        localStorage.setItem(key,String(next));
      }
      openPanel(`<div class="eyebrow">AUKTIONSVORSCHLAG</div><h2>${result.ok?'✓ Vorgemerkt':'Hinweis'}</h2>
        <div class="card"><strong>${obj.address}</strong><div class="note">${result.message}</div></div>
        <button class="action" id="backToBuilding">ZURÜCK ZUM GEBÄUDE</button>`);
      document.getElementById('backToBuilding').onclick=()=>showGenericBuilding(obj);
    };
  }

  async function loadGenericBuilding(lon,lat,preferred=null){
    openPanel(`<div class="eyebrow">GEBÄUDE WIRD GELADEN</div><h2>Adresse wird geprüft …</h2><div class="card"><div class="note">FinCity verknüpft die gewählte Adresse mit dem amtlichen GWR.</div></div>`);
    let info=null;try{info=await officialSwissBuilding(lon,lat,preferred)}catch(err){}
    let base=preferred?.address?{
      address:preferred.address,
      official:Boolean(preferred.officialAddress),
      addressSource:preferred.addressSource||'BUND · AMTLICHES GEBÄUDEADRESSVERZEICHNIS',
      featureId:preferred.featureId||null,
      gwrLink:preferred.gwrLink||null,
      addressLink:preferred.addressLink||null
    }:null;
    if(!base&&!info)base=await fallbackAddress(lon,lat);
    const merged={...(info||{}),...(base||{}),lon,lat};
    // The selected/search address is authoritative. GWR only contributes attributes such as EGID/units.
    if(preferred?.address)merged.address=preferred.address;
    if(info){merged.egid=info.egid;merged.units=info.units;merged.raw=info.raw}
    showGenericBuilding(merged);
  }
  window.openGenericBuildingFromCoordinates=loadGenericBuilding;

  async function handleBuildingTap(e){
    if(!map||window.FINCITY_MAP_PROVIDER==='mapbox'||!map.getLayer('fincity-3d'))return;
    const p=e.point||map.project(e.lngLat);
    const known=knownHitLayers.filter(id=>map.getLayer(id));
    if(known.length){try{if(map.queryRenderedFeatures([[p.x-14,p.y-14],[p.x+14,p.y+14]],{layers:known}).length)return}catch(err){}}
    let hits=[];
    // Keep generic selection tight: the user must tap the actual rendered building footprint.
    try{hits=map.queryRenderedFeatures([[p.x-3,p.y-3],[p.x+3,p.y+3]],{layers:['fincity-3d']})||[]}catch(err){return}
    const f=hits[0];if(!f)return;
    const c=polygonCenter(f.geometry)||[e.lngLat.lng,e.lngLat.lat];
    await loadGenericBuilding(c[0],c[1]);
  }

  function install(){
    if(!map)return;
    // Deliberate click/tap only. touchend is intentionally not used because it fires after pinch/zoom/drag gestures.
    const attach=()=>{map.on('click',handleBuildingTap)};
    if(map.loaded())attach();else map.once('load',attach);
  }
  install();
})();
