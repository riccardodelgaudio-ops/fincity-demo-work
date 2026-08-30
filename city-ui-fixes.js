// FinCity city UX fixes: alphabetical selector and reliable city camera changes.
(function(){
  const collator=new Intl.Collator('de-CH',{sensitivity:'base'});

  function cities(){return typeof window.getFinCityCities==='function'?getFinCityCities():[]}
  function cityBySlug(slug){return cities().find(c=>c.slug===slug)||null}

  function sortCitySelector(){
    const select=document.getElementById('citySelector');if(!select||select.dataset.sorted==='1')return;
    const selected=select.value;
    const options=[...select.options].sort((a,b)=>collator.compare(a.textContent,b.textContent));
    options.forEach(o=>select.appendChild(o));
    select.value=selected;select.dataset.sorted='1';
  }

  function focusCity(city,animated=true){
    if(!city||typeof map==='undefined'||!map)return;
    try{map.resize()}catch(e){}
    try{map.stop()}catch(e){}
    const options={center:city.center,zoom:13.7,pitch:48,bearing:-8,duration:animated?800:0,essential:true};
    try{animated?map.flyTo(options):map.jumpTo(options)}catch(e){try{map.jumpTo(options)}catch(err){}}
  }

  const baseSwitch=window.switchCity;
  if(typeof baseSwitch==='function'){
    window.switchCity=function(slug,showOverview){
      const city=cityBySlug(slug);
      const result=baseSwitch(slug,showOverview);
      // Other map refresh layers may run shortly after the data switch. Re-assert the selected city's camera afterwards.
      setTimeout(()=>focusCity(city,true),320);
      setTimeout(()=>{
        if(!city||typeof map==='undefined'||!map)return;
        try{
          const c=map.getCenter();
          if(Math.hypot(c.lng-city.center[0],c.lat-city.center[1])>.03)focusCity(city,false);
        }catch(e){}
      },1350);
      setTimeout(sortCitySelector,120);
      return result;
    };
  }

  const panelEl=document.getElementById('panel');
  if(panelEl){
    new MutationObserver(()=>setTimeout(sortCitySelector,0)).observe(panelEl,{childList:true,subtree:true});
  }
  setTimeout(sortCitySelector,100);
})();
