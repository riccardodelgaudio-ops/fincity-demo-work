(function fincityGameMode(){
  "use strict";
  // FINCITY is a DIGITAL COLLECTIBLES GAME. Map positions do not convey title to real property.
  const KEY="fincity-auction-game-v1";
  const USER="@MyFinCity";
  const STEP=10;
  const weekly=window.FinCityWeekly;
  if(!weekly)throw new Error("FinCity weekly timetable module is missing.");
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
  function weekKey(date=new Date()){return weekly.weekKey(date.getTime())}
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
      status:"planned",startedWeek:null,
      bids:[],seller:null,propertyId:null,date:a.date||"Termin folgt"};
  }
  function ensureCity(){
    const slug=city().slug;
    if(!game.cities[slug]){
      const b=investment.map(convertBuilding);
      game.cities[slug]={buildings:b,drops:auctions.map(convertDrop),
        baselineCount:b.length,baselineValue:b.reduce((s,p)=>s+p.lastAuctionPrice,0),
        userCount:Math.max(1,new Set(b.map(p=>p.holder)).size),
        sales:[],weeklySchedules:{},scheduleVersion:1,name:city().name,slug};
      save();
    }
    const c=game.cities[slug];
    c.sales||=[];
    c.requests||=[];
    c.drops||=[];
    c.buildings||=[];
    c.weeklySchedules||={};
    c.name=city().name;c.slug=slug;
    if(!c.scheduleVersion){
      // Older browser saves predate timed city auctions. Preserve bought houses,
      // but move un-timed live demos back to the eligible, unstarted pool.
      c.drops.forEach(a=>{
        if(a.status==="live"&&!a.endsAt){
          a.status=(a.bids||[]).length?"expired":"planned";
          a.startedWeek=null;
        }
      });
      c.scheduleVersion=1;save();
    }
    return c;
  }
  function quota(){return 3}
  function used(c){return c.drops.filter(a=>a.startedWeek===weekKey()).length}
  function available(c){return Math.max(0,quota()-used(c))}
  function balance(who=USER){return int(game.wallets[who])}
  function reserved(who=USER){return Object.values(game.cities).reduce((s,c)=>s+c.drops.reduce((v,a)=>{
    const top=highest(a);return v+(a.status==="live"&&top?.user===who?top.amount:0);
  },0),0)}
  function freeBalance(){return Math.max(0,balance()-reserved())}
  function highest(a){return a.bids?.length?[...a.bids].sort((x,y)=>y.amount-x.amount)[0]:null}
  function bidFloor(a){return Math.max(a.startingBid||100,(highest(a)?.amount||0)+STEP)}
  function assetKey(a){return String(a.assetId??a.propertyId??a.id)}
  function createRetryDrop(cityMarket,expired){
  if(expired.status!=="expired")return expired;
  const existingIds=new Set(cityMarket.drops.map(a=>String(a.id)));
  let id=Math.max(1000,Number(cityMarket.nextAuctionId)||1000);
  while(existingIds.has(String(id)))id++;
  cityMarket.nextAuctionId=id+1;
  const a={
    ...expired,id,assetId:assetKey(expired),retryOf:expired.id,
    status:"planned",bids:[],scheduledWeek:null,
    slotIndex:null,startsAt:null,endsAt:null,startedWeek:null,
    date:"Neu geplant",
  };
  cityMarket.drops.push(a);
  return a;
}
  function eligibleDrop(c,a,exclude){
  if(exclude.has(String(a.id)))return false;
  if(a.status!=="planned" && !(a.status==="expired"&&!(a.bids||[]).length))return false;
  // An unsold building may be listed again, but only its newest auction record
  // is eligible. Historical expired auctions remain immutable.
  const newest=c.drops.filter(other=>assetKey(other)===assetKey(a)).slice(-1)[0];
  if(newest!==a)return false;
  if(!a.propertyId && c.buildings.some(b=>String(b.id)===String(assetKey(a))))return false;
  if(a.propertyId && !c.buildings.some(b=>String(b.id)===String(a.propertyId)&&b.holder===a.seller))return false;
  return true;
}
  function ensureWeekSchedule(c,week,now=weekly.now()){
  const newlyCreated=!c.weeklySchedules[week];
  if(newlyCreated)c.weeklySchedules[week]=weekly.slots(week).map(s=>({...s,auctionId:null}));
  const lineup=c.weeklySchedules[week];
  const busy=new Set();
  Object.entries(c.weeklySchedules).forEach(([w,slots])=>{
    slots.forEach(s=>{
      if(s.auctionId && ((w===week)||(s.endsAt>now)))busy.add(String(s.auctionId));
    });
  });
  let changed=newlyCreated;
  lineup.forEach(s=>{
    if(s.auctionId || s.blocked || (!newlyCreated&&now>=s.startsAt))return;
    const pool=c.drops.filter(a=>eligibleDrop(c,a,busy));
    const picked=weekly.shuffled(pool,`${c.slug}|${week}|${s.index}|${c.shuffleNonce||0}`)[0];
    if(!picked)return;
    const chosen=createRetryDrop(c,picked);
    busy.add(String(chosen.id));
    s.auctionId=chosen.id;
    chosen.status="planned";
    chosen.bids=[];
    chosen.scheduledWeek=week;
    chosen.slotIndex=s.index;
    chosen.startsAt=s.startsAt;
    chosen.endsAt=s.endsAt;
    chosen.startedWeek=null;
    changed=true;
  });
  if(changed)save();
  return lineup;
}
  function upcomingSlots(c,now=weekly.now()){
  const week=weekly.weekKey(now);
  const todaySlots=ensureWeekSchedule(c,week,now).filter(s=>s.endsAt>now);
  if(todaySlots.length>=3)return todaySlots.slice(0,3);
  const following=weekly.nextWeek(week);
  const nextSlots=ensureWeekSchedule(c,following,now);
  return [...todaySlots,...nextSlots].slice(0,3);
}
  function auctionBySlot(c,s){return c.drops.find(a=>String(a.id)===String(s.auctionId))||null}
  function slotBadge(a,s,now=weekly.now()){
  if(!a)return "OFFEN";
  if(a.status==="sold")return "VERKAUFT";
  if(a.status==="expired")return "OHNE GEBOT";
  if(now<s.startsAt)return "BALD";
  if(now<s.endsAt)return "LIVE";
  return "BEENDET";
}
  function slotHtml(c,s,compact=false){
  const a=auctionBySlot(c,s),status=slotBadge(a,s),enabled=Boolean(a);
  const start=weekly.format(s.startsAt),end=weekly.format(s.endsAt);
  const title=a?esc(a.name):"Gebäude wird noch ausgewählt";
  const address=a?esc(a.address):"Weitere reale Kartenstandorte werden geprüft";
  const price=a?money(highest(a)?.amount||a.startingBid):"–";
  return `<button type="button" class="fc-schedule-slot ${compact?"compact":""}" ${enabled?`data-upcoming-auction="${esc(a.id)}"`:"disabled"}
      aria-label="${esc(s.startDay)} bis ${esc(s.endDay)} um 20 Uhr: ${title}, ${status}">
      <span class="fc-slot-badge ${status==="LIVE"?"live":""}">${status}</span>
      <span class="fc-slot-time">${esc(s.startDay)} 20:00 <span aria-hidden="true">→</span> ${esc(s.endDay)} 20:00</span>
      <strong>${title}</strong>
      ${compact?"":`<small>${address}</small>`}
      <span class="fc-slot-foot"><span>Start ${esc(start)} · Ende ${esc(end)}</span>${a?`<b>${price}</b>`:""}</span>
    </button>`;
}
  function bindUpcoming(scope){
  scope.querySelectorAll("[data-upcoming-auction]").forEach(el=>el.onclick=()=>showAuction(el.dataset.upcomingAuction));
}
  function renderUpcomingWidget(){
  const widget=$("upcomingDrops");
  if(!widget)return;
  const c=ensureCity();
  widget.innerHTML=`<div class="fc-upcoming-title"><span>🔨 NÄCHSTE CITY DROPS</span><b>${esc(city().name)}</b></div>
    <div class="fc-upcoming-items">${upcomingSlots(c).map(s=>slotHtml(c,s,true)).join("")}</div>
    <button class="fc-upcoming-all" type="button" id="allUpcomingAuctions">ALLE AUKTIONEN →</button>
    <small class="fc-upcoming-note">Alle Zeiten Schweiz · MEZ/MESZ · Spiel-Demo</small>`;
  bindUpcoming(widget);
  $("allUpcomingAuctions").onclick=showAuctions;
}
  function settleAuction(c,a,now=weekly.now()){
  if(!a||a.status!=="live")return false;
  const top=highest(a);
  if(!top){a.status="expired";return true}
  if(top.user===USER && balance(USER)<top.amount){
    a.status="expired";
    a.error="Demo-Guthaben reichte beim Auktionsende nicht aus.";
    return true;
  }
  if(top.user===USER)game.wallets[USER]=balance(USER)-top.amount;
  if(a.seller)game.wallets[a.seller]=balance(a.seller)+top.amount;
  const existing=a.propertyId?c.buildings.find(b=>String(b.id)===String(a.propertyId)):null;
  const previousPrice=existing?int(existing.lastAuctionPrice):0;
  const soldAt=new Date(now).toISOString();
  c.sales.push({
    id:a.id,propertyId:a.propertyId||a.id,name:a.name,amount:top.amount,buyer:top.user,
    seller:a.seller,at:soldAt,resale:Boolean(a.propertyId),previousPrice,
    resaleGain:existing?top.amount-previousPrice:null
  });
  a.status="sold";
  if(existing){
    existing.holder=top.user;
    existing.lastAuctionPrice=top.amount;
    existing.lastAuctionDate=new Date(now).toLocaleDateString("de-CH",{timeZone:weekly.zone});
    existing.previousPrice=previousPrice;
    existing.kind=top.user===USER?"owned":"active";
  }else{
    c.buildings.push({
      id:a.id,name:a.name,holder:top.user,kind:top.user===USER?"owned":"active",
      lng:a.lng,lat:a.lat,address:a.address,units:a.units,
      lastAuctionPrice:top.amount,lastAuctionDate:new Date(now).toLocaleDateString("de-CH",{timeZone:weekly.zone}),historical:false
    });
  }
  game.transactions.push({type:"purchase",amount:-top.amount,title:a.name,at:soldAt});
  return true;
}
  function syncScheduledAuctions(redraw=false){
  const now=weekly.now(),c=ensureCity();
  ensureWeekSchedule(c,weekly.weekKey(now),now);
  let changed=false;
  Object.values(game.cities).forEach(market=>{
    market.drops.forEach(a=>{
      if(!Number.isFinite(a.startsAt)||!Number.isFinite(a.endsAt))return;
      if(a.status==="planned"&&now>=a.endsAt){
        a.status="expired";changed=true;
      }else if(a.status==="planned"&&now>=a.startsAt){
        a.status="live";
        a.startedWeek=a.scheduledWeek;
        game.notifications.unshift({
          title:`Neue Auktion: ${a.name}`,city:market.name||market.slug,at:new Date(now).toISOString(),read:false
        });
        changed=true;
      }
      if(a.status==="live"&&now>=a.endsAt)changed=settleAuction(market,a,now)||changed;
    });
  });
  if(game.notifications.length>50)game.notifications.length=50;
  if(changed)save();
  // Populate preview for next week when fewer than three current windows remain.
  upcomingSlots(c,now);
  if(changed)syncMap();
  else {updateHeader();renderUpcomingWidget()}
  if(changed&&redraw){
    if(currentView==="city")showCity();
    else if(currentView==="auctions")showAuctions();
    else if(currentView==="admin")showAdmin();
    else if(currentView==="active")showActive();
    else if(currentView==="portfolio")showPortfolio();
  }
  return changed;
}
  function adminSelectSlot(index,id,week=weekly.weekKey(weekly.now())){
  if(!game.adminPreview)return showAdmin("Nur die Demo-Administration kann City Drops auswählen.");
  const c=ensureCity();
  const slots=ensureWeekSchedule(c,week),s=slots.find(x=>x.index===index);
  if(!s||weekly.now()>=s.startsAt)return showAdmin("Dieses Auktionsfenster hat bereits begonnen und ist gesperrt.");
  let selected=id?c.drops.find(a=>String(a.id)===String(id)):null;
  if(id&&!selected)return showAdmin("Gebäude nicht gefunden.");
  const blocked=new Set();
  Object.entries(c.weeklySchedules).forEach(([k,others])=>{
    others.forEach(other=>{
      if(other!==s&&other.auctionId&&other.endsAt>weekly.now())blocked.add(String(other.auctionId));
    });
  });
  if(selected && !eligibleDrop(c,selected,blocked) && String(s.auctionId)!==String(selected.id))
    return showAdmin("Dieses digitale Gebäude ist bereits anderswo eingeplant oder nicht mehr verfügbar.");
  const old=auctionBySlot(c,s);
  if(old&&String(old.id)!==String(id)){
    old.status="planned";old.scheduledWeek=null;old.startsAt=null;old.endsAt=null;old.slotIndex=null;
  }
  if(selected?.status==="expired")selected=createRetryDrop(c,selected);
  s.auctionId=selected?selected.id:null;
  s.blocked=!id;
  if(selected){
    selected.status="planned";selected.bids=[];
    selected.scheduledWeek=week;selected.slotIndex=index;
    selected.startsAt=s.startsAt;selected.endsAt=s.endsAt;selected.startedWeek=null;
  }
  save();syncMap();showAdmin(id?"Auktionsobjekt für dieses Zeitfenster festgelegt.":"Das Zeitfenster ist noch ohne Gebäude.");
}
  function adminShuffle(week=weekly.weekKey(weekly.now())){
  if(!game.adminPreview)return showAdmin("Nur die Demo-Administration darf neue Objekte auswählen.");
  const c=ensureCity(),slots=ensureWeekSchedule(c,week);
  let count=0;
  slots.forEach(s=>{
    if(weekly.now()>=s.startsAt)return;
    const a=auctionBySlot(c,s);
    if(a){
      a.status="planned";a.startsAt=null;a.endsAt=null;
      a.scheduledWeek=null;a.slotIndex=null;
    }
    s.auctionId=null;s.blocked=false;count++;
  });
  if(!count)return showAdmin("Alle drei Starttermine dieser Woche sind bereits vergangen. Keine nachträgliche Neuauswahl.");
  c.shuffleNonce=(c.shuffleNonce||0)+1;
  ensureWeekSchedule(c,week,weekly.now());
  save();syncMap();showAdmin("Zufällige Auswahl für noch nicht gestartete City Drops aktualisiert.");
}
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
    auctions.splice(0,auctions.length,...c.drops.filter(a=>a.scheduledWeek && ["live","planned"].includes(a.status) && (!a.endsAt||a.endsAt>weekly.now())).map(a=>({
      ...a,slots:a.units||0
    })));
    try{window.refreshFinCityMapData?.()}catch(e){}
    updateHeader();renderUpcomingWidget();
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
  activate("city");
  const c=ensureCity(),stats=globalStats(),now=weekly.now(),slots=upcomingSlots(c,now);
  openPanel(`<div class="eyebrow">FINCITY · DIGITALE STADTWELT</div><h2>Entdecke ${esc(city().name)}</h2>
    ${citySelect()}
    <div class="fc-hero">
      <span>WÖCHENTLICHE CITY DROPS · ${esc(city().name).toUpperCase()}</span>
      <strong>3 Versteigerungen pro Woche</strong>
      <small>Montag → Freitag, Dienstag → Samstag, Mittwoch → Sonntag · jeweils 20:00 Uhr (Schweizer Zeit)</small>
    </div>
    <div class="grid2"><div class="metric"><span>PLATTFORMWEIT VERKAUFT</span><strong>${stats.count}</strong></div>
      <div class="metric"><span>DIGITALER PLATTFORMWERT</span><strong>${money(stats.value)}</strong></div></div>
    <div class="card fc-next-section">
      <div class="fc-section-heading"><strong>🔨 Nächste Auktionen</strong><span>MEZ / MESZ</span></div>
      <p class="note">Für jede Stadt werden unterschiedliche digitale Gebäude aus dem freigegebenen Bestand ausgewählt. Einmal angekündigte Objekte bleiben bis zum Auktionsende fest zugeteilt.</p>
      <div class="fc-schedule-list">${slots.map(s=>slotHtml(c,s)).join("")}</div>
    </div>
    <button class="action" id="cityAuctions">ALLE AUKTIONEN IN ${esc(city().name).toUpperCase()}</button>
    <div class="card"><strong>Warum sind Immobilien knapp?</strong>
      <div class="note">Pro Stadt gibt es zunächst drei feste, zeitversetzte City Drops pro Woche. Die Auswahl wechselt aus noch nicht verkauften, freigegebenen Spielgebäuden. Neue Standorte können vorgeschlagen werden; nur die Administration gibt sie frei. Zusätzliche Freigaben abhängig von Spielerzahlen sind für eine spätere Version vorgesehen.</div></div>
    ${disclaimer()}`);
  onCitySelect();
  $("cityAuctions").onclick=showAuctions;
  bindUpcoming(panel);
}
  function dropList(c){
  const archive=c.drops.filter(a=>a.status==="sold"||a.status==="expired")
    .sort((a,b)=>(b.endsAt||0)-(a.endsAt||0)).slice(0,6);
  return archive.map(a=>{
    const top=highest(a);
    return `<button type="button" class="fc-archive-row" data-auction="${esc(a.id)}">
      <span><strong>${esc(a.name)}</strong><small>${esc(a.address)}</small></span>
      <span><b>${a.status==="sold"?money(top?.amount||a.startingBid):"Ohne Verkauf"}</b>
      <small>${a.endsAt?esc(weekly.format(a.endsAt)):"Historie"}</small></span></button>`;
  }).join("")||'<p class="note">In dieser Stadt gibt es noch keine abgeschlossenen digitalen Auktionen.</p>';
}
  function showAuctions(){
  activate("auctions");const c=ensureCity(),now=weekly.now();
  const week=weekly.weekKey(now);
  const allThisWeek=ensureWeekSchedule(c,week,now);
  const next=upcomingSlots(c,now);
  openPanel(`<div class="eyebrow">CITY DROPS · ${esc(city().name).toUpperCase()}</div><h2>Immobilien-Auktionen</h2>
    <div class="fc-hero"><span>STADTAUKTIONEN · 20:00 UHR (SCHWEIZ)</span>
      <strong>3 feste Zeitfenster</strong>
      <small>Mo 20:00–Fr 20:00 · Di 20:00–Sa 20:00 · Mi 20:00–So 20:00</small>
    </div>
    <div class="card fc-next-section"><div class="fc-section-heading"><strong>🔨 Nächste & laufende Auktionen</strong><span>${esc(city().name)}</span></div>
      <div class="fc-schedule-list">${next.map(s=>slotHtml(c,s)).join("")}</div></div>
    <div class="card"><strong>Wochenplan · ab ${esc(weekly.formatDay(allThisWeek[0].startsAt))}</strong>
      <p class="note">Alle drei Termine werden aus einem begrenzten Bestand digitaler Spielgebäude zusammengestellt. Diese Uhrzeiten gelten für jede Stadt.</p>
      <div class="fc-schedule-list">${allThisWeek.map(s=>slotHtml(c,s,true)).join("")}</div></div>
    <div class="card"><strong>Zuletzt abgeschlossen</strong><div class="fc-archive-list">${dropList(c)}</div></div>
    <button class="action secondary" id="auctionAdmin">AUKTIONSPLAN VERWALTEN (DEMO-ADMIN)</button>
    ${disclaimer()}`);
  bindUpcoming(panel);
  panel.querySelectorAll("[data-auction]").forEach(el=>el.onclick=()=>showAuction(el.dataset.auction));
  $("auctionAdmin").onclick=showAdmin;
}
  function showAuction(id,flash=""){
  const c=ensureCity(),a=c.drops.find(x=>String(x.id)===String(id));
  if(!a)return showAuctions();
  activate("auctions");
  const top=highest(a),mine=top?.user===USER;
  const now=weekly.now(),live=a.status==="live"&&now>=a.startsAt&&now<a.endsAt;
  const min=bidFloor(a),scheduled=Number.isFinite(a.startsAt)&&Number.isFinite(a.endsAt);
  const start=scheduled?weekly.format(a.startsAt)+" (Schweiz)":"Noch nicht eingeplant";
  const end=scheduled?weekly.format(a.endsAt)+" (Schweiz)":"Noch nicht eingeplant";
  const status=a.status==="live"?"🔴 LIVE":a.status==="planned"?"⏳ GEPLANT":
    a.status==="sold"?"✓ VERKAUFT":a.status==="expired"?"BEENDET · OHNE VERKAUF":"BEENDET";
  openPanel(`<div class="eyebrow">CITY DROP · ${esc(city().name).toUpperCase()} · ${status}</div><h2>${esc(a.name)}</h2>
    ${flash?`<div class="fc-flash" role="status">${esc(flash)}</div>`:""}
    <div class="fc-auction-schedule"><div><small>START</small><strong>${esc(start)}</strong></div>
      <div><small>ENDE</small><strong>${esc(end)}</strong></div></div>
    <div class="card"><div class="previewrow"><span>Standort</span><b>${esc(a.address)}</b></div>
      <div class="previewrow"><span>Objekt</span><b>Ganzes digitales Spielgebäude</b></div>
      <div class="previewrow"><span>Wohneinheiten (Grössenklasse)</span><b>${a.units??"nicht verifiziert"}</b></div>
      <div class="previewrow"><span>Gebäudefläche</span><b>${a.sizeM2?`${a.sizeM2} m²`:"nicht verifiziert"}</b></div>
      <div class="previewrow"><span>Startpreis</span><b>${money(a.startingBid)}</b></div>
      <div class="previewrow"><span>Status</span><b>${status}</b></div>
      ${a.seller?`<div class="previewrow"><span>Verkäufer</span><b>${esc(a.seller)}</b></div>`:""}</div>
    <div class="grid2"><div class="metric"><span>AKTUELLER PREIS</span><strong>${money(top?.amount||a.startingBid)}</strong></div>
      <div class="metric"><span>GEBOTE</span><strong>${a.bids.length}</strong></div></div>
    ${a.status==="planned"?`<div class="card"><strong>⏰ Diese Auktion startet automatisch am angegebenen Termin</strong>
      <p class="note">Die Administration wählt das digitale Gebäude im Voraus aus. Gebote sind ab ${esc(start)} bis ${esc(end)} möglich.</p></div>`:""}
    ${live?`<div class="card"><strong>${mine?"Du führst die Auktion":"Mitbieten"}</strong>
      <p class="note">Verfügbares Demo-Guthaben: ${money(freeBalance())}${mine?` · reserviertes Höchstgebot: ${money(top.amount)}`:""}</p>
      ${a.seller===USER?'<p class="note">Eigene Immobilien können nicht selbst ersteigert werden.</p>':
      `<label class="eyebrow" for="bidAmount">DEIN GEBOT · MINDESTENS ${money(min)}</label>
      <input class="fc-input" id="bidAmount" type="number" min="${min}" step="10" value="${min}">
      <button class="action" id="placeBid">DEMO-GEBOT ABGEBEN</button>`}</div>`:""}
    ${a.status==="sold"?`<div class="card"><strong>✓ Verkauft an ${esc(top?.user||"–")}</strong>
      <p class="note">Digitale Immobilie · Zuschlag ${money(top?.amount||a.startingBid)} · ${esc(end)}</p></div>`:""}
    ${a.status==="expired"?`<div class="card"><strong>Diese Auktion ist beendet</strong><p class="note">Es wurde kein gültiger Zuschlag erteilt. Das Gebäude kann in einer späteren Woche erneut freigegeben werden.</p></div>`:""}
    <button class="action secondary" id="mapThisAuction">AUF KARTE ANSEHEN</button>
    ${disclaimer()}`);
  const submit=$("placeBid");if(submit)submit.onclick=()=>placeBid(a.id,Number($("bidAmount").value));
  $("mapThisAuction").onclick=()=>{safeFly(a.lng,a.lat);closePanel()};
}
  function placeBid(id,amount){
  // A client with a backgrounded tab must reconcile Swiss auction deadlines
  // before accepting a bid. The server will enforce deadlines in production.
  syncScheduledAuctions(false);
  const c=ensureCity(),a=c.drops.find(x=>String(x.id)===String(id)),now=weekly.now();
  if(!a)return showAuctions();
  if(a.status!=="live"||!a.startsAt||!a.endsAt||now<a.startsAt||now>=a.endsAt)
    return showAuction(id,"Gebote sind nur zwischen dem offiziellen Start und Ende (20:00 Schweizer Zeit) möglich.");
  if(a.seller===USER)return showAuction(id,"Du kannst nicht auf dein eigenes digitales Gebäude bieten.");
  if(!Number.isSafeInteger(amount)||amount<bidFloor(a)||amount%STEP!==0)
    return showAuction(id,`Mindestgebot ${money(bidFloor(a))} in Schritten von CHF ${STEP}.`);
  const previous=highest(a)?.user===USER?highest(a).amount:0;
  if(amount>freeBalance()+previous)return showAuction(id,"Dein verfügbares Demo-Guthaben reicht für dieses Gebot nicht aus.");
  a.bids.push({user:USER,amount,at:new Date(now).toISOString()});
  save();updateHeader();renderUpcomingWidget();
  showAuction(id,`Gebot ${money(amount)} gespeichert. Der Betrag ist bis Auktionsende reserviert (${weekly.format(a.endsAt)}).`);
}
  function finishAuction(id){
  if(!game.adminPreview)return showAdmin("Nur die Demo-Administration darf den Abschluss prüfen.");
  const c=ensureCity(),a=c.drops.find(x=>String(x.id)===String(id));
  if(!a)return showAdmin("Auktionsobjekt nicht gefunden.");
  if(!a.endsAt||weekly.now()<a.endsAt)
    return showAdmin(`Der Zuschlag erfolgt erst am vorgesehenen Ende: ${a.endsAt?weekly.format(a.endsAt):"noch nicht terminiert"}.`);
  const result=settleAuction(c,a,weekly.now());
  if(result){save();syncMap();}
  showAuction(id,result?"Die digitale Auktion ist abgeschlossen.":"Der Auktionsstatus ist bereits aktualisiert.");
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
function showCardCheckout(amount,flash=""){
  if(!Number.isSafeInteger(amount)||amount<10||amount>5000||amount%10!==0)return showWallet("Bitte einen Betrag zwischen CHF 10 und CHF 5'000 in Schritten von CHF 10 auswählen.");
  activate("portfolio");
  openPanel(`<div class="eyebrow">TEST-CHECKOUT · KEINE ECHTE KREDITKARTENZAHLUNG</div><h2>💳 Simulierte Kartenzahlung</h2>
    ${flash?`<div class="fc-flash">${esc(flash)}</div>`:""}
    <div class="card"><div class="previewrow"><span>Testbetrag</span><b>${money(amount)}</b></div>
      <div class="previewrow"><span>Demo-Zahlungsart</span><b>Spiel-Kreditkarte · TEST</b></div>
      <div class="note">Keine echte Kreditkarte erforderlich. Bitte keine Kartendaten eingeben. Es wird kein Geld abgebucht.</div></div>
    <button class="action" id="confirmTestCard">TESTZAHLUNG BESTÄTIGEN · ${money(amount)}</button>
    <button class="action secondary" id="cancelTestCard">ABBRECHEN</button>${disclaimer()}`);
  $("confirmTestCard").onclick=()=>{
    game.wallets[USER]=balance()+amount;
    game.transactions.push({type:"simulated-card-payment",amount,title:"Simulierte Kreditkartenzahlung",at:new Date().toISOString()});
    save();updateHeader();showWallet(`${money(amount)} durch simulierte Kartenzahlung gutgeschrieben. Es wurde kein echtes Geld abgebucht.`);
  };
  $("cancelTestCard").onclick=showWallet;
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
      <label class="eyebrow" for="testCardAmount">TESTBETRAG IN CHF</label><input class="fc-input" id="testCardAmount" type="number" min="10" max="5000" step="10" value="100">
      <button class="action secondary" id="startTestCard">KREDITKARTE SIMULIEREN →</button></div>
      <button class="action secondary" id="returnAccount">ZURÜCK ZU MEINEM KONTO</button>${disclaimer()}`);
    panel.querySelectorAll("[data-topup]").forEach(b=>b.onclick=()=>{
      const amount=int(b.dataset.topup);
      game.wallets[USER]=balance()+amount;
      game.transactions.push({type:"demo-credit",amount,title:"Testguthaben",at:new Date().toISOString()});
      save();updateHeader();showWallet(`${money(amount)} Testguthaben gutgeschrieben. Keine echte Zahlung.`);
    });
    const card=$("startTestCard");if(card)card.onclick=()=>showCardCheckout(Number($("testCardAmount").value));
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
      <div class="card"><strong>Preisideen für Stadt-Champions</strong><div class="note">Die Bestenliste belohnt Gameplay: Rekordzuschlag, gute Verkäufe und Sammlungserfolge. Es zählen digitale Spiel-Auktionen und Sammlererfolge.</div></div>${disclaimer()}`);
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
function proposeBuilding(obj){
  const c=ensureCity();
  const lng=Number(obj.lon??obj.lng),lat=Number(obj.lat);
  if(!Number.isFinite(lng)||!Number.isFinite(lat)||Math.abs(lng)>180||Math.abs(lat)>90)return {ok:false,message:"Gebäudestandort ungültig."};
  const key=obj.egid?`egid-${String(obj.egid).replace(/[^a-z0-9-]/gi,"")}`:`coord-${lng.toFixed(5)}-${lat.toFixed(5)}`;
  if(c.requests.some(r=>r.key===key)||c.drops.some(d=>String(d.requestKey)===key))return {ok:false,message:"Dieser Standort ist bereits für einen digitalen City Drop vorgemerkt."};
  const address=String(obj.address||"Kartenstandort noch ohne Adresse").slice(0,240);
  const units=Number.isSafeInteger(Number(obj.units))&&Number(obj.units)>0?int(obj.units):null;
  c.requests.push({key,name:address,address,lng,lat,units,egid:obj.egid||null,official:Boolean(obj.official),createdAt:new Date().toISOString(),by:USER});
  save();
  return {ok:true,message:"Digitaler Auktionsvorschlag vorgemerkt. Nur Admins können ihn freigeben."};
}
  function requestCards(c){
  return `<div class="card"><strong>Karten-Anfragen (${c.requests.length})</strong>
    <p class="note">Spieler können reale Kartenstandorte vorschlagen. Diese Demo prüft Berechtigungen und Adressen nicht automatisch. Zur Veröffentlichung müssen reale Gebäudeidentität und Spielregeln geprüft werden.</p>
    ${c.requests.map(r=>`<div class="owned-row">
      <span><strong>${esc(r.name)}</strong><div class="rankmeta">${r.units??"?"} Wohneinheiten · ${r.official?"GWR-Treffer (Demo)":"Adresse noch zu prüfen"}</div></span>
      <button class="fc-small" data-approve="${esc(r.key)}">ÜBERNEHMEN</button>
    </div>`).join("")||'<p class="note">Derzeit keine offenen Anfragen.</p>'}</div>`;
}
  function approveRequest(key){
  if(!game.adminPreview)return showAdmin("Nur der Demo-Admin kann Objekte übernehmen.");
  const c=ensureCity(),req=c.requests.find(r=>r.key===key);
  if(!req)return showAdmin("Vorschlag nicht gefunden.");
  if(c.drops.some(a=>a.requestKey===key))return showAdmin("Objekt ist bereits vorgemerkt.");
  const id=`proposal-${req.key}`;
  c.drops.push({id,requestKey:key,name:req.name,address:req.address,lng:req.lng,lat:req.lat,
    units:req.units,sizeM2:null,startingBid:startPrice(req.units||4),status:"planned",
    startedWeek:null,bids:[],seller:null,propertyId:null,date:"Nach Admin-Freigabe",
    verified:req.official});
  c.requests=c.requests.filter(r=>r.key!==key);
  save();syncMap();showAdmin("Standort als digitaler City Drop vorgemerkt. Vor echter Freigabe Adresse und Gebäudedaten kontrollieren.");
}
  function adminSlotOptions(c,s,now){
  const selected=auctionBySlot(c,s);
  const busy=new Set();
  Object.values(c.weeklySchedules).forEach(arr=>arr.forEach(other=>{
    if(other!==s&&other.auctionId&&other.endsAt>now)busy.add(String(other.auctionId));
  }));
  const possible=c.drops.filter(a=>String(a.id)===String(selected?.id)||eligibleDrop(c,a,busy));
  const unique=[...new Map(possible.map(a=>[String(a.id),a])).values()]
    .sort((a,b)=>a.name.localeCompare(b.name,"de-CH"));
  return `<option value="" ${!selected?"selected":""}>— Noch kein Gebäude freigeben —</option>
    ${unique.map(a=>`<option value="${esc(a.id)}" ${String(selected?.id)===String(a.id)?"selected":""}>${esc(a.name)} · ab ${money(a.startingBid)}</option>`).join("")}`;
}
  function showAdmin(flash=""){
  activate("admin");
  const c=ensureCity(),now=weekly.now(),week=weekly.weekKey(now);
  const current=ensureWeekSchedule(c,week,now);
  const targetWeek=current.every(s=>s.startsAt<=now)?weekly.nextWeek(week):week;
  const editSlots=ensureWeekSchedule(c,targetWeek,now);
  openPanel(`<div class="eyebrow">FINCITY ADMINISTRATION · STADTAUKTIONEN</div><h2>City Drops · ${esc(city().name)}</h2>
    ${flash?`<div class="fc-flash" role="status">${esc(flash)}</div>`:""}
    <div class="card"><strong>Administrator-Demo</strong>
      <p class="note">Nur freigegebene digitale Gebäude werden in der <b>wöchentlichen</b> Auktionsfolge angeboten. Start und Ende sind fix um 20:00 Uhr (Europe/Zurich). Der Admin wählt vor dem Start das Gebäude. Diese Browser-Vorschau ist keine sichere Benutzerberechtigung.</p>
      <button class="action ${game.adminPreview?"secondary":""}" id="toggleAdmin">${game.adminPreview?"DEMO-ADMIN-MODUS VERLASSEN":"DEMO-ADMIN-MODUS AKTIVIEREN"}</button></div>
    <div class="grid2"><div class="metric"><span>WOCHENFENSTER JE STADT</span><strong>3</strong></div>
      <div class="metric"><span>AKTIVE DEMO-SPIELER</span><strong>${c.userCount}</strong></div></div>
    <div class="card fc-next-section"><strong>Aktuelle Woche · ${esc(weekly.formatDay(current[0].startsAt))}</strong>
      <p class="note">Montag → Freitag · Dienstag → Samstag · Mittwoch → Sonntag · jeweils 20:00 Uhr</p>
      <div class="fc-schedule-list">${current.map(s=>slotHtml(c,s,true)).join("")}</div></div>
    ${game.adminPreview?`
      <div class="card fc-admin-calendar">
        <div class="fc-section-heading"><strong>Gebäude für ${esc(weekly.formatDay(editSlots[0].startsAt))} auswählen</strong><span>ADMIN</span></div>
        <p class="note">Eine zufällige Vorauswahl wird pro Stadt und Woche gespeichert. Du kannst die noch nicht gestarteten Auktionslose ändern. Bereits gestartete Zeitfenster bleiben gesperrt.</p>
        ${editSlots.map(s=>{
          const locked=now>=s.startsAt,a=auctionBySlot(c,s);
          return `<div class="fc-admin-slot">
            <div class="fc-admin-slot-header"><b>${esc(weekly.hoursText(s))}</b><span>${locked?"🔒 Bereits gestartet / vergangen":"Freigabe möglich"}</span></div>
            <small>Start ${esc(weekly.format(s.startsAt))} · Ende ${esc(weekly.format(s.endsAt))}</small>
            ${locked?`<strong>${a?esc(a.name):"Kein Gebäude ausgewählt"}</strong>`:
              `<label class="eyebrow" for="adminSlot${s.index}">DIGITALES GEBÄUDE</label>
              <select class="fc-input" id="adminSlot${s.index}" data-admin-slot="${s.index}" data-week="${esc(targetWeek)}">
                ${adminSlotOptions(c,s,now)}
              </select>`}
          </div>`;
        }).join("")}
        <button class="action secondary" id="shuffleUpcoming">🎲 NOCH OFFENE OBJEKTE NEU MISCHEN</button>
      </div>
      <div class="card"><strong>Weitere freigegebene Gebäude (Warteliste)</strong>
        ${c.drops.filter(a=>(a.status==="planned"||a.status==="expired")&&!a.scheduledWeek)
          .map(a=>`<div class="owned-row"><span><strong>${esc(a.name)}</strong><div class="rankmeta">${esc(a.address)} · Startpreis ${money(a.startingBid)}</div></span><b>✓</b></div>`)
          .join("")||'<p class="note">Alle derzeit freigegebenen Gebäude wurden eingeplant. Neue Standorte können über die Karte vorgeschlagen werden.</p>'}</div>
      <div class="card"><strong>Spielerzahl simulieren</strong>
        <p class="note">In dieser Demo bleiben es drei feste Auktionen je Stadt und Woche. Später können Spielerzahl und Nachfrage zusätzliche Freigaben beeinflussen.</p>
        <label class="eyebrow" for="activeUsers">AKTIVE SPIELER IN DIESER STADT (DEMO)</label>
        <input class="fc-input" id="activeUsers" type="number" min="1" max="100000" value="${c.userCount}">
        <button class="action secondary" id="applyUsers">SPIELERZAHL SPEICHERN</button></div>
      ${requestCards(c)}`:""}
    <button class="action secondary" id="backAuctions">ZUR AUKTIONSLISTE</button>
    ${disclaimer()}`);
  $("toggleAdmin").onclick=()=>{game.adminPreview=!game.adminPreview;save();showAdmin()};
  if(game.adminPreview){
    const users=$("applyUsers");
    if(users)users.onclick=()=>{
      const n=Number($("activeUsers").value);
      if(!Number.isSafeInteger(n)||n<1||n>100000)return showAdmin("Bitte 1 bis 100'000 Demo-Spieler angeben.");
      c.userCount=n;save();showAdmin("Spielerzahl gespeichert. Drei Auktionsfenster pro Woche bleiben aktiv.");
    };
    panel.querySelectorAll("[data-admin-slot]").forEach(el=>el.onchange=()=>{
      adminSelectSlot(Number(el.dataset.adminSlot),el.value,el.dataset.week);
    });
    const shuffle=$("shuffleUpcoming");if(shuffle)shuffle.onclick=()=>adminShuffle(targetWeek);
    panel.querySelectorAll("[data-approve]").forEach(btn=>btn.onclick=()=>approveRequest(btn.dataset.approve));
  }
  bindUpcoming(panel);
  $("backAuctions").onclick=showAuctions;
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
  window.finCityProposeBuilding=proposeBuilding;
  const previousSwitch=window.switchCity;
  window.switchCity=function(slug,overview=false){
    if(typeof previousSwitch==="function")previousSwitch(slug,false);
    ensureCity();
    syncScheduledAuctions(false);
    syncMap();
    if(overview)setTimeout(showCity,145);
  };
  initNavigation();
  ensureCity();
  syncScheduledAuctions(false);
  syncMap();
  // Display the three upcoming city slots on first load, including small-screen devices.
  showCity();
  save();
  // Local preview: automatic clock transitions run only while an app/browser is open.
  // Production needs server-side scheduling and transactions.
  setInterval(()=>syncScheduledAuctions(true),15000);
  document.addEventListener("visibilitychange",()=>{
    if(!document.hidden)syncScheduledAuctions(true);
  });
})();