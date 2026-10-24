// FinCity local multi-player manager. Shared browser world, separate CHF play-money wallets.
(function(){
  const PKEY="fincity-player-profiles-v1";
  const AKEY="fincity-active-player";
  const GKEY="fincity-auction-game-v1";
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const money=n=>new Intl.NumberFormat("de-CH",{style:"currency",currency:"CHF",maximumFractionDigits:0}).format(Number(n)||0);
  function active(){return localStorage.getItem(AKEY)||"@Player1"}
  function profiles(){try{return JSON.parse(localStorage.getItem(PKEY)||"[]")}catch(e){return []}}
  function game(){try{return JSON.parse(localStorage.getItem(GKEY)||"null")}catch(e){return null}}
  function saveProfiles(rows){localStorage.setItem(PKEY,JSON.stringify(rows))}
  function normalize(v){
    const x=String(v||"").trim().replace(/^@+/,"").replace(/\s+/g,"");
    return /^[A-Za-z0-9ÄÖÜäöü_-]{3,20}$/.test(x)?"@"+x:null;
  }
  function create(v){
    const handle=normalize(v);if(!handle)return {ok:false,msg:"Bitte 3–20 Zeichen verwenden: Buchstaben, Zahlen, _ oder -."};
    const rows=profiles();if(rows.some(p=>p.handle.toLowerCase()===handle.toLowerCase()))return {ok:false,msg:"Dieser Spielername existiert auf diesem Gerät bereits."};
    rows.push({handle,createdAt:new Date().toISOString()});saveProfiles(rows);
    const g=game()||{version:1,wallets:{},transactions:[],cities:{},notifications:[],adminPreview:true};
    g.wallets=g.wallets||{};g.wallets[handle]=100;g.adminPreview=true;
    g.transactions=g.transactions||[];g.transactions.push({type:"player-created",user:handle,amount:100,title:"Startguthaben",at:new Date().toISOString()});
    localStorage.setItem(GKEY,JSON.stringify(g));localStorage.setItem(AKEY,handle);
    location.reload();
  }
  function switchTo(handle){
    if(!profiles().some(p=>p.handle===handle))return;
    const g=game();if(g){g.wallets=g.wallets||{};if(g.wallets[handle]===undefined)g.wallets[handle]=100;g.adminPreview=true;localStorage.setItem(GKEY,JSON.stringify(g))}
    localStorage.setItem(AKEY,handle);location.reload();
  }
  function openPlayers(flash=""){
    const rows=profiles(),g=game()||{wallets:{}};const current=active();
    openPanel('<div class="eyebrow">FINCITY · SPIELER</div><h2>Spielerprofil</h2>'+
      (flash?'<div class="fc-flash">'+esc(flash)+'</div>':'')+
      '<div class="card"><strong>Neuen Spieler erstellen</strong><div class="note">Jeder neue Spieler startet mit <b>CHF 100 Spielgeld</b>. Alle Spieler auf diesem Gerät teilen dieselbe FinCity-Spielwelt und können gegeneinander bieten.</div>'+
      '<label class="eyebrow" for="fcNewPlayer">SPIELERNAME</label><input id="fcNewPlayer" class="fc-input" maxlength="20" placeholder="z. B. CityInvestor">'+
      '<button class="action" id="fcCreatePlayer">SPIELER ERSTELLEN · CHF 100</button></div>'+
      '<div class="card"><strong>Spieler auf diesem Gerät</strong>'+
      rows.map(p=>'<div class="owned-row"><span><strong>'+esc(p.handle)+'</strong><div class="rankmeta">'+money((g.wallets||{})[p.handle]||0)+' Spielgeld'+(p.handle===current?' · AKTIV':'')+'</div></span><button class="fc-small" data-local-player="'+esc(p.handle)+'">'+(p.handle===current?'AKTIV':'WECHSELN')+'</button></div>').join('')+
      '</div><button class="action secondary" id="fcBackAccount">ZURÜCK ZUM KONTO</button><p class="fc-disclaimer">Lokale Spielprofile · keine Registrierung, kein Passwort und kein echtes Geld.</p>');
    $("fcCreatePlayer").onclick=()=>{const h=normalize($("fcNewPlayer").value);if(!h)return openPlayers("Bitte einen gültigen Spielernamen eingeben.");create(h)};
    panel.querySelectorAll("[data-local-player]").forEach(b=>b.onclick=()=>{if(b.dataset.localPlayer!==current)switchTo(b.dataset.localPlayer)});
    $("fcBackAccount").onclick=()=>window.showPortfolio?showPortfolio():closePanel();
  }
  window.showFinCityPlayers=openPlayers;

  function decorateAccount(){
    if(!panel||panel.querySelector(".fc-player-card"))return;
    const title=panel.querySelector("h2");if(!title||!panel.textContent.includes("MEIN SPIELKONTO"))return;
    const card=document.createElement("div");card.className="card fc-player-card";
    card.innerHTML='<strong>👤 Aktiver Spieler</strong><div class="previewrow"><span>Profil</span><b>'+esc(active())+'</b></div><button class="action secondary" id="fcManagePlayers">SPIELER WECHSELN / NEU</button>';
    const topup=$("topupWallet");if(topup)panel.insertBefore(card,topup);else panel.appendChild(card);
    $("fcManagePlayers").onclick=()=>openPlayers();
  }
  function cleanWallet(){
    if(!panel||!panel.textContent.includes("Guthaben aufladen"))return;
    panel.querySelectorAll('[data-topup="500"],[data-topup="1000"]').forEach(x=>x.remove());
    panel.querySelectorAll(".card").forEach(c=>{if(c.textContent.includes("Kreditkarte"))c.remove()});
    const h=panel.querySelector("h2");if(h)h.textContent="CHF 100 Spielgeld nachladen";
  }
  const obs=new MutationObserver(()=>{decorateAccount();cleanWallet()});
  if(panel)obs.observe(panel,{childList:true,subtree:true});

  const css=document.createElement("style");css.textContent="#toggleAdmin{display:none!important}.fc-player-card{margin-top:10px}";
  document.head.appendChild(css);

  const top=document.getElementById("portfolioTop");if(top)top.title="Spielkonto von "+active();
})();