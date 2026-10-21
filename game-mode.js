(function fincityGameMode(){
  "use strict";
  // FINCITY is a DIGITAL COLLECTIBLES GAME. Map positions do not convey title to real property.
  const KEY="fincity-auction-game-v1";
  const USER="@MyFinCity";
  const STEP=10;
  const $=id=>document.getElementById(id);
  const money=n=>new Intl.NumberFormat("de-CH",{style:"currency",currency:"CHF",maximumFractionDigits:0}).format(n||0);
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const int=n=>Number.isFinite(Number(n))?Math.max(0,Math.floor(Number(n))):0;
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){return null}};
  let game=load();
  if(!game||game.version!==1)game={version:1,wallets:{[USER]:1000},transactions:[],cities:{},adminPreview:false};
  if(!game.wallets)game.wallets={[USER]:1000};
  if(!game.cities)game.cities={};
  if(!Array.isArray(game.notifications))game.notifications=[];
  if(!Array.isArray(game.transactions))game.transactions=[];
  let currentView="city";
  function save(){try{localStorage.setItem(KEY,JSON.stringify(game))}catch(e){console.warn("FinCity-Demo kann lokal nicht speichern",e)}}
  function city(){return window.getCurrentFinCityCity?.()||{slug:"zurich",name:"Zürich",canton:"ZH"}}
  function weekKey(date=new Date()){
    const d=new Date(date.getFullYear(),date.getMonth(),date.getDate());
    d.setDate(d.getDate()-(d.getDay()+6)%7);
    return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
  }
  function startPrice(units){return units<=4?100:units<=10?200:units<=20?250:300}
  function convertBuilding(p){
    return {id:p.id,name:p.name,holder:p.holder||USER,kind:p.kind,lng:p.lng,lat:p.lat,
      address:p.address||"Standort auf der Karte · Adresse noch nicht verifiziert",
      units:int(p.slots)||null,lastAuctionPrice:int(p.lastAuctionPrice),
      lastAuctionDate:p.lastAuctionDate||"Demo-Historie",historical:true};
  }
  function convertDrop(a,i){
    return {id:a.id,name:a.name,address:a.address||"Standort auf der Karte · Adresse wird verifiziert",
      lng:a.lng,lat:a.lat,units:int(a.slots)||null,
      sizeM2:int(a.sizeM2)||null,startingBid:startPrice(int(a.slots)||4),
      status:i===0?"live":"planned",startedWeek:i===0?weekKey():null,
      bids:[],seller:null,propertyId:null,date:a.date||"Termin folgt"};
  }
  function ensureCity(){
    const slug=city().slug;
    if(!game.cities[slug]){
      const b=investment.map(convertBuilding);
      game.cities[slug]={buildings:b,drops:auctions.map(convertDrop),
        baselineCount:b.length,baselineValue:b.reduce((s,p)=>s+p.lastAuctionPrice,0),
        userCount:Math.max(1,new Set(b.map(p=>p.holder)).size),
        sales:[]};
      save();
    }
    const c=game.cities[slug];
    c.sales||=[];
    c.drops||=[];
    c.buildings||=[];
    return c;
  }
  function quota(c){return Math.min(10,2+Math.floor(Math.max(0,int(c.userCount))/250))}
  function used(c){return c.drops.filter(a=>a.startedWeek===weekKey()).length}
  function available(c){return Math.max(0,quota(c)-used(c))}
  function balance(who=USER){return int(game.wallets[who])}
  function reserved(who=USER){return Object.values(game.cities).reduce((s,c)=>s+c.drops.reduce((v,a)=>{
    const top=highest(a);return v+(a.status==="live"&&top?.user===who?top.amount:0);
  },0),0)}
  function freeBalance(){return Math.max(0,balance()-reserved())}
  function highest(a){return a.bids?.length?[...a.bids].sort((x,y)=>y.amount-x.amount)[0]:null}
  function bidFloor(a){return Math.max(a.startingBid||100,(highest(a)?.amount||0)+STEP)}
  function globalBase(){
    // Stable historical seed totals, independent of which city the user has visited.
    const cities=window.getFinCityCities?.()||[];
    const zurich= [520,650,760,980,690,840,470,1450,610,890,1210,730,1020,580,410];
    let count=0,value=0;
    cities.forEach((c,i)=>{
      if(c.slug==="zurich"){count+=zurich.length;value+=zurich.reduce((a,b)=>a+b,0)}
      else {count+=8;for(let x=0;x<8;x++)value+=460+x*105+(i%6)*35}
    });
    return {count,value};
  }
  function globalStats(){
    const base=globalBase();
    Object.values(game.cities).forEach(c=>{
      base.count+=c.buildings.length-c.baselineCount;
      base.value+=c.buildings.reduce((s,b)=>s+int(b.lastAuctionPrice),0)-c.baselineValue;
    });
    return base;
  }
  function syncMap(){
    const c=ensureCity();
    investment.splice(0,investment.length,...c.buildings.map(b=>({
      ...b,slots:b.units||0,occupied:0,kind:b.holder===USER?"owned":"active"
    })));
    auctions.splice(0,auctions.length,...c.drops.filter(a=>a.status==="live"||a.status==="planned").map(a=>({
      ...a,slots:a.units||0
    })));
    try{window.refreshFinCityMapData?.()}catch(e){}
    updateHeader();
  }
  function updateHeader(){
    const t=globalStats();const c=ensureCity();
    const values=document.querySelectorAll(".stats b");
    if(values[0])values[0].textContent=t.count.toLocaleString("de-CH");
    if(values[1])values[1].textContent=money(t.value);
    if(values[2])values[2].textContent=c.drops.filter(a=>a.status==="live").length;
    const little=document.querySelector(".brand small");
    if(little)little.textContent=`${city().name.toUpperCase()} · DIGITALE IMMOBILIEN · SPIEL`;
    const top=$("portfolioTop");
    if(top)top.textContent=`MEIN KONTO · ${money(freeBalance())}`;
    const alerts=document.querySelector(".nav-btn[data-view=alerts] b");
    if(alerts)alerts.textContent=`MELDUNGEN${game.notifications.filter(n=>!n.read).length?` (${game.notifications.filter(n=>!n.read).length})`:""}`;
  }
  function activate(view){
    currentView=view;
    document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  }
  function citySelect(){
    const list=(window.getFinCityCities?.()||[]).sort((a,b)=>a.name.localeCompare(b.name,"de-CH"));
    return `<label class="eyebrow" for="citySelector">STADT WÄHLEN</label>
      <select class="fc-input" id="citySelector">${list.map(c=>`<option value="${esc(c.slug)}" ${c.slug===city().slug?"selected":""}>${esc(c.name)} (${esc(c.canton)})</option>`).join("")}</select>`;
  }
  function onCitySelect(){
    const select=$("citySelector");
    if(select)select.onchange=e=>window.switchCity(e.target.value,true);
  }
  function disclaimer(){
    return `<p class="fc-disclaimer">SPIEL-DEMO · Kauf und Besitz betreffen ausschliesslich digitale FinCity-Spielobjekte an realen Kartenstandorten. Kein Eigentum und keine Rechte an der realen Immobilie. Keine echten Zahlungen.</p>`;
  }
  function showCity(){
    activate("city");const c=ensureCity(),t=globalStats();
    openPanel(`<div class="eyebrow">FINCITY · DIGITALE STADTWELT</div><h2>Entdecke ${esc(city().name)}</h2>
      ${citySelect()}<div class="fc-hero"><span>WÖCHENTLICHE CITY DROPS</span><strong>${quota(c)} Auktionen</strong><small>${used(c)} von ${quota(c)} Freigaben gestartet · ${c.userCount} aktive Demo-Spieler</small></div>
      <div class="grid2"><div class="metric"><span>PLATTFORMWEIT VERKAUFT</span><strong>${t.count}</strong></div><div class="metric"><span>DIGITALER PLATTFORMWERT</span><strong>${money(t.value)}</strong></div></div>
      <div class="card"><strong>Knappheit nach Spielerzahl</strong><div class="note">Je Stadt werden zunächst 2 Spiel-Immobilien pro Woche freigegeben. Pro 250 aktiven Spielern kommt 1 weiterer City Drop dazu, maximal 10 pro Woche. Neue Auktionen startet ausschliesslich die Administration.</div></div>
      <div class="card"><strong>Nächste Auktionen · ${esc(city().name)}</strong>
        ${c.drops.filter(a=>a.status==="live"||a.status==="planned").slice(0,4).map(a=>`<div class="owned-row fc-click" data-auction="${esc(a.id)}"><span><strong>${esc(a.name)}</strong><div class="rankmeta">${a.status==="live"?"🔴 LIVE":"⏳ GEPLANT"} · ab ${money(a.startingBid)}</div></span><b>→</b></div>`).join("")||'<div class="note">Zurzeit keine weiteren Auktionsobjekte.</div>'}
      </div>
      <button class="action" id="cityAuctions">ALLE AUKTIONEN ANSEHEN</button>
      ${disclaimer()}`);
    onCitySelect();
    $("cityAuctions").onclick=showAuctions;
    panel.querySelectorAll("[data-auction]").forEach(el=>el.onclick=()=>showAuction(el.dataset.auction));
  }
  function dropList(c){
    return c.drops.filter(a=>a.status!=="cancelled").map(a=>{
      const top=highest(a),label=a.status==="live"?"🔴 LIVE":a.status==="planned"?"⏳ GEPLANT":a.status==="sold"?"✓ VERKAUFT":"BEENDET";
      return `<div class="active-row fc-click" data-auction="${esc(a.id)}"><div><strong>${esc(a.name)}</strong>
        <div class="rankmeta">${esc(a.address)}</div>
        <div class="rankmeta">${a.units??"–"} Wohneinheiten (nur Grösse) · ${a.sizeM2?`${a.sizeM2} m²`:"m² unbekannt"} · ${label}</div></div>
        <div class="fc-pricecol"><div class="eyebrow">${top?"HÖCHSTGEBOT":"STARTPREIS"}</div><div class="price">${money(top?.amount||a.startingBid)}</div></div></div>`;
    }).join("");
  }
  function showAuctions(){
    activate("auctions");const c=ensureCity();
    openPanel(`<div class="eyebrow">CITY DROPS · ${esc(city().name).toUpperCase()}</div><h2>Immobilien-Auktionen</h2>
      <div class="fc-hero"><span>KNAPPE FREIGABEN</span><strong>${used(c)} / ${quota(c)} diese Woche</strong><small>${available(c)} weitere Starts durch Admin möglich</small></div>
      <p class="note">Jedes Los ist ein <strong>ganzes digitales Gebäude</strong> – keine mietbaren Wohnungen, keine Asset Allocation.</p>
      <div class="active-list">${dropList(c)}</div><button class="action secondary" id="auctionAdmin">ADMINISTRATION (DEMO)</button>
      ${disclaimer()}`);
    panel.querySelectorAll("[data-auction]").forEach(el=>el.onclick=()=>showAuction(el.dataset.auction));
    $("auctionAdmin").onclick=showAdmin;
  }
  function showAuction(id,flash=""){
    const c=ensureCity(),a=c.drops.find(x=>String(x.id)===String(id));
    if(!a)return showAuctions();
    activate("auctions");
    const top=highest(a),mine=top?.user===USER,live=a.status==="live";
    const min=bidFloor(a);
    openPanel(`<div class="eyebrow">CITY DROP · ${esc(city().name).toUpperCase()} · ${esc(a.status).toUpperCase()}</div><h2>${esc(a.name)}</h2>
      ${flash?`<div class="fc-flash" role="status">${esc(flash)}</div>`:""}
      <div class="card"><div class="previewrow"><span>Standort</span><b>${esc(a.address)}</b></div>
        <div class="previewrow"><span>Objekt</span><b>Ganzes digitales Gebäude</b></div>
        <div class="previewrow"><span>Wohneinheiten (Grössenklasse)</span><b>${a.units??"nicht verifiziert"}</b></div>
        <div class="previewrow"><span>Gebäudefläche</span><b>${a.sizeM2?`${a.sizeM2} m²`:"nicht verifiziert"}</b></div>
        <div class="previewrow"><span>Startpreis</span><b>${money(a.startingBid)}</b></div>
        <div class="previewrow"><span>Status</span><b>${a.status==="live"?"Auktion läuft":a.status==="planned"?"Noch nicht freigegeben":a.status==="sold"?"Verkauft":"Beendet"}</b></div>
        ${a.seller?`<div class="previewrow"><span>Verkäufer</span><b>${esc(a.seller)}</b></div>`:""}
      </div>
      <div class="grid2"><div class="metric"><span>AKTUELLER PREIS</span><strong>${money(top?.amount||a.startingBid)}</strong></div>
        <div class="metric"><span>GEBOTE</span><strong>${a.bids.length}</strong></div></div>
      ${live?`<div class="card"><strong>${mine?"Du führst die Auktion":"Mitbieten"}</strong>
        <p class="note">Verfügbares Demo-Guthaben: ${money(freeBalance())}${mine?` · reserviertes Höchstgebot: ${money(top.amount)}`:""}</p>
        ${a.seller===USER?'<p class="note">Eigene Immobilien können nicht selbst ersteigert werden.</p>':
        `<label class="eyebrow" for="bidAmount">DEIN GEBOT IN CHF · MINDESTENS ${money(min)}</label>
        <input class="fc-input" id="bidAmount" type="number" min="${min}" step="10" value="${min}">
        <button class="action" id="placeBid">VERBINDLICHES DEMO-GEBOT PLATZIEREN</button>`}</div>`:""}
      ${a.status==="sold"?`<div class="card"><strong>Verkauft an ${esc(top?.user||"–")}</strong><div class="note">Digitales Objekt · Zuschlag ${money(top?.amount||a.startingBid)}</div></div>`:""}
      ${game.adminPreview&&live?'<button class="action secondary" id="closeAuction">AUKTION ALS DEMO-ADMIN BEENDEN</button>':""}
      <button class="action secondary" id="mapThisAuction">AUF KARTE ANSEHEN</button>
      ${disclaimer()}`);
    const submit=$("placeBid");if(submit)submit.onclick=()=>placeBid(a.id,Number($("bidAmount").value));
    const close=$("closeAuction");if(close)close.onclick=()=>finishAuction(a.id);
    $("mapThisAuction").onclick=()=>{safeFly(a.lng,a.lat);closePanel()};
  }
  function placeBid(id,amount){
    const c=ensureCity(),a=c.drops.find(x=>String(x.id)===String(id));
    if(!a||a.status!=="live")return showAuctions();
    if(a.seller===USER)return showAuction(id,"Du kannst nicht auf dein eigenes Objekt bieten.");
    if(!Number.isSafeInteger(amount)||amount<bidFloor(a)||amount%STEP!==0)return showAuction(id,`Mindestgebot ${money(bidFloor(a))}, in Schritten von CHF ${STEP}.`);
    const previous=highest(a)?.user===USER?highest(a).amount:0;
    if(amount>freeBalance()+previous)return showAuction(id,"Dein verfügbares Demo-Guthaben reicht für dieses Gebot nicht aus.");
    a.bids.push({user:USER,amount,at:new Date().toISOString()});save();updateHeader();
    showAuction(id,`Gebot ${money(amount)} gespeichert. Der Betrag ist bis Auktionsende im Demo-Konto reserviert.`);
  }
  function finishAuction(id){
    if(!game.adminPreview)return showAdmin();
    const c=ensureCity(),a=c.drops.find(x=>String(x.id)===String(id));
    if(!a||a.status!=="live")return showAdmin();
    const top=highest(a);
    if(!top){a.status="expired";save();syncMap();showAuctions();return}
    if(balance(top.user)<top.amount && top.user===USER)return showAuction(id,"Fehler: Guthaben für das Höchstgebot fehlt.");
    if(top.user===USER)game.wallets[USER]-=top.amount;
    if(a.seller)game.wallets[a.seller]=balance(a.seller)+top.amount;
    const existing=a.propertyId?c.buildings.find(b=>String(b.id)===String(a.propertyId)):null;
    const previousPrice=existing?int(existing.lastAuctionPrice):0;
    const record={id:a.id,propertyId:a.propertyId||a.id,name:a.name,amount:top.amount,buyer:top.user,
      seller:a.seller,at:new Date().toISOString(),resale:Boolean(a.propertyId),previousPrice,resaleGain:existing?top.amount-previousPrice:null};
    c.sales.push(record);
    a.status="sold";
    if(a.propertyId){
      const b=c.buildings.find(b=>String(b.id)===String(a.propertyId));
      if(b){b.holder=top.user;b.lastAuctionPrice=top.amount;b.lastAuctionDate=new Date().toLocaleDateString("de-CH");b.previousPrice=previousPrice;b.kind=b.holder===USER?"owned":"active"}
    }else{
      c.buildings.push({id:a.id,name:a.name,holder:top.user,kind:top.user===USER?"owned":"active",
        lng:a.lng,lat:a.lat,address:a.address,units:a.units,
        lastAuctionPrice:top.amount,lastAuctionDate:new Date().toLocaleDateString("de-CH"),historical:false});
    }
    game.transactions.push({type:"purchase",amount:-top.amount,title:a.name,at:record.at});
    save();syncMap();showAuction(id,"Auktion abgeschlossen. Das digitale Gebäude wurde dem Käufer zugeordnet.");
  }
  function showActive(){
    activate("active");const c=ensureCity(),rows=[...c.buildings].sort((a,b)=>b.lastAuctionPrice-a.lastAuctionPrice);
    openPanel(`<div class="eyebrow">DIGITALE IMMOBILIEN · ${esc(city().name).toUpperCase()}</div><h2>Verkaufte Gebäude</h2>
      <p class="note">Jedes Gebäude ist ein einzelnes, vollständig handelbares Spielobjekt. Immobilien sind keine echten Eigentumsrechte.</p>
      <div class="active-list">${rows.map(b=>`<div class="active-row fc-click" data-building="${esc(b.id)}"><div><strong>${esc(b.name)}</strong>
        <div class="rankmeta">Besitzer: ${esc(b.holder)}</div><div class="rankmeta">${esc(b.address)}</div></div>
        <div class="fc-pricecol"><div class="eyebrow">LETZTER ZUSCHLAG</div><div class="price">${money(b.lastAuctionPrice)}</div></div></div>`).join("")}</div>${disclaimer()}`);
    panel.querySelectorAll("[data-building]").forEach(el=>el.onclick=()=>showBuilding(el.dataset.building));
  }
  function showBuilding(id,flash=""){
    const c=ensureCity(),b=c.buildings.find(x=>String(x.id)===String(id));
    if(!b)return showActive();
    const mine=b.holder===USER;
    const pending=c.drops.some(a=>String(a.propertyId)===String(b.id)&&["live","planned"].includes(a.status));
    activate("active");
    openPanel(`<div class="eyebrow">DIGITALES SPIELGEBÄUDE · ${esc(city().name)}</div><h2>${esc(b.name)}</h2>
      ${flash?`<div class="fc-flash">${esc(flash)}</div>`:""}
      <div class="grid2"><div class="metric"><span>LETZTER KAUFPREIS</span><strong>${money(b.lastAuctionPrice)}</strong></div>
        <div class="metric"><span>SPIEL-BESITZER</span><strong class="fc-holder">${esc(b.holder)}</strong></div></div>
      <div class="card"><div class="previewrow"><span>Standort</span><b>${esc(b.address)}</b></div>
        <div class="previewrow"><span>Letzter Verkauf</span><b>${esc(b.lastAuctionDate)}</b></div>
        <div class="previewrow"><span>Digitaler Anzeigewert</span><b>${money(b.lastAuctionPrice)}</b></div>
        <div class="note">Anzeigewert = letzter Auktionspreis, keine Schätzung eines aktuellen Marktwerts der realen Immobilie.</div></div>
      ${mine&&!pending?`<div class="card"><strong>Dein Gebäude weiterverkaufen</strong>
          <p class="note">Du kannst es zur erneuten digitalen Auktion vorschlagen. Ein Admin muss den City Drop freigeben.</p>
          <label class="eyebrow" for="resalePrice">STARTPREIS (CHF)</label>
          <input id="resalePrice" class="fc-input" type="number" min="10" step="10" value="${Math.max(10,Math.ceil(b.lastAuctionPrice/10)*10)}">
          <button class="action" id="requestResale">ZUR AUKTION VORMERKEN</button></div>`:""}
      ${pending?'<div class="card"><div class="note">Dieses Gebäude ist bereits für eine digitale Auktion vorgemerkt.</div></div>':""}
      <button class="action secondary" id="buildingMap">STANDORT AUF KARTE</button>
      ${disclaimer()}`);
    const resale=$("requestResale");if(resale)resale.onclick=()=>requestResale(id,Number($("resalePrice").value));
    $("buildingMap").onclick=()=>{safeFly(b.lng,b.lat);closePanel()};
  }
  function requestResale(id,price){
    const c=ensureCity(),b=c.buildings.find(x=>String(x.id)===String(id));
    if(!b||b.holder!==USER)return showActive();
    if(!Number.isSafeInteger(price)||price<10||price%10!==0)return showBuilding(id,"Startpreis muss mindestens CHF 10 betragen und durch 10 teilbar sein.");
    if(c.drops.some(a=>String(a.propertyId)===String(b.id)&&["live","planned"].includes(a.status)))return showBuilding(id,"Dieses Haus ist bereits vorgemerkt.");
    const auctionId=`resale-${Date.now()}-${b.id}`;
    c.drops.push({id:auctionId,name:b.name,address:b.address,lng:b.lng,lat:b.lat,
      units:b.units,startingBid:price,status:"planned",startedWeek:null,bids:[],
      seller:USER,propertyId:b.id,date:"Nach Admin-Freigabe"});
    save();syncMap();showBuilding(id,"Wiederverkauf vorgemerkt. Ein Demo-Admin kann die Auktion innerhalb des Wochenlimits starten.");
  }
  function showPortfolio(){
    activate("portfolio");const c=ensureCity(),owned=c.buildings.filter(b=>b.holder===USER);
    const worth=owned.reduce((s,b)=>s+b.lastAuctionPrice,0);
    openPanel(`<div class="eyebrow">MEIN SPIELKONTO</div><h2>${USER}</h2>
      <div class="grid2"><div class="metric"><span>DEMO-GUTHABEN</span><strong>${money(balance())}</strong></div>
      <div class="metric"><span>FÜR GEBOTE VERFÜGBAR</span><strong>${money(freeBalance())}</strong></div></div>
      <div class="grid2" style="margin-top:9px"><div class="metric"><span>MEINE IMMOBILIEN · ${esc(city().name)}</span><strong>${owned.length}</strong></div>
      <div class="metric"><span>KAUFPREISSUMME</span><strong>${money(worth)}</strong></div></div>
      <div class="card"><strong>Meine Häuser in ${esc(city().name)}</strong>
       ${owned.map(b=>`<div class="owned-row fc-click" data-building="${esc(b.id)}"><span><strong>${esc(b.name)}</strong><div class="rankmeta">Letzter Auktionspreis ${money(b.lastAuctionPrice)}</div></span><b>→</b></div>`).join("")||'<div class="note">In dieser Stadt besitzt du noch keine digitalen Gebäude.</div>'}</div>
      <button class="action" id="topupWallet">GUTHABEN AUFLADEN</button>
      <div class="card"><strong>Persönliches Konto</strong><div class="note">Reservierte Gebote: ${money(reserved())}. Guthaben und Auktionen dieser Version werden ausschliesslich lokal im Browser simuliert.</div></div>
      ${disclaimer()}`);
    panel.querySelectorAll("[data-building]").forEach(el=>el.onclick=()=>showBuilding(el.dataset.building));
    $("topupWallet").onclick=showWallet;
  }
  function showWallet(flash=""){
    activate("portfolio");
    openPanel(`<div class="eyebrow">SPIELKONTO · DEMO-ZAHLUNGEN</div><h2>Guthaben aufladen</h2>
      ${flash?`<div class="fc-flash">${esc(flash)}</div>`:""}
      <div class="fc-hero"><span>AKTUELLES DEMO-GUTHABEN</span><strong>${money(balance())}</strong><small>Davon verfügbar: ${money(freeBalance())} · ${money(reserved())} reserviert</small></div>
      <div class="card"><strong>Testguthaben hinzufügen</strong><div class="fc-topup-grid">
        <button class="action secondary" data-topup="100">+ CHF 100</button>
        <button class="action secondary" data-topup="500">+ CHF 500</button>
        <button class="action secondary" data-topup="1000">+ CHF 1'000</button>
      </div></div>
      <div class="card"><strong>💳 Kreditkarte</strong><div class="note">Eine echte Kreditkartenzahlung ist in dieser Browser-Demo noch nicht angeschlossen. Keine Kartendaten eingeben – es findet keine Abbuchung statt.</div>
      <button class="action secondary" disabled>KREDITKARTE · NOCH NICHT VERFÜGBAR</button></div>
      <button class="action secondary" id="returnAccount">ZURÜCK ZU MEINEM KONTO</button>${disclaimer()}`);
    panel.querySelectorAll("[data-topup]").forEach(b=>b.onclick=()=>{
      const amount=int(b.dataset.topup);
      game.wallets[USER]=balance()+amount;
      game.transactions.push({type:"demo-credit",amount,title:"Testguthaben",at:new Date().toISOString()});
      save();updateHeader();showWallet(`${money(amount)} Testguthaben gutgeschrieben. Keine echte Zahlung.`);
    });
    $("returnAccount").onclick=showPortfolio;
  }
  function showRanking(){
    activate("ranking");const c=ensureCity(),year=new Date().getFullYear();
    const historic=c.buildings.filter(b=>b.historical&&!c.sales.some(s=>String(s.propertyId)===String(b.id))&&String(b.lastAuctionDate||"").includes(String(year))).map(b=>({
      name:b.name,buyer:b.holder,amount:b.lastAuctionPrice
    }));
    const newSales=c.sales.filter(s=>new Date(s.at).getFullYear()===year);
    const top=[...historic,...newSales].sort((a,b)=>b.amount-a.amount).slice(0,10);
    const resales=newSales.filter(s=>s.resale&&s.previousPrice>0).sort((a,b)=>(b.resaleGain/b.previousPrice)-(a.resaleGain/a.previousPrice));
    openPanel(`<div class="eyebrow">CITY CHALLENGES · ${esc(city().name)}</div><h2>Jahres-Bestenliste ${year}</h2>
      <div class="card"><strong>🏆 Höchster Auktionszuschlag</strong>
        ${top.map((r,i)=>`<div class="rankrow"><b>#${i+1}</b><span><strong>${esc(r.buyer)}</strong><div class="rankmeta">${esc(r.name)}</div></span><span class="rankret">${money(r.amount)}</span></div>`).join("")||'<p class="note">Noch keine Verkäufe in diesem Jahr.</p>'}</div>
      <div class="card"><strong>🔁 Bester Wiederverkauf · ${year}</strong>
 ${resales.map((r,i)=>`<div class="rankrow"><b>#${i+1}</b><span><strong>${esc(r.seller||"–")}</strong><div class="rankmeta">${esc(r.name)} · ${money(r.previousPrice)} → ${money(r.amount)}</div></span><span class="rankret">${r.resaleGain>=0?"+":""}${Math.round(r.resaleGain/r.previousPrice*100)} %</span></div>`).join("")||'<p class="note">Noch keine Wiederverkäufe in diesem Jahr.</p>'}
<div class="note">Für die spätere Auszeichnung zählen nur faire Verkäufe zwischen unabhängigen Spielern mit Mindesthaltedauer. Diese Regeln sind noch ein Vorschlag.</div></div>
      <div class="card"><strong>Preisideen statt Investment-Rendite</strong><div class="note">Die Bestenliste belohnt Gameplay: Rekordzuschlag, gute Verkäufe und Sammlungserfolge. Es zählen digitale Spiel-Auktionen und Sammlererfolge.</div></div>${disclaimer()}`);
  }
  function showTrophy(id){
    const t=trophies.find(t=>String(t.id)===String(id));
    if(!t)return showTrophies();
    activate("trophies");
    openPanel(`<div class="eyebrow">CITY MONUMENT · ${esc(city().name)}</div><h2>🏛️ ${esc(t.name)}</h2>
      <div class="card"><strong>Sammlerauszeichnung · nicht kaufbar</strong><p class="note">Dieses reale Wahrzeichen ist eine mögliche digitale Siegertrophäe im Stadtspiel. Es ist kein Gebäude zum Kaufen und überträgt keine Rechte am Original.</p></div>
      <div class="card"><strong>Vorschlag für die Vergabe</strong><p class="note">Jahres-Rekord bei Auktionen, fairster Wiederverkauf oder besondere Stadterfolge. Regeln und Anti-Manipulationsprüfungen werden noch festgelegt.</p></div>
      <button class="action secondary" id="backMonuments">ALLE MONUMENTE</button>${disclaimer()}`);
    $("backMonuments").onclick=showTrophies;
  }
  function showTrophies(){
    activate("trophies");
    openPanel(`<div class="eyebrow">MONUMENTE & AUSZEICHNUNGEN · ${esc(city().name)}</div><h2>Die Stadt der Champions</h2>
      <div class="card"><strong>Monumente werden gewonnen – nicht gekauft.</strong>
       <div class="note">Auszeichnungen für die höchste Jahresauktion, den besten fairen Wiederverkauf oder Stadtsammler. Kriterien und Preise sind Konzeptvorschläge, noch keine automatische Vergabe.</div></div>
      <div class="trophygrid">${trophies.map(t=>`<div class="trophy fc-click" data-trophy="${esc(t.id)}"><b>🏛️ ${esc(t.name)}</b><div class="rankmeta">PRESTIGE · PREISREGEL IN PLANUNG</div></div>`).join("")}</div>${disclaimer()}`);
    panel.querySelectorAll("[data-trophy]").forEach(el=>el.onclick=()=>showTrophy(el.dataset.trophy));
  }
  function showAlerts(){
  activate("alerts");
  game.notifications.forEach(n=>n.read=true);save();updateHeader();
  openPanel(`<div class="eyebrow">CITY DROPS · SPIEL-MELDUNGEN</div><h2>🔔 Neue Auktionen</h2>
    <div class="card"><strong>Aktivitäten</strong><div class="note">Neue digitale Auktionen erscheinen nach Admin-Start hier. Diese Demo speichert Meldungen nur lokal auf deinem Gerät. Echte Push-Nachrichten an andere Spieler benötigen ein Backend und eine aktive Zustimmung.</div></div>
    <div class="card">${game.notifications.map(n=>`<div class="owned-row"><span><strong>${esc(n.title)}</strong><div class="rankmeta">${esc(n.city)} · ${new Date(n.at).toLocaleString("de-CH")}</div></span><b>🔔</b></div>`).join("")||'<p class="note">Noch keine neuen City-Drop-Meldungen.</p>'}</div>
    <button class="action secondary" id="alertAuctions">AUKTIONEN ANSEHEN</button>${disclaimer()}`);
  $("alertAuctions").onclick=showAuctions;
}
  function showAdmin(flash=""){
    activate("admin");const c=ensureCity();
    openPanel(`<div class="eyebrow">ADMINISTRATION · NUR SIMULATION</div><h2>City Drops verwalten</h2>
      ${flash?`<div class="fc-flash">${esc(flash)}</div>`:""}
      <div class="card"><strong>Demo-Administrator</strong><p class="note">Der Schalter dient nur zum Ausprobieren. Er ist keine echte Anmeldung und schützt keine Daten. Im Produkt müssen Rollen und Starts serverseitig geprüft werden.</p>
      <button class="action ${game.adminPreview?"secondary":""}" id="toggleAdmin">${game.adminPreview?"DEMO-ADMIN-MODUS VERLASSEN":"DEMO-ADMIN-MODUS AKTIVIEREN"}</button></div>
      <div class="grid2"><div class="metric"><span>SPIELER · ${esc(city().name)}</span><strong>${c.userCount}</strong></div>
      <div class="metric"><span>WOCHENLIMIT</span><strong>${used(c)} / ${quota(c)}</strong></div></div>
      ${game.adminPreview?`<div class="card"><strong>Knappheit simulieren</strong><p class="note">2 Auktionen pro Woche + 1 pro 250 aktiven Spielern (maximal 10).</p>
      <label class="eyebrow" for="activeUsers">AKTIVE SPIELER IN DIESER STADT (DEMO)</label>
      <input class="fc-input" id="activeUsers" type="number" min="1" max="100000" value="${c.userCount}">
      <button class="action secondary" id="applyUsers">SPIELERZAHL ÜBERNEHMEN</button></div>
      <div class="card"><strong>Zur Freigabe vorgemerkt</strong>
        ${c.drops.filter(a=>a.status==="planned").map(a=>`<div class="owned-row"><span><strong>${esc(a.name)}</strong><div class="rankmeta">${money(a.startingBid)} · ${esc(a.address)}</div></span><button class="fc-small" data-start="${esc(a.id)}" ${available(c)<=0?"disabled":""}>STARTEN</button></div>`).join("")||'<p class="note">Keine weiteren Objekte vorgemerkt.</p>'}</div>
      <div class="card"><strong>Laufende Auktionen abschliessen</strong>
        ${c.drops.filter(a=>a.status==="live").map(a=>`<div class="owned-row"><span><strong>${esc(a.name)}</strong><div class="rankmeta">${a.bids.length} Gebote</div></span><button class="fc-small" data-finish="${esc(a.id)}">BEENDEN</button></div>`).join("")||'<p class="note">Keine Auktionen laufen.</p>'}</div>`:""}
      <button class="action secondary" id="backAuctions">ZUR AUKTIONSLISTE</button>${disclaimer()}`);
    $("toggleAdmin").onclick=()=>{game.adminPreview=!game.adminPreview;save();showAdmin()};
    const users=$("applyUsers");if(users)users.onclick=()=>{
      const n=int($("activeUsers").value);
      if(n<1||n>100000)return showAdmin("Bitte 1 bis 100'000 Demo-Spieler angeben.");
      c.userCount=n;save();showAdmin("Wochenlimit anhand der Spielerzahl neu berechnet.");
    };
    panel.querySelectorAll("[data-start]").forEach(btn=>btn.onclick=()=>startAuction(btn.dataset.start));
    panel.querySelectorAll("[data-finish]").forEach(btn=>btn.onclick=()=>finishAuction(btn.dataset.finish));
    $("backAuctions").onclick=showAuctions;
  }
  function startAuction(id){
    if(!game.adminPreview)return showAdmin("Nur der Demo-Admin darf Auktionen starten.");
    const c=ensureCity(),a=c.drops.find(x=>String(x.id)===String(id));
    if(!a||a.status!=="planned")return showAdmin("Dieses Los kann nicht gestartet werden.");
    if(available(c)<=0)return showAdmin("Wochenlimit erreicht. Starte keine weiteren Auktionen in dieser Stadt.");
    a.status="live";a.startedWeek=weekKey();a.date="Jetzt live · vom Admin freigegeben";
    game.notifications.unshift({title:`Neue Auktion: ${a.name}`,city:city().name,at:new Date().toISOString(),read:false});
    if(game.notifications.length>50)game.notifications.length=50;
    save();syncMap();showAdmin(`${a.name} wurde als Demo-Auktion gestartet. Die neue In-App-Meldung steht unter «Meldungen».`);
  }
  function initNavigation(){
    const mappings={city:showCity,auctions:showAuctions,alerts:showAlerts,active:showActive,portfolio:showPortfolio,ranking:showRanking,trophies:showTrophies,admin:showAdmin};
    document.querySelectorAll(".nav-btn").forEach(btn=>{
      if(btn.dataset.view==="fees"){btn.remove();return}
      btn.onclick=()=>mappings[btn.dataset.view]?.();
    });
    const top=$("portfolioTop");if(top)top.onclick=showPortfolio;
    document.querySelectorAll(".filter").forEach(btn=>btn.onclick=()=>{
      const f=btn.dataset.filter;
      if(f==="owned"){showPortfolio();applyFilter("owned")}
      else if(f==="active"){showActive();applyFilter("active")}
      else if(f==="auction"){showAuctions();applyFilter("auction")}
      else if(f==="trophy"){showTrophies();applyFilter("trophy")}
      else{showCity();applyFilter("all")}
    });
    const mapmode=$("investMapBtn");if(mapmode){mapmode.textContent="STADTKARTE";mapmode.title="Digitale Immobilien auf der echten Karte"}
  }
  // Override the legacy views, which previously displayed return, risk, tenants and asset-allocation.
  window.showCity=showCity;window.showAuctions=showAuctions;window.showAuction=showAuction;
  window.showActive=showActive;window.showBuilding=showBuilding;
  window.showPortfolio=showPortfolio;window.showRanking=showRanking;window.showUser=showPortfolio;
  window.showFees=showWallet;window.showSystem=showTrophies;window.showTrophy=showTrophy;
  window.showTrophyRanking=showTrophies;window.showAlerts=showAlerts;
  window.copyStrategy=showPortfolio;
  const previousSwitch=window.switchCity;
  window.switchCity=function(slug,overview=false){
    if(typeof previousSwitch==="function")previousSwitch(slug,false);
    ensureCity();syncMap();
    if(overview)setTimeout(showCity,145);
  };
  initNavigation();
  ensureCity();syncMap();
  save();
})();