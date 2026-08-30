// FinCity premium investor-map layer.
// Keeps the existing no-key MapLibre stack, but restyles it for a calmer professional investment experience.
(function(){
  let currentMode='invest';
  const heatSource='fincity-market-heat';
  const heatLayer='fincity-market-heat-layer';

  function setBtn(id,on){const b=document.getElementById(id);if(b)b.classList.toggle('active',!!on)}
  function styleLayer(id,prop,value){try{if(map&&map.getLayer(id))map.setPaintProperty(id,prop,value)}catch(e){}}
  function layoutLayer(id,prop,value){try{if(map&&map.getLayer(id))map.setLayoutProperty(id,prop,value)}catch(e){}}

  function styleBaseForInvestment(){
    if(!map)return;
    const layers=map.getStyle()?.layers||[];
    layers.forEach(l=>{
      const id=String(l.id||'').toLowerCase();
      if(l.type==='background')styleLayer(l.id,'background-color','#edf1f5');
      if(l.type==='fill'){
        if(id.includes('water')){styleLayer(l.id,'fill-color','#c8d9e4');styleLayer(l.id,'fill-opacity',.92)}
        else if(id.includes('park')||id.includes('grass')||id.includes('wood')||id.includes('landcover')){styleLayer(l.id,'fill-color','#dfe8df');styleLayer(l.id,'fill-opacity',.72)}
        else if(id.includes('building')){styleLayer(l.id,'fill-color','#d7dce2');styleLayer(l.id,'fill-opacity',.8)}
      }
      if(l.type==='line'){
        if(id.includes('motorway')||id.includes('trunk')){styleLayer(l.id,'line-color','#c7ced7');styleLayer(l.id,'line-opacity',.86)}
        else if(id.includes('road')||id.includes('street')){styleLayer(l.id,'line-color','#ffffff');styleLayer(l.id,'line-opacity',.94)}
      }
      if(l.type==='symbol'){
        if(id.includes('poi'))layoutLayer(l.id,'visibility','none');
        try{map.setPaintProperty(l.id,'text-color','#485362')}catch(e){}
        try{map.setPaintProperty(l.id,'text-halo-color','rgba(255,255,255,.9)')}catch(e){}
        try{map.setPaintProperty(l.id,'text-halo-width',1.1)}catch(e){}
      }
    });
    if(map.getLayer('fincity-3d')){
      styleLayer('fincity-3d','fill-extrusion-color','#c6ccd3');
      styleLayer('fincity-3d','fill-extrusion-opacity',.78);
    }
    try{map.setLight({anchor:'viewport',color:'#ffffff',intensity:.42,position:[1.3,210,32]})}catch(e){}
  }

  function marketHeatData(){
    return {type:'FeatureCollection',features:(window.investment||[]).map(p=>({type:'Feature',geometry:{type:'Point',coordinates:[p.lng,p.lat]},properties:{weight:Math.max(1,Number(p.bidCount)||12),price:Number(p.lastAuctionPrice)||0}}))};
  }

  function ensureDemandHeat(){
    if(!map||!map.isStyleLoaded())return;
    const data=marketHeatData();
    if(map.getSource(heatSource)){try{map.getSource(heatSource).setData(data)}catch(e){};return}
    try{
      map.addSource(heatSource,{type:'geojson',data});
      const before=map.getLayer('fincity-3d')?'fincity-3d':undefined;
      map.addLayer({
        id:heatLayer,type:'heatmap',source:heatSource,maxzoom:14.3,
        paint:{
          'heatmap-weight':['interpolate',['linear'],['get','weight'],0,0,70,1],
          'heatmap-intensity':['interpolate',['linear'],['zoom'],10,.18,14,.65],
          'heatmap-radius':['interpolate',['linear'],['zoom'],10,18,14,38],
          'heatmap-opacity':['interpolate',['linear'],['zoom'],10,.3,13.5,.18,14.3,0],
          'heatmap-color':['interpolate',['linear'],['heatmap-density'],0,'rgba(104,76,220,0)',.25,'rgba(104,76,220,.14)',.55,'rgba(104,76,220,.28)',.8,'rgba(68,177,204,.33)',1,'rgba(245,190,72,.38)']
        }
      },before);
    }catch(e){}
  }

  function restyleFinCityMarkers(){
    if(!map)return;
    ['owned','active','auction','trophy'].forEach(type=>{
      const id='fincity-'+type;
      if(map.getLayer(id)){
        try{map.setPaintProperty(id,'circle-radius',['interpolate',['linear'],['zoom'],11,6,13,8,15,10,17,12])}catch(e){}
        try{map.setPaintProperty(id,'circle-stroke-width',2.4)}catch(e){}
        try{map.setPaintProperty(id,'circle-blur',.04)}catch(e){}
      }
    });
  }

  function investMode(){
    currentMode='invest';
    try{if(map.getLayer('satbase'))map.removeLayer('satbase')}catch(e){}
    styleBaseForInvestment();ensureDemandHeat();restyleFinCityMarkers();
    try{map.easeTo({pitch:48,bearing:-8,duration:650})}catch(e){}
    if(map.getLayer(heatLayer))layoutLayer(heatLayer,'visibility','visible');
    if(map.getLayer('fincity-3d'))layoutLayer('fincity-3d','visibility','visible');
    setBtn('investMapBtn',true);setBtn('satBtn',false);setBtn('mapBtn',false);
  }

  function satelliteMode(){
    currentMode='satellite';
    try{satellite()}catch(e){}
    ensureDemandHeat();
    if(map.getLayer(heatLayer))layoutLayer(heatLayer,'visibility','none');
    if(map.getLayer('fincity-3d')){layoutLayer('fincity-3d','visibility','visible');styleLayer('fincity-3d','fill-extrusion-color','#d9dde1');styleLayer('fincity-3d','fill-extrusion-opacity',.45)}
    try{map.easeTo({pitch:54,bearing:-10,duration:650})}catch(e){}
    setBtn('investMapBtn',false);setBtn('satBtn',true);setBtn('mapBtn',false);
  }

  function flatMode(){
    currentMode='flat';
    try{if(map.getLayer('satbase'))map.removeLayer('satbase')}catch(e){}
    styleBaseForInvestment();
    if(map.getLayer(heatLayer))layoutLayer(heatLayer,'visibility','visible');
    if(map.getLayer('fincity-3d'))layoutLayer('fincity-3d','visibility','none');
    try{map.easeTo({pitch:0,bearing:0,duration:650})}catch(e){}
    setBtn('investMapBtn',false);setBtn('satBtn',false);setBtn('mapBtn',true);
  }

  function bindModes(){
    const invest=document.getElementById('investMapBtn'),sat=document.getElementById('satBtn'),flat=document.getElementById('mapBtn');
    if(invest)invest.onclick=investMode;if(sat)sat.onclick=satelliteMode;if(flat)flat.onclick=flatMode;
  }

  function refresh(){ensureDemandHeat();if(currentMode==='invest')setTimeout(investMode,60);else if(currentMode==='satellite')setTimeout(satelliteMode,60);else setTimeout(flatMode,60)}
  window.refreshPremiumMap=refresh;
  const oldRefresh=window.refreshFinCityMapData;
  if(typeof oldRefresh==='function')window.refreshFinCityMapData=function(){oldRefresh();setTimeout(refresh,120)};

  function install(){
    bindModes();if(!map)return;
    const run=()=>setTimeout(()=>{investMode();ensureDemandHeat()},180);
    if(map.loaded())run();else map.on('load',run);
  }
  install();
})();