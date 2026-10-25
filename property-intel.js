// FinCity Swiss property intelligence: GWR + cadastre + aerial + Street View + land registry.
(function(){
  'use strict';
  const GWR='ch.bfs.gebaeude_wohnungs_register';
  const CADASTRAL_INFO='https://cms.geo.admin.ch/www.cadastre.ch/viewers/cadastral-info.html?lang=de';
  const OEREB='https://www.cadastre.ch/de/oereb-online-abfrage';
  const cache=new Map();
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function pick(a,...keys){for(const k of keys){if(a&&a[k]!==undefined&&a[k]!==null&&String(a[k]).trim()!=='')return a[k]}return null}
  function clean(v){if(v===null||v===undefined||v==='')return null;return String(v).replace(/<[^>]+>/g,'').trim()}
  function lv95(lon,lat){
    const ls=lat*3600,os=lon*3600,la=(ls-169028.66)/10000,lo=(os-26782.5)/10000;
    return [
      2600072.37+211455.93*lo-10938.51*lo*la-0.36*lo*la*la-44.54*lo*lo*lo,
      1200147.07+308807.95*la+3745.25*lo*lo+76.63*la*la-194.56*lo*lo*la+119.79*la*la*la
    ];
  }
  function addressKey(value){
    return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/strasse/g,'str').replace(/straße/g,'str').replace(/[^a-z0-9.]+/g,' ').trim();
  }
  function sameAddress(a,b){
    const ka=addressKey(a),kb=addressKey(b);if(!ka||!kb)return false;
    const house=x=>x.match(/\b\d+(?:\.\d+)?[a-z]?\b/)?.[0]||'';
    if(house(ka)&&house(kb)&&house(ka)!==house(kb))return false;
    const street=x=>x.replace(/\b\d+(?:\.\d+)?[a-z]?\b.*$/,'').trim();
    const sa=street(ka),sb=street(kb);
    return sa&&sb&&(sa.includes(sb)||sb.includes(sa));
  }
  async function linkedGwr(p){
    if(!p?.featureId&&!p?.gwrLink)return null;
    try{
      let href=p.gwrLink||('/rest/services/ech/MapServer/'+GWR+'/'+encodeURIComponent(p.featureId));
      if(p.featureId)href=href.replace('<featureid>',encodeURIComponent(p.featureId));
      const url=href.startsWith('http')?href:'https://api3.geo.admin.ch'+href;
      const r=await fetch(url);if(!r.ok)return null;
      const j=await r.json();
      return j.feature?.attributes||j.attributes||j.properties||j.feature?.properties||null;
    }catch(e){return null}
  }
  async function gwr(p){
    const key=(p.featureId||'')+'|'+Number(p.lng).toFixed(5)+','+Number(p.lat).toFixed(5);
    if(cache.has(key))return cache.get(key);
    const xy=lv95(Number(p.lng),Number(p.lat));
    let raw=await linkedGwr(p),linked=Boolean(raw);
    if(!raw){
      const q=new URLSearchParams({
        geometryType:'esriGeometryPoint',geometry:xy[0]+','+xy[1],imageDisplay:'100,100,96',
        mapExtent:'0,0,100,100',tolerance:'4',layers:'all:'+GWR,returnGeometry:'false',sr:'2056',lang:'de'
      });
      try{
        const r=await fetch('https://api3.geo.admin.ch/rest/services/ech/MapServer/identify?'+q.toString());
        if(r.ok){
          const j=await r.json();
          const hit=(j.results||[]).find(x=>x.layerBodId===GWR)||(j.results||[])[0];
          raw=hit&&(hit.attributes||hit.properties)||null;
        }
      }catch(e){}
    }
    const gwrAddress=clean(pick(raw||{},'strname_deinr','label'));
    if(p.address&&gwrAddress&&!linked&&!sameAddress(p.address,gwrAddress))raw=null;
    const out={raw,xy,linked};cache.set(key,out);return out;
  }
  function detailRows(a,p){
    const rows=[];
    const add=(label,value)=>{value=clean(value);if(value&&value!=='0'&&value!=='-999')rows.push([label,value])};
    add('Adresse',p?.address||pick(a,'strname_deinr','label'));
    add('EGID',pick(a,'egid','EGID'));
    add('Gemeinde',pick(a,'ggdename','GGDENAME'));
    add('Baujahr',pick(a,'gbauj','GBAUJ'));
    add('Renovation',pick(a,'grenj','GRENJ'));
    let n=Number(pick(a,'garea','GAREA'));if(n>0)add('Grundfläche',Math.round(n).toLocaleString('de-CH')+' m²');
    n=Number(pick(a,'gastw','GASTW'));if(n>0)add('Geschosse',Math.round(n));
    n=Number(pick(a,'ganzwhg','GANZWHG'));if(n>=0)add('Wohnungen',Math.round(n));
    add('Parzelle',pick(a,'gparz','GPARZ'));
    add('EGRID',pick(a,'gegrid','GEGRID'));
    add('Gebäudenummer',pick(a,'gebnr','GEBNR'));
    return rows;
  }
  function geoUrl(p,mode){
    const xy=lv95(Number(p.lng),Number(p.lat)),c=xy[0].toFixed(1)+','+xy[1].toFixed(1);
    if(mode==='embed')return 'https://map.geo.admin.ch/#/embed?lang=de&center='+c+'&z=12&topic=ech&layers=ch.swisstopo.swissimage-product&crosshair=marker,'+c+'&noSimpleZoom=true';
    if(mode==='air')return 'https://map.geo.admin.ch/#/map?lang=de&center='+c+'&z=12&topic=ech&layers=ch.swisstopo.swissimage-product&crosshair=marker,'+c;
    return 'https://map.geo.admin.ch/#/map?lang=de&center='+c+'&z=11&topic=ech&layers=ch.kantone.cadastralwebmap-farbe;ch.bfs.gebaeude_wohnungs_register&crosshair=marker,'+c+'&featureInfo=bottomPanel';
  }
  function street(p){return 'https://www.google.com/maps/@?api=1&map_action=pano&viewpoint='+encodeURIComponent(p.lat+','+p.lng)+'&fov=80'}
  function googleSat(p){return 'https://www.google.com/maps/@?api=1&map_action=map&center='+encodeURIComponent(p.lat+','+p.lng)+'&zoom=20&basemap=satellite'}
  function currentProperty(){
    if(typeof panel==='undefined'||!panel)return null;
    if(window.__finCityLastGenericBuilding&&panel.textContent.includes('FREIES KARTENGEBÄUDE'))return window.__finCityLastGenericBuilding;
    const h=panel.querySelector('h2')?.textContent?.trim();if(!h)return null;
    if(typeof investment!=='undefined'){
      const b=investment.find(x=>String(x.name).trim()===h);if(b)return b;
    }
    if(typeof auctions!=='undefined'){
      const a=auctions.find(x=>String(x.name).trim()===h);if(a)return a;
    }
    return null;
  }
  async function copyAndOpen(value,url,status){
    try{await navigator.clipboard.writeText(value)}catch(e){}
    try{window.open(url,'_blank','noopener')}catch(e){}
    if(status){
      status.textContent='Suchwert kopiert: '+value+' · im offiziellen Suchfeld einfügen.';
      setTimeout(()=>{if(status)status.textContent=''},4500);
    }
  }
  async function inject(){
    if(typeof panel==='undefined'||!panel||panel.querySelector('[data-pintel]'))return;
    const p=currentProperty();if(!p||!Number.isFinite(Number(p.lng))||!Number.isFinite(Number(p.lat)))return;
    const allowed=panel.textContent.includes('DIGITALES SPIELGEBÄUDE')||panel.textContent.includes('FREIES KARTENGEBÄUDE')||panel.textContent.includes('CITY DROP');
    if(!allowed)return;
    const box=document.createElement('section');box.className='pi-card';box.dataset.pintel='loading';
    box.innerHTML='<div class="eyebrow">SCHWEIZER OBJEKTINFO</div><div class="pi-load">GWR, Kataster und Luftbild werden verbunden …</div>';
    const anchor=panel.querySelector('[data-gm-market]')||panel.querySelector('.action');
    if(anchor)panel.insertBefore(box,anchor);else panel.appendChild(box);
    const d=await gwr(p);if(!document.body.contains(box))return;
    const a=d.raw||{},rows=detailRows(a,p);
    const egrid=clean(pick(a,'gegrid','GEGRID'));
    const parcel=clean(pick(a,'gparz','GPARZ'));
    const addr=p.address||clean(pick(a,'strname_deinr','label'))||p.name||'';
    const searchValue=egrid||([addr,parcel].filter(Boolean).join(' '))||(Math.round(d.xy[0])+' '+Math.round(d.xy[1]));
    box.dataset.pintel='ready';
    box.innerHTML=
      '<div class="eyebrow">AMTLICHE OBJEKTDATEN</div>'+
      '<div class="pi-grid">'+(rows.length?rows.map(r=>'<div><span>'+esc(r[0])+'</span><b>'+esc(r[1])+'</b></div>').join(''):'<div class="pi-wide"><span>GWR</span><b>Keine Zusatzdaten am Kartenpunkt gefunden</b></div>')+'</div>'+
      '<div class="pi-source">Quelle: Eidg. Gebäude- und Wohnungsregister / geo.admin.ch</div>'+
      '<div class="pi-view"><iframe title="SWISSIMAGE Luftbild" loading="lazy" src="'+geoUrl(p,'embed')+'"></iframe><span>SWISSIMAGE · exakter Standort</span></div>'+
      '<div class="pi-links">'+
        '<a target="_blank" rel="noopener" href="'+street(p)+'">👁 STREET VIEW</a>'+
        '<a target="_blank" rel="noopener" href="'+googleSat(p)+'">🛰 SATELLIT</a>'+
        '<a target="_blank" rel="noopener" href="'+geoUrl(p,'cat')+'">▦ KATASTER</a>'+
        '<a target="_blank" rel="noopener" href="'+geoUrl(p,'air')+'">🇨🇭 SWISSIMAGE</a>'+
        '<button type="button" data-pi-office>🏛 GRUNDBUCHAMT</button>'+
        '<button type="button" data-pi-oereb>§ ÖREB</button>'+
      '</div>'+
      '<div class="pi-status" data-pi-status></div>'+
      '<p class="pi-note">Grundbuch: kein zentrales Schweizer Register. Der Button öffnet Cadastralinfo; dort findest du für das Grundstück Adresse, Telefon und E-Mail des zuständigen Grundbuchamts.</p>';
    const status=box.querySelector('[data-pi-status]');
    box.querySelector('[data-pi-office]').onclick=()=>copyAndOpen(searchValue,CADASTRAL_INFO,status);
    box.querySelector('[data-pi-oereb]').onclick=()=>copyAndOpen(egrid||addr||searchValue,OEREB,status);
  }
  window.refreshFinCityPropertyIntel=inject;
  const obs=new MutationObserver(()=>setTimeout(inject,30));
  if(typeof panel!=='undefined'&&panel)obs.observe(panel,{childList:true,subtree:true});
  setTimeout(inject,250);
  const css=document.createElement('style');
  css.textContent='.pi-card{margin:10px 0;padding:12px;border:1px solid #2f3d58;border-radius:16px;background:#0a101c;overflow:hidden}.pi-load{color:#8b98af;font-size:9px;padding:10px 0}.pi-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}.pi-grid>div{border:1px solid #26334b;background:#0d1524;border-radius:10px;padding:8px}.pi-grid .pi-wide{grid-column:1/-1}.pi-grid span{display:block;color:#7e8ba3;font-size:6.5px;letter-spacing:.06em;text-transform:uppercase}.pi-grid b{display:block;margin-top:3px;font-size:10px;color:#eef3fa;overflow-wrap:anywhere}.pi-source{margin:7px 1px;color:#6d7b94;font-size:6.5px}.pi-view{position:relative;height:185px;border:1px solid #2b3851;border-radius:13px;overflow:hidden;background:#101827}.pi-view iframe{width:100%;height:100%;border:0}.pi-view span{position:absolute;left:7px;bottom:7px;background:rgba(7,12,21,.86);color:#fff;padding:5px 7px;border-radius:8px;font-size:6.5px}.pi-links{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}.pi-links a,.pi-links button{display:flex;min-height:36px;align-items:center;justify-content:center;text-align:center;text-decoration:none;border:1px solid #34425e;background:#111a2b;color:#dce4f4;border-radius:10px;font-size:7px;font-weight:900;padding:7px;cursor:pointer}.pi-status{min-height:0;color:#a996ff;font-size:7px;line-height:1.35;margin-top:6px}.pi-note{margin:7px 1px 0;color:#7f8ca4;font-size:7px;line-height:1.4}@media(max-width:760px){.pi-card{padding:10px}.pi-view{height:160px}.pi-links a,.pi-links button{font-size:6.5px}}';
  document.head.appendChild(css);
})();