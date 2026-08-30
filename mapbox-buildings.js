// Building interactions for Mapbox Standard.
(function(){
  if(window.FINCITY_MAP_PROVIDER!=='mapbox')return;
  let selected=null,hovered=null;

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
    try{return map.queryRenderedFeatures([[point.x-20,point.y-20],[point.x+20,point.y+20]],{layers}).length>0}catch(e){return false}
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
        const point=e.point||map.project(e.lngLat);if(knownObjectAt(point))return false;
        if(selected)try{map.setFeatureState(selected,{select:false})}catch(err){}
        selected=e.feature;try{map.setFeatureState(e.feature,{select:true})}catch(err){}
        const c=centerOfGeometry(e.feature?.geometry,[e.lngLat.lng,e.lngLat.lat]);
        if(typeof window.openGenericBuildingFromCoordinates==='function')window.openGenericBuildingFromCoordinates(c[0],c[1]);
        return true;
      }});
    }catch(e){console.warn('FinCity Mapbox building interactions',e)}
  }

  const run=()=>setTimeout(install,200);
  if(map.loaded())run();else map.on('load',run);
  map.on('style.load',()=>setTimeout(install,220));
})();
