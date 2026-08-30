// Final map controls when Mapbox Standard is active.
(function(){
  if(window.FINCITY_MAP_PROVIDER!=='mapbox')return;
  let base='standard';

  function setButtons(mode){
    const ids=['investMapBtn','satBtn','mapBtn'];ids.forEach(id=>document.getElementById(id)?.classList.remove('active'));
    document.getElementById(mode==='invest'?'investMapBtn':mode==='satellite'?'satBtn':'mapBtn')?.classList.add('active');
  }

  function configStandard(threeD){
    try{
      map.setConfigProperty('basemap','theme','faded');
      map.setConfigProperty('basemap','lightPreset','day');
      map.setConfigProperty('basemap','showPointOfInterestLabels',false);
      map.setConfigProperty('basemap','showTransitLabels',false);
      map.setConfigProperty('basemap','showPedestrianRoads',false);
      map.setConfigProperty('basemap','show3dObjects',!!threeD);
      map.setConfigProperty('basemap','show3dBuildings',!!threeD);
      map.setConfigProperty('basemap','show3dTrees',false);
      map.setConfigProperty('basemap','show3dLandmarks',false);
      map.setConfigProperty('basemap','show3dFacades',!!threeD);
      map.setConfigProperty('basemap','colorBuildingHighlight','#8b7af0');
      map.setConfigProperty('basemap','colorBuildingSelect','#6b4ce0');
      map.setConfigProperty('basemap','colorBuildings','#d7dce3');
      map.setConfigProperty('basemap','colorLand','#eef1f4');
      map.setConfigProperty('basemap','colorWater','#c7dbe5');
    }catch(e){}
  }

  function rehydrate(after){
    setTimeout(()=>{try{if(typeof refreshFinCityMapData==='function')refreshFinCityMapData()}catch(e){};if(after)setTimeout(after,180)},180);
  }

  function invest(){
    setButtons('invest');
    if(base!=='standard'){
      base='standard';map.setStyle('mapbox://styles/mapbox/standard');
      map.once('style.load',()=>{configStandard(true);rehydrate(()=>{try{if(typeof refreshPremiumMap==='function')refreshPremiumMap()}catch(e){}})});
    }else{configStandard(true);try{map.easeTo({pitch:48,bearing:-8,duration:600})}catch(e){}}
  }

  function twoD(){
    setButtons('2d');
    const finish=()=>{configStandard(false);try{map.easeTo({pitch:0,bearing:0,duration:600})}catch(e){}};
    if(base!=='standard'){
      base='standard';map.setStyle('mapbox://styles/mapbox/standard');map.once('style.load',()=>rehydrate(finish));
    }else finish();
  }

  function satellite(){
    setButtons('satellite');
    if(base!=='satellite'){
      base='satellite';map.setStyle('mapbox://styles/mapbox/standard-satellite');
      map.once('style.load',()=>{
        try{map.setConfigProperty('basemap','lightPreset','day');map.setConfigProperty('basemap','showPointOfInterestLabels',false);map.setConfigProperty('basemap','showTransitLabels',false);map.setConfigProperty('basemap','showRoadLabels',true)}catch(e){}
        rehydrate(()=>{try{map.easeTo({pitch:54,bearing:-10,duration:600})}catch(e){}});
      });
    }
  }

  function bind(){
    const i=document.getElementById('investMapBtn'),s=document.getElementById('satBtn'),f=document.getElementById('mapBtn');
    if(i)i.onclick=invest;if(s)s.onclick=satellite;if(f)f.onclick=twoD;
  }

  bind();
  const ready=()=>{base='standard';configStandard(true);setButtons('invest')};
  if(map.loaded())ready();else map.on('load',ready);
})();
