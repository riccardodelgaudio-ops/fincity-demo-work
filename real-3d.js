// FinCity REAL 3D mode: Google Photorealistic 3D Tiles rendered with CesiumJS.
(function(){
  'use strict';
  const KEY_STORAGE='fincity-google-3d-key';
  let viewer=null, tileset=null, loaded=false, active=false, loading=false;
  let cesiumPromise=null;

  const $=id=>document.getElementById(id);
  const city=()=>window.getCurrentFinCityCity?getCurrentFinCityCity():{name:'Zürich',center:[8.5417,47.3769]};
  const points=()=>[
    ...(typeof investment!=='undefined'?investment.map(p=>({...p,_fcType:p.kind==='owned'?'owned':'active'})):[]),
    ...(typeof auctions!=='undefined'?auctions.map(p=>({...p,_fcType:'auction'})):[]),
    ...(typeof trophies!=='undefined'?trophies.map(p=>({...p,_fcType:'trophy'})):[])
  ];

  function getKey(){
    let k='';try{k=localStorage.getItem(KEY_STORAGE)||''}catch(e){}
    return String(k||'').trim();
  }
  function saveKey(k){try{localStorage.setItem(KEY_STORAGE,String(k||'').trim())}catch(e){}}
  async function resolveKey(){
    let k=getKey();if(k)return k;
    try{
      const r=await fetch('/api/google-3d-config',{cache:'no-store'});
      if(r.ok){const j=await r.json();k=String(j.key||'').trim();if(k)saveKey(k)}
    }catch(e){}
    return k;
  }

  function loadCesium(){
    if(window.Cesium)return Promise.resolve(window.Cesium);
    if(cesiumPromise)return cesiumPromise;
    cesiumPromise=new Promise((resolve,reject)=>{
      if(!document.querySelector('link[data-fc-cesium]')){
        const l=document.createElement('link');l.rel='stylesheet';l.dataset.fcCesium='1';
        l.href='https://cesium.com/downloads/cesiumjs/releases/1.134/Build/Cesium/Widgets/widgets.css';
        document.head.appendChild(l);
      }
      const s=document.createElement('script');s.async=true;
      s.src='https://cesium.com/downloads/cesiumjs/releases/1.134/Build/Cesium/Cesium.js';
      s.onload=()=>resolve(window.Cesium);s.onerror=()=>reject(new Error('Cesium konnte nicht geladen werden.'));
      document.head.appendChild(s);
    });
    return cesiumPromise;
  }

  function ensureDom(){
    if($('fcReal3d'))return;
    const wrap=document.createElement('div');wrap.id='fcReal3d';wrap.className='fc-real3d';wrap.hidden=true;
    wrap.innerHTML='<div id="fcCesium" class="fc-cesium"></div><div class="fc-real3d-badge">REAL 3D · GOOGLE PHOTOREALISTIC</div><div id="fcReal3dStatus" class="fc-real3d-status" hidden></div>';
    document.body.appendChild(wrap);
  }

  function showStatus(msg,error=false){
    const el=$('fcReal3dStatus');if(!el)return;
    if(!msg){el.hidden=true;el.textContent='';return}
    el.hidden=false;el.textContent=msg;el.classList.toggle('error',!!error);
  }

  function setupPanel(){
    const existing=getKey();
    openPanel('<div class="eyebrow">REAL 3D · GOOGLE + CESIUM</div><h2>Photorealistisches 3D aktivieren</h2>'+
      '<div class="card"><strong>Google Maps API-Key</strong><div class="note">Für Googles photorealistische 3D-Tiles braucht FinCity einen Google-Maps-API-Key mit aktivierter <b>Map Tiles API</b>. Der Key wird auf diesem Gerät lokal gespeichert.</div>'+
      '<input id="fc3dKey" class="fc-input" type="password" autocomplete="off" placeholder="AIza…" value="'+(existing?existing.replace(/./g,'•'):'')+'">'+
      '<button class="action" id="fc3dSave">KEY SPEICHERN & REAL 3D STARTEN</button></div>'+
      '<div class="card"><strong>Sicher konfigurieren</strong><div class="note">Den Key in Google Cloud auf diese Website und auf die Map Tiles API beschränken. Keine geheimen Server-Schlüssel hier eintragen.</div></div>');
    $('fc3dSave').onclick=()=>{
      const raw=$('fc3dKey').value.trim();
      if(!raw||raw.includes('•'))return openPanel('<div class="eyebrow">REAL 3D</div><h2>API-Key fehlt</h2><div class="card"><div class="note">Bitte den echten Google Maps API-Key einfügen.</div></div><button class="action" id="fc3dBack">ZURÜCK</button>'),$('fc3dBack').onclick=setupPanel;
      saveKey(raw);closePanel();enterReal3d();
    };
  }

  async function initViewer(){
    if(viewer&&tileset)return;
    const key=await resolveKey();if(!key)throw new Error('NO_KEY');
    const Cesium=await loadCesium();
    Cesium.GoogleMaps.defaultApiKey=key;
    viewer=new Cesium.Viewer('fcCesium',{
      globe:false,
      baseLayer:false,
      geocoder:false,
      animation:false,
      timeline:false,
      homeButton:false,
      sceneModePicker:false,
      navigationHelpButton:false,
      fullscreenButton:false,
      infoBox:false,
      selectionIndicator:false,
      vrButton:false
    });
    viewer.scene.backgroundColor=Cesium.Color.fromCssColorString('#07101b');
    viewer.scene.screenSpaceCameraController.minimumZoomDistance=20;
    viewer.scene.screenSpaceCameraController.maximumZoomDistance=25000;
    viewer.scene.globe && (viewer.scene.globe.show=false);
    tileset=await Cesium.createGooglePhotorealistic3DTileset();
    tileset.showCreditsOnScreen=true;
    viewer.scene.primitives.add(tileset);
    viewer.scene.postProcessStages.fxaa.enabled=true;

    const handler=new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction(movement=>{
      const picked=viewer.scene.pick(movement.position);
      const id=picked?.id?._fcId;
      if(id){
        const type=picked.id._fcType;
        if(type==='trophy'&&typeof showTrophy==='function')showTrophy(id);
        else if(type==='auction'&&typeof showAuction==='function')showAuction(id);
        else if(typeof showBuilding==='function')showBuilding(id);
        return;
      }
      // A deliberate click on the photorealistic mesh opens that real-world location.
      if(viewer.scene.pickPositionSupported&&typeof window.openGenericBuildingFromCoordinates==='function'){
        try{
          const pos=viewer.scene.pickPosition(movement.position);
          if(!pos)return;
          const carto=Cesium.Cartographic.fromCartesian(pos);
          const lon=Cesium.Math.toDegrees(carto.longitude),lat=Cesium.Math.toDegrees(carto.latitude);
          if(Number.isFinite(lon)&&Number.isFinite(lat))window.openGenericBuildingFromCoordinates(lon,lat);
        }catch(e){}
      }
    },Cesium.ScreenSpaceEventType.LEFT_CLICK);
    loaded=true;
  }

  function markerColor(type){
    const C=window.Cesium;
    if(type==='owned')return C.Color.fromCssColorString('#ff8a31');
    if(type==='auction')return C.Color.fromCssColorString('#29c9ee');
    if(type==='trophy')return C.Color.fromCssColorString('#f6c847');
    return C.Color.fromCssColorString('#7b55ee');
  }

  let currentFilter='all';
  function filterAllows(type){
    if(currentFilter==='all')return true;
    if(currentFilter==='owned')return type==='owned';
    if(currentFilter==='active')return type==='active'||type==='owned';
    if(currentFilter==='auction')return type==='auction';
    if(currentFilter==='trophy')return type==='trophy';
    return true;
  }
  function syncEntities(){
    if(!viewer||!window.Cesium)return;
    viewer.entities.removeAll();
    points().forEach(p=>{
      const ent=viewer.entities.add({
        position:Cesium.Cartesian3.fromDegrees(Number(p.lng),Number(p.lat),18),
        point:{
          pixelSize:p._fcType==='trophy'?15:13,
          color:markerColor(p._fcType),
          outlineColor:Cesium.Color.WHITE,
          outlineWidth:2,
          disableDepthTestDistance:Number.POSITIVE_INFINITY
        },
        label:{
          text:p._fcType==='trophy'?'★':'',
          font:'bold 12px sans-serif',
          fillColor:Cesium.Color.fromCssColorString('#17120a'),
          horizontalOrigin:Cesium.HorizontalOrigin.CENTER,
          verticalOrigin:Cesium.VerticalOrigin.CENTER,
          disableDepthTestDistance:Number.POSITIVE_INFINITY
        }
      });
      ent._fcId=p.id;ent._fcType=p._fcType;ent.show=filterAllows(p._fcType);
    });
  }

  function flyToCoordinates(lon,lat,height=420){
    if(!viewer||!window.Cesium)return;
    viewer.camera.flyTo({
      destination:Cesium.Cartesian3.fromDegrees(Number(lon),Number(lat),height),
      orientation:{heading:Cesium.Math.toRadians(-18),pitch:Cesium.Math.toRadians(-42),roll:0},
      duration:1.05
    });
  }
  window.flyFinCityReal3dTo=flyToCoordinates;
  window.isFinCityReal3dActive=()=>active;
  function flyToCity(){
    if(!viewer||!window.Cesium)return;
    const c=city();flyToCoordinates(c.center[0],c.center[1],1050);
  }

  async function enterReal3d(){
    ensureDom();
    document.body.classList.add('fc-real3d-required');
    if(loading)return;
    const key=await resolveKey();
    if(!key){setupPanel();return}
    loading=true;
    try{
      $('fcReal3d').hidden=false;showStatus('REAL 3D wird geladen …');
      await initViewer();
      active=true;
      document.body.classList.add('fc-real3d-active');
      syncEntities();flyToCity();showStatus('');
      try{closePanel()}catch(e){}
    }catch(e){
      console.warn('FinCity REAL 3D',e);
      $('fcReal3d').hidden=true;active=false;
      if(String(e?.message||e)==='NO_KEY')setupPanel();
      else openPanel('<div class="eyebrow">REAL 3D</div><h2>3D konnte nicht geladen werden</h2><div class="card"><div class="note">Bitte prüfen, ob die Google <b>Map Tiles API</b> aktiviert ist, der API-Key für diese Domain freigegeben ist und für Photorealistic 3D Tiles berechtigt ist.</div></div><button class="action" id="fc3dRetry">NOCHMALS VERSUCHEN</button><button class="action secondary" id="fc3dChange">API-KEY ÄNDERN</button>');
      const r=$('fc3dRetry');if(r)r.onclick=()=>{viewer=null;tileset=null;loaded=false;enterReal3d()};
      const c=$('fc3dChange');if(c)c.onclick=()=>{saveKey('');setupPanel()};
    }finally{loading=false}
  }
  window.enterFinCityReal3d=enterReal3d;

  function exitReal3d(){if(active)flyToCity()}
  window.exitFinCityReal3d=exitReal3d;

  function install(){
    ensureDom();
    document.body.classList.add('fc-real3d-required');
    document.querySelectorAll('.filter').forEach(btn=>btn.addEventListener('click',()=>{
      currentFilter=btn.dataset.filter||'all';
      if(active)syncEntities();
    }));
    const oldSwitch=window.switchCity;
    if(typeof oldSwitch==='function')window.switchCity=function(slug,showOverview){
      const r=oldSwitch(slug,showOverview);
      setTimeout(()=>{if(active){syncEntities();flyToCity()}},1300);
      return r;
    };
    const oldRefresh=window.refreshFinCityMapData;
    if(typeof oldRefresh==='function')window.refreshFinCityMapData=function(){
      const r=oldRefresh.apply(this,arguments);
      if(active)setTimeout(syncEntities,120);
      return r;
    };
    setTimeout(()=>enterReal3d(),220);
  }

  const css=document.createElement('style');
  css.textContent=`
    .fc-real3d{position:fixed;inset:0;z-index:18;background:#07101b}.fc-cesium{position:absolute;inset:0}.fc-real3d[hidden]{display:none!important}
    .fc-real3d-badge{position:absolute;left:176px;bottom:19px;z-index:2;padding:7px 10px;border-radius:10px;background:rgba(7,12,22,.82);border:1px solid #38445c;color:#dfe6f4;font-size:7px;font-weight:900;letter-spacing:.08em;backdrop-filter:blur(12px)}
    .fc-real3d-status{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:3;padding:11px 14px;border-radius:12px;background:rgba(7,12,22,.9);border:1px solid #46536b;color:#fff;font-size:9px}.fc-real3d-status.error{border-color:#9b4050;color:#ffd7de}
    body.fc-real3d-required .map-controls{display:none!important}
    body.fc-real3d-required #map{filter:brightness(.35);opacity:.28}
    body.fc-real3d-active #map{visibility:hidden}
    body.fc-real3d-active .legend{z-index:25}body.fc-real3d-active .side-nav,body.fc-real3d-active .filters,body.fc-real3d-active .topbar,body.fc-real3d-active #fcAddressSearch{z-index:30}
    body.fc-real3d-active .panel{z-index:40}
    .cesium-widget-credits{font-size:6px!important;max-width:70vw!important}
    @media(max-width:760px){.fc-real3d-badge{left:166px;bottom:13px}.cesium-viewer-bottom{left:155px!important}}
  `;
  document.head.appendChild(css);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();