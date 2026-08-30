// Global building selection for FinCity demo.
// Any rendered building can be tapped. In Switzerland we query the official GWR layer via geo.admin.ch.
(function(){
  const genericPhotos=[
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=82'
  ];
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

  async function officialSwissBuilding(lon,lat){
    const [e,n]=wgs84ToLv95(lon,lat);
    const q=new URLSearchParams({geometryType:'esriGeometryPoint',geometry:`${e},${n}`,imageDisplay:'100,100,96',mapExtent:'0,0,100,100',tolerance:'18',layers:'all:ch.bfs.gebaeude_wohnungs_register',returnGeometry:'false',sr:'2056',lang:'de'});
    const r=await fetch('https://api3.geo.admin.ch/rest/services/ech/MapServer/identify?'+q.toString());
    if(!r.ok)throw new Error('GWR unavailable');
    const j=await r.json();
    const candidates=(j.results||[]).filter(x=>x.layerBodId==='ch.bfs.gebaeude_wohnungs_register');
    if(!candidates.length)return null;
    const a=candidates[0].attributes||candidates[0].properties||{};
    const street=a.strname_deinr||a.label||'';
    const plz=String(a.dplz4||a.plz_plz6||'').split('/')[0];
    const town=a.dplzname||a.ggdename||'';
    return {address:[street,[plz,town].filter(Boolean).join(' ')].filter(Boolean).join(', '),egid:a.egid||null,units:a.ganzwhg??null,official:true,raw:a};
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
  function photoFor(obj){const s=String(obj.egid||obj.address||obj.lon);let h=0;for(const ch of s)h=(h*31+ch.charCodeAt(0))>>>0;return genericPhotos[h%genericPhotos.length]}

  function showGenericBuilding(obj){
    const cnt=requestCount(obj);const photo=photoFor(obj);
    openPanel(`
      <div class="eyebrow">FREIES KARTENGEBÄUDE · AUKTIONSANFRAGE</div>
      <h2>${obj.address||'Gebäude'}</h2>
      <div style="position:relative;height:180px;border-radius:14px;overflow:hidden;background:#111827">
        <img src="${photo}" alt="Symbolbild Gebäude" style="width:100%;height:100%;object-fit:cover;display:block">
        <div style="position:absolute;left:8px;bottom:8px;background:rgba(0,0,0,.72);padding:5px 7px;border-radius:7px;font-size:7px;letter-spacing:.06em">SYMBOLBILD · NICHT OBJEKTGENAU</div>
      </div>
      <div class="card">
        <div class="previewrow"><span>Adresse</span><b>${obj.address}</b></div>
        <div class="previewrow"><span>Adressquelle</span><b>${obj.official?'BUND · GWR / GEO.ADMIN.CH':'KARTEN-GEOCODING · DEMO'}</b></div>
        ${obj.egid?`<div class="previewrow"><span>EGID</span><b>${obj.egid}</b></div>`:''}
        ${obj.units!==null&&obj.units!==undefined&&obj.units!==''?`<div class="previewrow"><span>Wohnungen / mögliche Slots</span><b>${obj.units}</b></div>`:''}
        <div class="previewrow"><span>Demo-Anfragen auf diesem Gerät</span><b>${cnt}</b></div>
      </div>
      <div class="card"><strong>Noch nicht als FinCity-Gebäude freigeschaltet</strong><div class="note">Du kannst für dieses reale Kartenobjekt eine Freischaltung bzw. Auktion anfragen. Vor einer echten Veröffentlichung würden Adresse, EGID, Wohnungszahl und Berechtigungen verifiziert.</div></div>
      <button class="action" id="startAuctionRequest">AUKTIONSANFRAGE STARTEN</button>
      <button class="action secondary" id="centerGeneric">AUF GEBÄUDE ZENTRIEREN</button>
    `);
    document.getElementById('centerGeneric').onclick=()=>{safeFly(obj.lon,obj.lat);closePanel()};
    document.getElementById('startAuctionRequest').onclick=()=>showRequestForm(obj);
  }

  function showRequestForm(obj){
    openPanel(`
      <div class="eyebrow">AUKTIONSANFRAGE · DEMO</div><h2>${obj.address}</h2>
      <div class="card"><div class="previewrow"><span>Objekt</span><b>${obj.address}</b></div>${obj.egid?`<div class="previewrow"><span>EGID</span><b>${obj.egid}</b></div>`:''}</div>
      <label class="eyebrow" for="requestName">NAME / USER</label><input id="requestName" value="@MyFinCity" style="width:100%;margin:6px 0 10px;padding:12px;border-radius:10px;border:1px solid #2b3a56;background:#0b111d;color:#fff">
      <label class="eyebrow" for="requestNote">NACHRICHT</label><textarea id="requestNote" rows="3" placeholder="Ich möchte dieses Gebäude für einen zukünftigen City Drop vormerken." style="width:100%;margin:6px 0 10px;padding:12px;border-radius:10px;border:1px solid #2b3a56;background:#0b111d;color:#fff"></textarea>
      <button class="action" id="confirmAuctionRequest">ANFRAGE ABSENDEN · DEMO</button>
      <p class="note">Aktuell wird die Anfrage nur auf diesem Gerät gespeichert. Sobald ein Backend vorhanden ist, kann derselbe Button die Anfrage zentral an FinCity senden.</p>
    `);
    document.getElementById('confirmAuctionRequest').onclick=()=>{
      const key=requestKey(obj);const next=requestCount(obj)+1;localStorage.setItem(key,String(next));
      openPanel(`<div class="eyebrow">AUKTIONSANFRAGE</div><h2>✓ Anfrage gespeichert</h2><div class="card"><strong>${obj.address}</strong><div class="note">Demo-Anfrage Nr. ${next} auf diesem Gerät. Das Objekt bleibt über die Karte erneut anwählbar.</div></div><button class="action" id="backToBuilding">ZURÜCK ZUM GEBÄUDE</button>`);
      document.getElementById('backToBuilding').onclick=()=>showGenericBuilding(obj);
    };
  }

  async function loadGenericBuilding(lon,lat){
    openPanel(`<div class="eyebrow">GEBÄUDE WIRD GELADEN</div><h2>Adresse wird geprüft …</h2><div class="card"><div class="note">FinCity sucht die offizielle Gebäudeadresse und den GWR-Eintrag.</div></div>`);
    let info=null;try{info=await officialSwissBuilding(lon,lat)}catch(err){}
    if(!info)info=await fallbackAddress(lon,lat);
    showGenericBuilding({...info,lon,lat});
  }
  window.openGenericBuildingFromCoordinates=loadGenericBuilding;

  async function handleBuildingTap(e){
    if(!map||window.FINCITY_MAP_PROVIDER==='mapbox'||!map.getLayer('fincity-3d'))return;
    const p=e.point||map.project(e.lngLat);
    const known=knownHitLayers.filter(id=>map.getLayer(id));
    if(known.length){try{if(map.queryRenderedFeatures([[p.x-20,p.y-20],[p.x+20,p.y+20]],{layers:known}).length)return}catch(err){}}
    let hits=[];
    try{hits=map.queryRenderedFeatures([[p.x-7,p.y-7],[p.x+7,p.y+7]],{layers:['fincity-3d']})||[]}catch(err){return}
    const f=hits[0];if(!f)return;
    const c=polygonCenter(f.geometry)||[e.lngLat.lng,e.lngLat.lat];
    await loadGenericBuilding(c[0],c[1]);
  }

  function install(){
    if(!map)return;
    const attach=()=>{map.on('click',handleBuildingTap);map.on('touchend',handleBuildingTap)};
    if(map.loaded())attach();else map.once('load',attach);
  }
  install();
})();
