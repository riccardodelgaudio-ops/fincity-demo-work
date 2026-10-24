// FinCity local party-player bootstrap. Runs before game-mode.js.
(function(){
  const PKEY="fincity-player-profiles-v1";
  const AKEY="fincity-active-player";
  const GKEY="fincity-auction-game-v1";
  const PARTYKEY="fincity-party-pack-v2";
  const PARTY=["@Player1","@Player2","@Player3","@Player4"];
  const START=1000;

  let profiles=[];
  try{profiles=JSON.parse(localStorage.getItem(PKEY)||"[]")}catch(e){}
  if(!Array.isArray(profiles))profiles=[];

  let active=localStorage.getItem(AKEY);
  if(!active){active="@Player1";localStorage.setItem(AKEY,active)}

  PARTY.forEach(handle=>{
    if(!profiles.some(p=>p.handle===handle))profiles.push({handle,createdAt:new Date().toISOString(),party:true});
  });
  if(!profiles.some(p=>p.handle===active))profiles.push({handle:active,createdAt:new Date().toISOString()});

  let game=null;
  try{game=JSON.parse(localStorage.getItem(GKEY)||"null")}catch(e){}
  if(!game||game.version!==1)game={version:1,wallets:{},transactions:[],cities:{},notifications:[],adminPreview:true};
  game.wallets=game.wallets||{};
  game.transactions=game.transactions||[];
  game.notifications=game.notifications||[];
  game.cities=game.cities||{};
  game.adminPreview=true;

  // One-time party grant: four ready-to-play accounts with CHF 1'000 each.
  if(localStorage.getItem(PARTYKEY)!=="ready"){
    PARTY.forEach(handle=>{
      game.wallets[handle]=START;
      game.transactions.push({type:"party-start",user:handle,amount:START,title:"Party-Startguthaben",at:new Date().toISOString()});
    });
    localStorage.setItem(PARTYKEY,"ready");
  } else {
    PARTY.forEach(handle=>{if(game.wallets[handle]===undefined)game.wallets[handle]=START});
  }

  if(game.wallets[active]===undefined)game.wallets[active]=START;

  if(game.wallets["@MyFinCity"]!==undefined&&!profiles.some(p=>p.handle==="@MyFinCity")){
    profiles.push({handle:"@MyFinCity",createdAt:new Date().toISOString(),legacy:true});
  }

  localStorage.setItem(PKEY,JSON.stringify(profiles));
  localStorage.setItem(GKEY,JSON.stringify(game));
})();