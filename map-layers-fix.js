// FinCity map-layer patch: native, tappable points anchored to the map.
(function(){
  const sourceId='fincity-points';
  const types=['owned','active','auction','trophy'];
  const circleLayers={owned:'fincity-owned',active:'fincity-active',auction:'fincity-auction',trophy:'fincity-trophy'};
  const labelLayers={owned:'fincity-owned-label',active:'fincity-active-label',auction:'fincity-auction-label',trophy:'fincity-trophy-label'};
  const hitLayers={owned:'fincity-owned-hit',active:'fincity-active-hit',auction:'fincity-auction-hit',trophy:'fincity-trophy-hit'};
  let collection=null;
  let snapped=false;

  function buildFeatures(){
    const buildings=investment.map(p=>({type:'Feature',geometry:{type:'Point',coordinates:[p.lng,p.lat]},properties:{id:p.id,type:p.kind==='owned'?'owned':'active',label:'⌂',free:free(p),name:p.name}}));
    const auctionFeatures=auctions.map(a=>({type:'Feature',geometry:{type:'Point',coordinates:[a.lng,a.lat]},properties:{id:a.id,type:'auction',label:'A',name:a.name}}));
    const trophyFeatures=trophies.map(t=>({type:'Feature',geometry:{type:'Point',coordinates:[t.lng,t.lat]},properties:{id:t.id,type:'trophy',label:'★',name:t.name}}));
    return {type:'FeatureCollection',features:[...buildings,...auctionFeatures,...trophyFeatures]};
  }

  function removeHtmlMarkers(){try{markerRecords.forEach(r=>r.mk&&r.mk.remove());markerRecords.length=0}catch(e){}}
  function geometryCoords(g){if(!g)return [];if(g.type==='Polygon')return g.coordinates.flat(1);if(g.type==='MultiPolygon')return g.coordinates.flat(2);return []}
  function centerOfGeometry(g){const pts=geometryCoords(g);if(!pts.length)return null;let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;pts.forEach(c=>{if(!Array.isArray(c)||c.length<2)return;minX=Math.min(minX,c[0]);maxX=Math.max(maxX,c[0]);minY=Math.min(minY,c[1]);maxY=Math.max(maxY,c[1])});return isFinite(minX)?[(minX+maxX)/2,(minY+maxY)/2]:null}

  function snapBuildingsToFootprints(){
    if(snapped||!map||!map.getSource(sourceId))return;
    const buildingLayer=map.getLayer('fincity-3d')?'fincity-3d':null;if(!buildingLayer)return;
    let changed=false;
    investment.forEach(p=>{
      const origin=map.project([p.lng,p.lat]),pad=48;let rendered=[];
      try{rendered=map.queryRenderedFeatures([[origin.x-pad,origin.y-pad],[origin.x+pad,origin.y+pad]],{layers:[buildingLayer]})||[]}catch(e){return}
      let best=null,bestDist=Infinity;
      rendered.forEach(f=>{const c=centerOfGeometry(f.geometry);if(!c)return;const px=map.project(c),d=Math.hypot(px.x-origin.x,px.y-origin.y);if(d<bestDist){bestDist=d;best=c}});
      if(best){p.lng=best[0];p.lat=best[1];const feat=collection.features.find(x=>Number(x.properties.id)===p.id);if(feat){feat.geometry.coordinates=best;changed=true}}
    });
    if(changed)map.getSource(sourceId).setData(collection);snapped=true;
  }

  function openFeature(f){if(!f)return;const idNum=Number(f.properties.id),type=f.properties.type;if(type==='trophy')showTrophy(idNum);else if(type==='auction')showAuction(idNum);else showBuilding(idNum)}

  function addPointLayers(){
    if(!map||map.getSource(sourceId))return;removeHtmlMarkers();collection=buildFeatures();map.addSource(sourceId,{type:'geojson',data:collection});
    const colors={owned:'#ff8a30',active:'#7447ed',auction:'#22c8f2',trophy:'#f1c84b'};const textColors={owned:'#ffffff',active:'#ffffff',auction:'#07202a',trophy:'#332800'};
    types.forEach(type=>{
      // Deliberately smaller tap area: users must actually tap the object, not merely navigate nearby.
      map.addLayer({id:hitLayers[type],type:'circle',source:sourceId,filter:['==',['get','type'],type],paint:{'circle-radius':18,'circle-color':'#ffffff','circle-opacity':0.01,'circle-pitch-scale':'viewport'}});
      map.addLayer({id:circleLayers[type],type:'circle',source:sourceId,filter:['==',['get','type'],type],paint:{'circle-radius':['interpolate',['linear'],['zoom'],11,7,13,10,15,13,17,16],'circle-color':colors[type],'circle-stroke-color':'rgba(255,255,255,.82)','circle-stroke-width':2.2,'circle-opacity':.98,'circle-pitch-scale':'viewport'}});
      map.addLayer({id:labelLayers[type],type:'symbol',source:sourceId,filter:['==',['get','type'],type],layout:{'text-field':['get','label'],'text-size':['interpolate',['linear'],['zoom'],11,8,15,11,17,13],'text-font':['Noto Sans Regular'],'text-allow-overlap':true,'text-ignore-placement':true,'text-pitch-alignment':'viewport','text-rotation-alignment':'viewport'},paint:{'text-color':textColors[type],'text-halo-color':'rgba(0,0,0,.18)','text-halo-width':.5}});
      map.on('mouseenter',hitLayers[type],()=>map.getCanvas().style.cursor='pointer');
      map.on('mouseleave',hitLayers[type],()=>map.getCanvas().style.cursor='');
      // Use only MapLibre's click gesture. Do NOT react to touchend, because touchend also fires after pinch/drag navigation.
      map.on('click',hitLayers[type],e=>{if(e.features&&e.features[0])openFeature(e.features[0])});
    });
    map.once('idle',snapBuildingsToFootprints);
  }

  function setTypeVisibility(type,visible){[hitLayers[type],circleLayers[type],labelLayers[type]].forEach(id=>{if(map&&map.getLayer(id))map.setLayoutProperty(id,'visibility',visible?'visible':'none')})}
  window.applyFilter=function(type){document.querySelectorAll('.filter').forEach(b=>b.classList.toggle('active',b.dataset.filter===type));types.forEach(t=>setTypeVisibility(t,type==='all'||type===t))};
  window.refreshFinCityMapData=function(){
    if(!map)return;collection=buildFeatures();snapped=false;
    const src=map.getSource(sourceId);if(src){src.setData(collection);map.once('idle',snapBuildingsToFootprints)}else if(map.loaded()){addPointLayers()}
  };
  function install(){if(!map)return;if(map.loaded())addPointLayers();else map.once('load',addPointLayers)}install();
})();