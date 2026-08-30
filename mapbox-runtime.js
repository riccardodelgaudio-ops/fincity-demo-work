// Mapbox runtime bridge. Loaded immediately after app.js and before the map style finishes loading.
(function(){
  if(window.FINCITY_MAP_PROVIDER!=='mapbox')return;

  // Mapbox Standard already provides premium 3D buildings and lighting.
  // Prevent the legacy OpenFreeMap extrusion and Esri raster layer from the old app bootstrap.
  add3d=function(){};
  satellite=function(){};
  normalMap=function(){};
})();
