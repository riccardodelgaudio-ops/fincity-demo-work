// FinCity local player bootstrap. Runs before game-mode.js.
(function(){
  const PKEY="fincity-player-profiles-v1";
  const AKEY="fincity-active-player";
  const GKEY="fincity-auction-game-v1";
  let profiles=[];
  try{profiles=JSON.parse(localStorage.getItem(PKEY)||"[]")}catch(e){}
  if(!Array.isArray(profiles))profiles=[];
  let active=localStorage.getItem(AKEY);
  if(!active){
    active="@Player1";
    localStorage.setItem(AKEY,active);
  }
  if(!profiles.some(p=>p.handle===active))profiles.push({handle:active,createdAt:new Date().toISOString()});
  try{
    const game=JSON.parse(localStorage.getItem(GKEY)||"null");
    if(game&&game.version===1){
      game.wallets=game.wallets||{};
      if(game.wallets[active]===undefined)game.wallets[active]=100;
      game.adminPreview=true;
      localStorage.setItem(GKEY,JSON.stringify(game));
      if(game.wallets["@MyFinCity"]!==undefined&&!profiles.some(p=>p.handle==="@MyFinCity")){
        profiles.push({handle:"@MyFinCity",createdAt:new Date().toISOString(),legacy:true});
      }
    }
  }catch(e){}
  localStorage.setItem(PKEY,JSON.stringify(profiles));
})();