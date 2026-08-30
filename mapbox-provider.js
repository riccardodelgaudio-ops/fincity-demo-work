// Optional Mapbox Standard bootstrap for FinCity.
// A public token can be supplied via window.FINCITY_MAPBOX_TOKEN,
// localStorage key fincity-mapbox-token, or ?mapbox_token=pk....
(function(){
  function cleanToken(v){return String(v||'').trim()}
  const params=new URLSearchParams(location.search);
  const queryToken=cleanToken(params.get('mapbox_token'));
  if(queryToken.startsWith('pk.')){
    try{localStorage.setItem('fincity-mapbox-token',queryToken)}catch(e){}
    params.delete('mapbox_token');
    const q=params.toString();
    try{history.replaceState({},'',location.pathname+(q?'?'+q:'')+location.hash)}catch(e){}
  }
  let token=cleanToken(window.FINCITY_MAPBOX_TOKEN);
  if(!token){try{token=cleanToken(localStorage.getItem('fincity-mapbox-token'))}catch(e){}}

  window.FINCITY_MAP_PROVIDER='maplibre';
  window.FINCITY_MAPBOX_READY=false;

  if(!token.startsWith('pk.')||!window.mapboxgl)return;

  try{
    mapboxgl.accessToken=token;
    const NativeMap=mapboxgl.Map;
    class FinCityMapboxMap extends NativeMap{
      constructor(options){
        super(Object.assign({},options,{
          style:'mapbox://styles/mapbox/standard',
          pitch:48,
          bearing:-8,
          config:{basemap:{
            theme:'faded',
            lightPreset:'day',
            font:'Inter',
            showPointOfInterestLabels:false,
            showTransitLabels:false,
            showPedestrianRoads:false,
            show3dObjects:true,
            show3dBuildings:true,
            show3dTrees:false,
            show3dLandmarks:false,
            show3dFacades:true,
            colorBuildingHighlight:'#7d68e8',
            colorBuildingSelect:'#6b4ce0',
            colorBuildings:'#d7dce3',
            colorLand:'#eef1f4',
            colorWater:'#c7dbe5',
            colorRoads:'#ffffff',
            colorMotorways:'#c6cdd7'
          }}
        }));
      }
    }
    mapboxgl.Map=FinCityMapboxMap;
    window.maplibregl=mapboxgl;
    window.FINCITY_MAP_PROVIDER='mapbox';
    window.FINCITY_MAPBOX_READY=true;
    window.FINCITY_MAPBOX_TOKEN=token;
  }catch(e){
    console.warn('FinCity Mapbox bootstrap fallback',e);
    window.FINCITY_MAP_PROVIDER='maplibre';
    window.FINCITY_MAPBOX_READY=false;
  }
})();
