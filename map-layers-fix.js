// FinCity map-layer patch: replace floating HTML markers with native MapLibre layers.
(function(){
  const sourceId='fincity-points';
  const circleLayers={owned:'fincity-owned',active:'fincity-active',auction:'fincity-auction',trophy:'fincity-trophy'};
  const labelLayers={owned:'fincity-owned-label',active:'fincity-active-label',auction:'fincity-auction-label',trophy:'fincity-trophy-label'};

  function features(){
    const buildings=investment.map(p=>({type:'Feature',geometry:{type:'Point',coordinates:[p.lng,p.lat]},properties:{id:p.id,type:p.kind==='owned'?'owned':'active',label:String(p.id),free:free(p),name:p.name}}));
    const auctionFeatures=auctions.map(a=>({type:'Feature',geometry:{type:'Point',coordinates:[a.lng,a.lat]},properties:{id:a.id,type:'auction',label:'A',name:a.name}}));
    const trophyFeatures=trophies.map(t=>({type:'Feature',geometry:{type:'Point',coordinates:[t.lng,t.lat]},properties:{id:t.id,type:'trophy',label:'★',name:t.name}}));
    return {type:'FeatureCollection',features:[...buildings,...auctionFeatures,...trophyFeatures]};
  }

  function removeHtmlMarkers(){
    try{markerRecords.forEach(r=>r.mk&&r.mk.remove());markerRecords.length=0;}catch(e){console.warn('FinCity DOM marker cleanup',e)}
  }

  function addPointLayers(){
    if(!map||map.getSource(sourceId))return;
    removeHtmlMarkers();
    map.addSource(sourceId,{type:'geojson',data:features()});
    const colors={owned:'#ff8a30',active:'#7447ed',auction:'#22c8f2',trophy:'#f1c84b'};
    const textColors={owned:'#ffffff',active:'#ffffff',auction:'#07202a',trophy:'#332800'};
    Object.keys(circleLayers).forEach(type=>{
      map.addLayer({
        id:circleLayers[type],type:'circle',source:sourceId,
        filter:['==',['get','type'],type],
        paint:{
          'circle-radius':['interpolate',['linear'],['zoom'],11,7,13,10,15,13,17,16],
          'circle-color':colors[type],
          'circle-stroke-color':'rgba(255,255,255,.72)',
          'circle-stroke-width':2,
          'circle-opacity':.96,
          'circle-pitch-alignment':'map',
          'circle-pitch-scale':'map'
        }
      });
      map.addLayer({
        id:labelLayers[type],type:'symbol',source:sourceId,
        filter:['==',['get','type'],type],
        layout:{
          'text-field':['get','label'],
          'text-size':['interpolate',['linear'],['zoom'],11,8,15,11,17,13],
          'text-font':['Noto Sans Regular'],
          'text-allow-overlap':true,
          'text-ignore-placement':true,
          'text-pitch-alignment':'map',
          'text-rotation-alignment':'map'
        },
        paint:{'text-color':textColors[type],'text-halo-color':'rgba(0,0,0,.18)','text-halo-width':.5}
      });
    });

    const clickLayerIds=[...Object.values(circleLayers),...Object.values(labelLayers)];
    clickLayerIds.forEach(id=>{
      map.on('mouseenter',id,()=>map.getCanvas().style.cursor='pointer');
      map.on('mouseleave',id,()=>map.getCanvas().style.cursor='');
      map.on('click',id,e=>{
        const f=e.features&&e.features[0];if(!f)return;
        const idNum=Number(f.properties.id),type=f.properties.type;
        if(type==='trophy')showTrophy(idNum);else if(type==='auction')showAuction(idNum);else showBuilding(idNum);
      });
    });
  }

  function setLayerVisibility(type,visible){
    [circleLayers[type],labelLayers[type]].forEach(id=>{if(map&&map.getLayer(id))map.setLayoutProperty(id,'visibility',visible?'visible':'none')});
  }

  window.applyFilter=function(type){
    document.querySelectorAll('.filter').forEach(b=>b.classList.toggle('active',b.dataset.filter===type));
    Object.keys(circleLayers).forEach(t=>setLayerVisibility(t,type==='all'||type===t));
  };

  function install(){
    if(!map)return;
    if(map.loaded())addPointLayers();else map.once('load',addPointLayers);
  }

  // app.js has already created the map; install immediately after that script.
  install();
})();
