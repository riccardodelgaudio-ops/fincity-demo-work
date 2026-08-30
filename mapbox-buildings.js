// Building interactions for Mapbox Standard.
(function(){
  if(window.FINCITY_MAP_PROVIDER!=='mapbox')return;
  let selected=null,hovered=null,suppressUntil=0;

  function blockFor(ms){suppressUntil=Math.max(suppressUntil,Date.now()+ms)}
  function gestureBlocked(){return Date.now()<suppressUntil||map.isMoving()||map.isZooming()||map.isRotating()}

  function centerOfGeometry(g,fallback){
    if(!g)return fallback;
    let pts=[];
    if(g.type==='Polygon')pts=g.coordinates.flat(1);
    if(g.type==='MultiPolygon')pts=g.coordinates.flat(2);
    if(g.type==='Point')return g.coordinates;
    if(!pts.length)return fallback;
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    pts.forEach(c=>{if(Array.isArray(c)&&c.length>=2){minX=Math.min(minX,c[0]);maxX=Math.max(maxX,c[0]);minY=Math.min(minY,c[1]);maxY=Math.max(maxY,c[1])}});
    return isFinite(minX)?[(minX+maxX)/2,(minY+maxY)/2]:fallback;
  }

  function knownObjectAt(point){
    const layers=['fincity-owned-hit','fincity-active-hit','fincity-auction-hit','fincity-trophy-hit'].filter(id=>map.getLayer(id));
    if(!layers.length||!point)return false;
    try{return map.queryRenderedFeatures([[point.x-14,point.y-14],[point.x+14,point.y+14]],{layers}).length>0}catch(e){return false}
  }

  function installGestureGuard(){
    map.on('dragstart',e=>{if(e.originalEvent)blockFor(650)});
    map.on('zoomstart',e=>{if(e.originalEvent)blockFor(800)});
    map.on('rotatestart',e=>{if(e.originalEvent)blockFor(800)});
    map.on('pitchstart',e=>{if(e.originalEvent)blockFor(800)});
    map.on('touchstart',e=>{const n=e.originalEvent?.touches?.length||e.points?.length||0;if(n>1)blockFor(1000)});
    map.on('moveend',()=>{if(suppressUntil>Date.now())suppressUntil=Math.max(suppressUntil,Date.now()+180)});
  }

  function install(){
    if(!map||typeof map.addInteraction!=='function')return;
    try{
      map.addInteraction('fincity-building-enter',{type:'mouseenter',target:{featuresetId:'buildings',importId:'basemap'},handler:({feature})=>{
        if(hovered)try{map.setFeatureState(hovered,{highlight:false})}catch(e){}
        hovered=feature;try{map.setFeatureState(feature,{highlight:true})}catch(e){}
        map.getCanvas().style.cursor='pointer';
      }});
      map.addInteraction('fincity-building-leave',{type:'mouseleave',target:{featuresetId:'buildings',importId:'basemap'},handler:()=>{
        if(hovered)try{map.setFeatureState(hovered,{highlight:false})}catch(e){}hovered=null;map.getCanvas().style.cursor='';
      }});
      map.addInteraction('fincity-building-click',{type:'click',target:{featuresetId:'buildings',importId:'basemap'},handler:(e)=>{
        if(gestureBlocked())return false;
        const point=e.point||map.project(e.lngLat);if(knownObjectAt(point))return false;
        if(selected)try{map.setFeatureState(selected,{select:false})}catch(err){}
        selected=e.feature;try{map.setFeatureState(e.feature,{select:true})}catch(err){}
        const c=centerOfGeometry(e.feature?.geometry,[e.lngLat.lng,e.lngLat.lat]);
        if(typeof window.openGenericBuildingFromCoordinates==='function')window.openGenericBuildingFromCoordinates(c[0],c[1]);
        return true;
      }});
    }catch(e){console.warn('FinCity Mapbox building interactions',e)}
  }

  installGestureGuard();
  const run=()=>setTimeout(install,200);
  if(map.loaded())run();else map.on('load',run);
  map.on('style.load',()=>setTimeout(install,220));
})();
