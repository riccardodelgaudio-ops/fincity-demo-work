// FinCity clean 3D investment map styling.
(function(){
  function hideNoise(){
    if(!window.map||!map.getStyle?.())return;
    const layers=map.getStyle().layers||[];
    layers.forEach(l=>{
      const id=String(l.id||'').toLowerCase();
      if(l.type==='symbol'){
        const noisy=/poi|shop|amenity|restaurant|cafe|bar|parking|park[-_ ]?and[-_ ]?ride|hospital|school|college|university|transit|bus|rail|airport|aeroway|housenumber|house-number|address/.test(id);
        if(noisy){try{map.setLayoutProperty(l.id,'visibility','none')}catch(e){};return}
        try{map.setPaintProperty(l.id,'text-color','#536070')}catch(e){}
        try{map.setPaintProperty(l.id,'text-halo-color','rgba(250,252,255,.96)')}catch(e){}
        try{map.setPaintProperty(l.id,'text-halo-width',1.2)}catch(e){}
        try{map.setPaintProperty(l.id,'icon-opacity',0)}catch(e){}
      }
      if(l.type==='fill'){
        if(id.includes('water')){try{map.setPaintProperty(l.id,'fill-color','#bfd5e2');map.setPaintProperty(l.id,'fill-opacity',1)}catch(e){}}
        else if(/park|grass|wood|forest|landcover/.test(id)){try{map.setPaintProperty(l.id,'fill-color','#dce8df');map.setPaintProperty(l.id,'fill-opacity',.72)}catch(e){}}
        else if(id.includes('building')){try{map.setPaintProperty(l.id,'fill-color','#d9dee5');map.setPaintProperty(l.id,'fill-opacity',.82)}catch(e){}}
      }
      if(l.type==='line'){
        if(/motorway|trunk/.test(id)){try{map.setPaintProperty(l.id,'line-color','#c8d0da');map.setPaintProperty(l.id,'line-opacity',.75)}catch(e){}}
        else if(/road|street/.test(id)){try{map.setPaintProperty(l.id,'line-color','#ffffff');map.setPaintProperty(l.id,'line-opacity',.92)}catch(e){}}
      }
      if(l.type==='background'){try{map.setPaintProperty(l.id,'background-color','#eef2f6')}catch(e){}}
    });
    try{map.setLight({anchor:'viewport',color:'#ffffff',intensity:.5,position:[1.15,210,38]})}catch(e){}
    try{
      if(map.getLayer('fincity-3d')){
        map.setPaintProperty('fincity-3d','fill-extrusion-opacity',.94);
      }
    }catch(e){}
  }
  function forceInvestmentView(){
    if(!window.map)return;
    try{if(map.getLayer('satbase'))map.removeLayer('satbase')}catch(e){}
    try{map.easeTo({pitch:58,bearing:-14,zoom:Math.max(map.getZoom(),14.1),duration:450})}catch(e){}
    hideNoise();
  }
  window.refreshFinCityCleanMap=forceInvestmentView;
  function install(){
    if(!window.map)return setTimeout(install,80);
    const run=()=>setTimeout(forceInvestmentView,120);
    if(map.loaded?.())run();else map.on('load',run);
    map.on?.('styledata',()=>setTimeout(hideNoise,80));
  }
  install();
})();