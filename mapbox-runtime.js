// Mapbox runtime bridge. Loaded immediately after app.js and before the map style finishes loading.
(function(){
  if(window.FINCITY_MAP_PROVIDER!=='mapbox')return;

  // Mapbox Standard already provides premium 3D buildings and lighting.
  // Prevent the legacy OpenFreeMap extrusion and Esri satellite overlay from being added on initial load.
  add3d=function(){};
  satellite=function(){
    if(typeof map==='undefined'||!map)return;
    try{map.setStyle('mapbox://styles/mapbox/standard-satellite')}catch(e){console.warn(e)}
  };
  normalMap=function(){
    if(typeof map==='undefined'||!map)return;
    try{map.setStyle('mapbox://styles/mapbox/standard')}catch(e){console.warn(e)}
  };
})();
